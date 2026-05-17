// Annual Report — palm_longlist 기반 (Claude generated + NotebookLM verified)
import { state, kpiHTML, fmtInt, fmtHa, fmtNum, plot, makeTable } from "../data.js";

export function renderAnnual(root) {
  const ar = state.ar;
  if (!ar.companies || ar.companies.length === 0) {
    root.innerHTML = `<div class="card"><b>Annual Report 데이터 없음</b><p>data/json/ar/ 폴더에 companies.json 등이 있어야 합니다.</p></div>`;
    return;
  }

  const years = [...new Set(ar.financials.map(f => f.report_year))].sort();
  const companies = ar.companies.map(c => c.company);

  root.innerHTML = `
    <h2>📊 Annual Report (IDX 상장 ${ar.companies.length}개사)</h2>
    <p class="notice">출처: palm_longlist (Claude generated + NotebookLM verified) · IDR 십억 단위</p>

    <div class="filter-bar">
      <label>회사:</label>
      <select id="ar-company">
        <option value="__ALL__">전체</option>
        ${companies.map(c => `<option value="${c}">${c}</option>`).join("")}
      </select>
      <label>연도:</label>
      <select id="ar-year">${years.map(y => `<option value="${y}" ${y === 2024 ? 'selected' : ''}>${y}</option>`).join("")}</select>
      <span class="badge" id="ar-count">${ar.companies.length}개</span>
    </div>

    <div class="kpis" id="ar-kpis"></div>

    <div class="grid-2">
      <div class="card"><h3>매출/순이익 (IDR 십억) — 연도별</h3><div id="ar-rev" class="plot"></div></div>
      <div class="card"><h3>OER (CPO Yield %) — 운영 효율</h3><div id="ar-oer" class="plot"></div></div>
    </div>

    <div class="grid-2">
      <div class="card"><h3>식재 면적 vs CPO 생산</h3><div id="ar-area-prod" class="plot"></div></div>
      <div class="card"><h3>주별 plantation 분포</h3><div id="ar-region" class="plot"></div></div>
    </div>

    <div class="card">
      <h3>회사 detail 표</h3>
      <div id="ar-table"></div>
    </div>

    <div class="card">
      <h3>Asset list (Mill / Refinery)</h3>
      <div id="ar-assets-table"></div>
    </div>
  `;

  function rerender() {
    const sel = document.getElementById("ar-company").value;
    const year = +document.getElementById("ar-year").value;
    const fSel = sel === "__ALL__" ? null : sel;

    const fin = ar.financials.filter(f => (!fSel || f.company === fSel) && f.report_year === year);
    const ops = ar.operations.filter(o => (!fSel || o.company === fSel) && o.report_year === year);
    const reg = ar.regions.filter(r => (!fSel || r.company === fSel) && r.report_year === year);
    const ast = ar.assets.filter(a => (!fSel || a.company === fSel) && a.report_year === year);

    const revSum = fin.reduce((s, f) => s + (f.revenue_idr_bn || 0), 0);
    const profitSum = fin.reduce((s, f) => s + (f.net_profit_idr_bn || 0), 0);
    const areaSum = ops.reduce((s, o) => s + (o.planted_area_total_ha || 0), 0);
    const cpoSum = ops.reduce((s, o) => s + (o.cpo_production_t || 0), 0);
    const oerAvg = ops.length ? ops.reduce((s, o) => s + (o.oer_pct || 0), 0) / ops.length : 0;

    document.getElementById("ar-kpis").innerHTML =
      kpiHTML("매출 합계", `${fmtInt(revSum)} bn IDR`, `${fin.length} 회사`, "blue") +
      kpiHTML("순이익 합계", `${fmtInt(profitSum)} bn IDR`, `margin ${revSum ? (profitSum/revSum*100).toFixed(1) : 0}%`, profitSum < 0 ? "error" : "") +
      kpiHTML("식재 면적", fmtHa(areaSum), `${ops.length} 회사`) +
      kpiHTML("CPO 생산", `${fmtInt(cpoSum)} ton`, `OER ${oerAvg.toFixed(1)}%`, "warn") +
      kpiHTML("주(region)", `${[...new Set(reg.map(r => r.region))].length}`, "총 plantation", "blue") +
      kpiHTML("Mill/Refinery 수", `${ast.reduce((s, a) => s + (a.asset_count || 0), 0)}`, `${ast.length} 종류`);

    // 연도별 매출 (선택 회사 또는 전체 평균)
    const yearGroup = {};
    ar.financials.filter(f => !fSel || f.company === fSel).forEach(f => {
      yearGroup[f.report_year] = yearGroup[f.report_year] || { rev: 0, np: 0 };
      yearGroup[f.report_year].rev += f.revenue_idr_bn || 0;
      yearGroup[f.report_year].np += f.net_profit_idr_bn || 0;
    });
    const yearsAll = Object.keys(yearGroup).sort();
    plot("ar-rev", [
      { x: yearsAll, y: yearsAll.map(y => yearGroup[y].rev), type: "bar", name: "Revenue", marker: { color: "#2ca02c" } },
      { x: yearsAll, y: yearsAll.map(y => yearGroup[y].np), type: "scatter", mode: "lines+markers", name: "Net Profit", line: { color: "#d62728", width: 3 }, yaxis: "y2" },
    ], {
      yaxis: { title: "Revenue (IDR bn)" },
      yaxis2: { title: "Net Profit (IDR bn)", overlaying: "y", side: "right" },
      legend: { orientation: "h", y: -0.2 },
    });

    // OER 분포
    const oerData = ar.operations.filter(o => !fSel || o.company === fSel)
      .filter(o => o.oer_pct).map(o => o.oer_pct);
    plot("ar-oer", [{ x: oerData, type: "histogram", nbinsx: 20, marker: { color: "#1f77b4" } }],
      { xaxis: { title: "OER %" }, yaxis: { title: "회사 수" } });

    // area vs cpo scatter
    plot("ar-area-prod", [{
      x: ops.map(o => o.planted_area_total_ha),
      y: ops.map(o => o.cpo_production_t),
      mode: "markers", type: "scatter",
      text: ops.map(o => o.company),
      marker: { size: 10, color: "#2ca02c", opacity: 0.7 },
    }], { xaxis: { title: "Planted area (ha)" }, yaxis: { title: "CPO production (ton)" } });

    // region bar
    const regGroup = {};
    reg.forEach(r => { regGroup[r.region] = (regGroup[r.region] || 0) + (r.area_ha || 0); });
    const regSorted = Object.entries(regGroup).sort((a, b) => b[1] - a[1]);
    plot("ar-region", [{
      x: regSorted.map(r => r[1]), y: regSorted.map(r => r[0]),
      type: "bar", orientation: "h", marker: { color: "#8B4513" },
    }], { yaxis: { autorange: "reversed" }, xaxis: { title: "Area (ha)" } });

    // table 재생성
    const rows = ar.companies.map(c => {
      const f = fin.find(x => x.company === c.company);
      const o = ops.find(x => x.company === c.company);
      return {
        회사: c.company, ticker: c.ticker, HQ: c.hq,
        revenue: f?.revenue_idr_bn || 0, net_profit: f?.net_profit_idr_bn || 0,
        planted: o?.planted_area_total_ha || 0, cpo: o?.cpo_production_t || 0,
        mills: o?.mills_count || 0,
      };
    }).filter(r => !fSel || r.회사 === fSel);
    makeTable("ar-table", [
      { data: "회사", title: "회사" }, { data: "ticker", title: "Ticker" },
      { data: "HQ", title: "HQ" },
      { data: "revenue", title: "매출 (bn IDR)", render: (d) => Number(d).toLocaleString() },
      { data: "net_profit", title: "순이익", render: (d) => Number(d).toLocaleString() },
      { data: "planted", title: "Planted (ha)", render: (d) => Number(d).toLocaleString() },
      { data: "cpo", title: "CPO (ton)", render: (d) => Number(d).toLocaleString() },
      { data: "mills", title: "Mills" },
    ], rows, { order: [[3, "desc"]], pageLength: 15 });

    // assets table
    makeTable("ar-assets-table", [
      { data: "company", title: "회사" }, { data: "asset_type", title: "자산 종류" },
      { data: "asset_count", title: "수" },
      { data: "capacity", title: "용량", render: (d) => Number(d || 0).toLocaleString() },
      { data: "capacity_unit", title: "단위" },
    ], ast, { pageLength: 20 });
  }

  document.getElementById("ar-company").addEventListener("change", rerender);
  document.getElementById("ar-year").addEventListener("change", rerender);
  rerender();
}
