// Annual Report — 기존 사이트의 5 sub-section 그대로 복원
// 출처: palm_longlist (Claude generated + NotebookLM verified)
import { state, ALL, listCompanies, listYears } from "../data.js";
import { renderOverview } from "./ar_sub/overview.js";
import { renderFinancials } from "./ar_sub/financials.js";
import { renderMap } from "./ar_sub/map.js";
import { renderAssets } from "./ar_sub/assets.js";
import { renderProduction } from "./ar_sub/production.js";

const SUBS = [
  { id: "ar-overview", label: "Overview", render: renderOverview },
  { id: "ar-financials", label: "Financials", render: renderFinancials },
  { id: "ar-map", label: "Plantation Map", render: renderMap },
  { id: "ar-assets", label: "Asset Detail", render: renderAssets },
  { id: "ar-production", label: "Production", render: renderProduction },
];

export function renderAnnual(root) {
  if (!state.ar.companies || state.ar.companies.length === 0) {
    root.innerHTML = `<div class="card"><b>Annual Report 데이터 없음</b></div>`;
    return;
  }
  const companies = listCompanies();
  const years = listYears();
  const DEFAULT_YEAR = "2026 Q1";

  root.innerHTML = `
    <h2>📊 Annual Report (IDX 상장 ${state.ar.companies.length}개사)</h2>
    <p class="notice">출처: <a href="https://www.idx.co.id/en" target="_blank" rel="noopener">IDX</a> Annual Report (palm_longlist · Claude generated + NotebookLM verified) · IDR 십억 단위 · 5 sub-section</p>

    <div class="filter-bar">
      <label>회사 (Company):</label>
      <select id="company-select">
        <option value="${ALL}">All Companies</option>
        ${companies.map(c => `<option value="${escapeAttr(c)}">${escapeHtml(c)}</option>`).join("")}
      </select>
      <label>연도 (Year):</label>
      <select id="year-select">
        ${years.map(y => `<option value="${y}" ${y === DEFAULT_YEAR ? "selected" : ""}>${y}</option>`).join("")}
      </select>
      <span class="badge">${state.ar.companies.length} 회사</span>
    </div>

    <nav class="sub-tabs" id="ar-sub-tabs">
      ${SUBS.map((s, i) => `<a href="#" data-sub="${s.id}" class="${i===0 ? 'active' : ''}">${s.label}</a>`).join("")}
    </nav>

    <!-- Sub-section: Overview -->
    <section id="ar-overview" class="ar-panel active">
      <h3 style="margin-top:0">Overview</h3>
      <p class="muted-text">Company identity & business profile.</p>
      <div id="overview-cards" class="cards"></div>
      <div id="overview-detail"></div>
    </section>

    <!-- Sub-section: Financials -->
    <section id="ar-financials" class="ar-panel">
      <h3 style="margin-top:0">Financials</h3>
      <p class="muted-text">Yearly revenue / profit and balance sheet structure.</p>
      <div class="charts">
        <div id="chart-revenue-profit" class="chart-card"></div>
        <div id="chart-assets-liab" class="chart-card"></div>
      </div>
    </section>

    <!-- Sub-section: Plantation Map -->
    <section id="ar-map" class="ar-panel">
      <h3 style="margin-top:0">Plantation Map</h3>
      <p class="muted-text">Aggregated planted area by Indonesian region.</p>
      <div class="map-layout">
        <div id="leaflet-map"></div>
        <div id="region-summary" class="region-summary"></div>
      </div>
    </section>

    <!-- Sub-section: Asset Detail -->
    <section id="ar-assets" class="ar-panel">
      <h3 style="margin-top:0">Asset Detail</h3>
      <p class="muted-text"><span id="asset-meta">—</span></p>
      <h4 style="margin: 8px 0 10px; font-size: 13px;">Plantation Asset</h4>
      <div id="asset-table"></div>
      <h4 style="margin: 22px 0 10px; font-size: 13px;">Mill / Refinery Assets</h4>
      <div id="asset-pivot"></div>
    </section>

    <!-- Sub-section: Production -->
    <section id="ar-production" class="ar-panel">
      <h3 style="margin-top:0">Production</h3>
      <p class="muted-text"><span id="production-meta">—</span></p>
      <div id="production-table"></div>
      <h4 style="margin: 22px 0 10px; font-size: 13px;">Sales</h4>
      <div id="sales-table"></div>
    </section>
  `;

  // 초기 상태
  state.selectedCompany = ALL;
  state.selectedYear = years.includes(DEFAULT_YEAR) ? DEFAULT_YEAR : (years[0] || null);
  document.getElementById("year-select").value = state.selectedYear ?? "";

  function renderAllSubs() {
    SUBS.forEach(s => {
      try { s.render(); } catch (e) { console.error(`[${s.id}]`, e); }
    });
  }

  // 필터 변경 → 모든 sub render
  document.getElementById("company-select").addEventListener("change", (e) => {
    state.selectedCompany = e.target.value;
    renderAllSubs();
  });
  document.getElementById("year-select").addEventListener("change", (e) => {
    state.selectedYear = e.target.value;
    renderAllSubs();
  });

  // sub-nav 클릭 → panel 전환 (map은 리사이즈 필요)
  document.querySelectorAll("#ar-sub-tabs a").forEach(a => {
    a.addEventListener("click", (e) => {
      e.preventDefault();
      const sub = a.dataset.sub;
      document.querySelectorAll("#ar-sub-tabs a").forEach(x => x.classList.toggle("active", x.dataset.sub === sub));
      document.querySelectorAll(".ar-panel").forEach(p => p.classList.toggle("active", p.id === sub));
      // Leaflet 지도는 보일 때 invalidate (window resize event 으로 모든 Leaflet 인스턴스 refresh)
      if (sub === "ar-map") {
        setTimeout(() => {
          window.dispatchEvent(new Event("resize"));
          // 기존 map.js 의 Leaflet 인스턴스를 #leaflet-map 에서 찾아 invalidate
          const mapDiv = document.getElementById("leaflet-map");
          if (mapDiv && mapDiv._leaflet_id != null) {
            // try to find Leaflet map by iterating L._maps if available
            for (const k in window) {
              try {
                if (window[k] && window[k]._container === mapDiv && typeof window[k].invalidateSize === "function") {
                  window[k].invalidateSize();
                }
              } catch (e) {}
            }
          }
          // fallback: 직접 re-render
          renderAllSubs();
        }, 150);
      }
    });
  });

  renderAllSubs();
}

function escapeHtml(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function escapeAttr(s) {
  return String(s).replace(/"/g, "&quot;");
}
