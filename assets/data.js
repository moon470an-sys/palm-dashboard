// JSON 로더 — DB→export 결과 + Annual Report 원본
// Annual Report 5 sub-sections 호환: state.companies/financials/operations/regions/assets/regionGeo
// + state.selectedCompany/selectedYear, ALL sentinel, listCompanies/listYears 함수

const BASE = "data/json/";
const AR_BASE = "data/json/ar/";

// Sentinel for "All Companies"
export const ALL = "__ALL__";

// state: 모든 데이터 cache (AR 호환 alias 포함 — 기존 5 sections는 state.companies 등을 직접 사용)
export const state = {
  meta: null,
  ispo: { companies: [], certificates: [], quarterly: [], ls: [] },
  rspo: { members: [], global: [] },
  bdsp: { nasional: [], provinsi: [], kabupaten: [] },
  gapki: [],
  prov_coords: {},
  ar: { companies: [], financials: [], operations: [], regions: [], assets: [], region_geo: [] },
  // AR 호환 alias (loadAll 후 ar.* 와 동일 참조)
  companies: [], financials: [], operations: [], regions: [], assets: [], regionGeo: [],
  selectedCompany: ALL, selectedYear: null,
};

export function listCompanies() {
  return state.companies.map(c => c.company).sort();
}
export function listYears() {
  const yrs = new Set();
  state.financials.forEach(f => yrs.add(String(f.report_year)));
  state.operations.forEach(o => yrs.add(String(o.report_year)));
  return [...yrs].sort();
}

async function j(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url} -> ${r.status}`);
  return r.json();
}

export async function loadAll() {
  const tasks = [
    j(BASE + "meta.json").then((d) => state.meta = d),
    j(BASE + "ispo_companies.json").then((d) => state.ispo.companies = d),
    j(BASE + "ispo_certificates.json").then((d) => state.ispo.certificates = d),
    j(BASE + "ispo_quarterly.json").then((d) => state.ispo.quarterly = d),
    j(BASE + "ispo_ls.json").then((d) => state.ispo.ls = d),
    j(BASE + "rspo_members.json").then((d) => state.rspo.members = d),
    j(BASE + "rspo_global_country.json").then((d) => state.rspo.global = d),
    j(BASE + "bdsp_nasional.json").then((d) => state.bdsp.nasional = d),
    j(BASE + "bdsp_provinsi.json").then((d) => state.bdsp.provinsi = d),
    j(BASE + "bdsp_kabupaten.json").then((d) => state.bdsp.kabupaten = d),
    j(BASE + "gapki_members.json").then((d) => state.gapki = d),
    j(BASE + "province_coords.json").then((d) => state.prov_coords = d),
    // Annual Report (기존 원본)
    j(AR_BASE + "companies.json").then((d) => state.ar.companies = d).catch(() => {}),
    j(AR_BASE + "financials.json").then((d) => state.ar.financials = d).catch(() => {}),
    j(AR_BASE + "operations.json").then((d) => state.ar.operations = d).catch(() => {}),
    j(AR_BASE + "regions.json").then((d) => state.ar.regions = d).catch(() => {}),
    j(AR_BASE + "assets.json").then((d) => state.ar.assets = d).catch(() => {}),
    j(AR_BASE + "region_geo.json").then((d) => state.ar.region_geo = d).catch(() => {}),
  ];
  await Promise.all(tasks);
  // AR alias 채우기 (5 sub-sections는 state.companies 등을 직접 참조)
  state.companies = state.ar.companies;
  state.financials = state.ar.financials;
  state.operations = state.ar.operations;
  state.regions = state.ar.regions;
  state.assets = state.ar.assets;
  state.regionGeo = state.ar.region_geo;
}

// --- 유틸 ---
export const fmtInt = (n) => n == null ? "-" : Number(n).toLocaleString();
export const fmtHa = (n) => n == null ? "-" : Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 }) + " ha";

export function kpiHTML(label, value, delta = "", cls = "") {
  return `<div class="kpi ${cls}">
    <div class="label">${label}</div>
    <div class="value">${value}</div>
    ${delta ? `<div class="delta">${delta}</div>` : ""}
  </div>`;
}

export function makeTable(elId, columns, rows, opts = {}) {
  const $el = document.getElementById(elId);
  $el.innerHTML = `<table class="dt"><thead><tr>${columns.map(c =>
    `<th>${c.title}</th>`).join("")}</tr></thead><tbody></tbody></table>`;
  // datatables
  // eslint-disable-next-line no-undef
  new DataTable(`#${elId} table`, {
    data: rows, columns, pageLength: opts.pageLength || 15,
    order: opts.order || [], scrollX: true,
    language: { search: "검색:", lengthMenu: "_MENU_ 행", info: "_TOTAL_ 행 중 _START_-_END_",
                 paginate: { previous: "◀", next: "▶" }, zeroRecords: "결과 없음" },
  });
}

// Lazy renderer: viewport에 들어올 때만 Plotly 실행. 100+ 차트 페이지에서 초기 로드 시간 대폭 단축.
const _lazyObserver = (typeof IntersectionObserver !== "undefined")
  ? new IntersectionObserver((entries, obs) => {
      entries.forEach(e => {
        if (e.isIntersecting && e.target.__lazyPlot) {
          const fn = e.target.__lazyPlot;
          delete e.target.__lazyPlot;
          obs.unobserve(e.target);
          fn();
        }
      });
    }, { rootMargin: "200px 0px" })  // 200px 전에 미리 렌더
  : null;

// lazyPlot: 임의 draw 함수를 lazy 처리 (Plotly.newPlot 직접 호출하는 코드용)
export function lazyPlot(elId, drawFn, fallbackHeight = 400) {
  const el = document.getElementById(elId);
  if (!el) return;
  if (el.__lazyPlot) { _lazyObserver?.unobserve(el); delete el.__lazyPlot; }
  if (!_lazyObserver) { drawFn(); return; }
  const rect = el.getBoundingClientRect();
  const inView = rect.top < (window.innerHeight + 200) && rect.bottom > -200;
  if (inView) { drawFn(); }
  else {
    if (!el.style.minHeight) el.style.minHeight = fallbackHeight + "px";
    el.__lazyPlot = drawFn;
    _lazyObserver.observe(el);
  }
}

export function plot(elId, traces, layout = {}) {
  lazyPlot(elId, () => {
    // eslint-disable-next-line no-undef
    Plotly.newPlot(elId, traces, {
      margin: { t: 20, b: 40, l: 60, r: 30 }, height: 320,
      font: { size: 11 }, paper_bgcolor: "#fff", plot_bgcolor: "#fff",
      ...layout,
    }, { responsive: true, displayModeBar: false });
  }, layout.height || 320);
}
