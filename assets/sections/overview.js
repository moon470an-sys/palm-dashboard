// 종합 — Annual Report 34사 재무 한눈에 비교.
// IDR bn (10억 루피아) 단위, 기준연도 select 가능.
import { state, kpiHTML, fmtInt, plot, makeTable } from "../data.js";

const fmtBn = (n) => n == null ? "-" : `${Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 })} bn`;
const shortName = (s) => (s || "").replace(/^PT\s+/i, "").replace(/\s+Tbk\.?$/i, "").trim();
const num = (v) => (v == null || v === "" || isNaN(Number(v))) ? null : Number(v);

// core_region 텍스트 → primary region 분류 (가장 먼저 언급된 지역 우선, 다지역이면 Diversified)
const REGION_COLOR = { Sumatra: "#2ca02c", Kalimantan: "#ff7f0e", Java: "#1f77b4", Sulawesi: "#9467bd", Papua: "#d62728", Diversified: "#8c564b", Other: "#7f7f7f" };
function classifyRegion(coreRegion) {
  if (!coreRegion) return "Other";
  const t = coreRegion.toLowerCase();
  const hits = [];
  if (/sumatr|riau|jambi|aceh|lampung|bengkulu|bangka/i.test(coreRegion)) hits.push("Sumatra");
  if (/kalimantan|borneo/i.test(coreRegion)) hits.push("Kalimantan");
  if (/\bjava\b|jakarta|banten|surabaya|cikarang|bogor|mojokerto|west java|east java|central java|subang|pati/i.test(coreRegion)) hits.push("Java");
  if (/sulawesi/i.test(coreRegion)) hits.push("Sulawesi");
  if (/papua/i.test(coreRegion)) hits.push("Papua");
  if (hits.length === 0) return "Other";
  if (hits.length >= 3) return "Diversified";
  if (hits.length === 2 && /diversified|nationwide|multiple/i.test(coreRegion)) return "Diversified";
  return hits[0];
}

const PALETTE = ["#2ca02c","#1f77b4","#ff7f0e","#d62728","#9467bd","#8c564b","#e377c2","#7f7f7f","#bcbd22","#17becf",
                 "#aec7e8","#ffbb78","#98df8a","#ff9896","#c5b0d5","#c49c94","#f7b6d2","#c7c7c7","#dbdb8d","#9edae5",
                 "#1b9e77","#d95f02","#7570b3","#e7298a","#66a61e","#e6ab02","#a6761d","#666666","#fb9a99","#a6cee3",
                 "#b2df8a","#fdbf6f","#cab2d6","#ffff99"];

export function renderOverview(root) {
  // 회사 메타 — companies.json (회사명 → core_region 등)
  const meta = Object.fromEntries((state.ar.companies || []).map(c => [c.company, c]));
  // 회사·연도별 operations lookup
  const opLookup = {};
  (state.ar.operations || []).forEach(o => {
    const k = `${o.company}|${o.report_year}`;
    opLookup[k] = o;
  });
  const fin = (state.ar.financials || []).map(r => {
    const revenue = num(r.revenue_idr_bn);
    const cfo = num(r.cfo_idr_bn);
    const capex = num(r.capex_idr_bn);
    const fcf = num(r.fcf_idr_bn) ?? (cfo != null && capex != null ? cfo - Math.abs(capex) : null);
    const np = num(r.net_profit_idr_bn);
    const ca = num(r.current_assets_idr_bn);
    const cl = num(r.current_liabilities_idr_bn);
    const shares = num(r.shares_outstanding_mn);
    const px = num(r.closing_price_local_per_share);
    const mcapReported = num(r.market_cap_idr_bn);
    // mcap (bn IDR) = shares (mn) * price / 1000
    const mcap = mcapReported ?? (shares != null && px != null ? shares * px / 1000 : null);
    const cMeta = meta[r.company] || {};
    const op = opLookup[`${r.company}|${r.report_year}`] || {};
    const planted = num(op.planted_area_total_ha);
    const cpo = num(op.cpo_production_t);
    const ffb = num(op.ffb_production_t);
    return {
      ...r, company: r.company, short: shortName(r.company),
      hq: cMeta.hq || "", core_region: cMeta.core_region || "", region: classifyRegion(cMeta.core_region),
      business_model: cMeta.business_model || "", primary_business: cMeta.primary_business || "",
      key_red_flags: cMeta.key_red_flags || "", overall_comment: cMeta.overall_comment || "",
      financial_risk_note: r.financial_risk_note || "", liquidity_note: r.liquidity_note || "",
      planted_ha: planted, ffb_t: ffb, cpo_t: cpo,
      area_sumatra: num(op.sumatra_area_ha) || 0, area_kalimantan: num(op.kalimantan_area_ha) || 0,
      area_sulawesi: num(op.sulawesi_area_ha) || 0, area_other: num(op.other_region_area_ha) || 0,
      mills_n: num(op.mills_count), mill_cap_tph: num(op.mill_capacity_tph),
      oer_pct: num(op.oer_reported_pct), cpo_price_kg: num(op.average_cpo_selling_price_local_per_kg),
      rev_per_ha: (revenue && planted) ? revenue * 1e9 / planted : null,  // IDR per ha
      cpo_per_ha: (cpo && planted) ? cpo / planted : null,  // ton/ha CPO
      ffb_per_ha: (ffb && planted) ? ffb / planted : null,
      revenue, net_profit: np,
      gross_profit: num(r.gross_profit_idr_bn), ebit: num(r.ebit_idr_bn),
      ebitda: num(r.ebitda_reported_idr_bn ?? r.ebitda_calculated_idr_bn),
      assets: num(r.total_assets_idr_bn), liab: num(r.total_liabilities_idr_bn),
      equity: num(r.total_equity_idr_bn), debt: num(r.gross_debt_idr_bn),
      net_debt: num(r.net_debt_reported_idr_bn ?? r.net_debt_calculated_idr_bn) ??
                ((num(r.gross_debt_idr_bn) != null && num(r.cash_and_cash_equivalents_idr_bn) != null)
                  ? num(r.gross_debt_idr_bn) - num(r.cash_and_cash_equivalents_idr_bn) : null),
      cash: num(r.cash_and_cash_equivalents_idr_bn),
      cfo, capex: capex != null ? Math.abs(capex) : null, fcf,
      capex_intensity: (capex != null && revenue) ? Math.abs(capex) / revenue * 100 : null,
      cash_conv: (cfo != null && np && np > 0) ? cfo / np * 100 : null,  // CFO/NP %
      fcf_margin: (fcf != null && revenue) ? fcf / revenue * 100 : null,
      fcf_yield: (fcf != null && mcap) ? fcf / mcap * 100 : null,
      mcap, eps: num(r.eps_local_per_share), nav: num(r.nav_per_share_local_per_share),
      dps_final: num(r.final_dps_local_per_share), dps_interim: num(r.interim_dps_local_per_share),
      px,
      pe: (px != null && num(r.eps_local_per_share) > 0) ? px / num(r.eps_local_per_share) : null,
      pb: (px != null && num(r.nav_per_share_local_per_share) > 0) ? px / num(r.nav_per_share_local_per_share) : null,
      earnings_yield: (px != null && num(r.eps_local_per_share) != null) ? num(r.eps_local_per_share) / px * 100 : null,
      div_total: ((num(r.final_dps_local_per_share) || 0) + (num(r.interim_dps_local_per_share) || 0)) || null,
      div_yield: (px != null && ((num(r.final_dps_local_per_share) || 0) + (num(r.interim_dps_local_per_share) || 0)) > 0)
        ? ((num(r.final_dps_local_per_share) || 0) + (num(r.interim_dps_local_per_share) || 0)) / px * 100 : null,
      roe: num(r.roe_reported_pct),
      roa: num(r.roa_reported_pct), net_margin: num(r.net_margin_reported_pct),
      gross_margin: num(r.gross_margin_reported_pct),
      debt_eq: num(r.debt_per_equity_x),
      curr_ratio: num(r.current_ratio_x) ?? ((ca != null && cl) ? ca / cl : null),
      debt_assets: (num(r.gross_debt_idr_bn) != null && num(r.total_assets_idr_bn)) ? num(r.gross_debt_idr_bn) / num(r.total_assets_idr_bn) * 100 : null,
      yr: r.report_year,
    };
  });
  // net_debt/EBITDA leverage + risk_score + DuPont (derive after fin is built)
  fin.forEach(r => {
    r.nd_ebitda = (r.net_debt != null && r.ebitda && r.ebitda > 0) ? r.net_debt / r.ebitda : null;
    // DuPont 3-factor: ROE = Net Margin × Asset Turnover × Equity Multiplier
    r.dp_margin = (r.net_profit != null && r.revenue) ? r.net_profit / r.revenue : null;  // ratio (0.10 = 10%)
    r.dp_turnover = (r.revenue != null && r.assets) ? r.revenue / r.assets : null;  // x
    r.dp_leverage = (r.assets != null && r.equity && r.equity > 0) ? r.assets / r.equity : null;  // x
    r.dp_roe_calc = (r.dp_margin != null && r.dp_turnover != null && r.dp_leverage != null) ? r.dp_margin * r.dp_turnover * r.dp_leverage * 100 : null;  // % (재현된 ROE)
    // Risk Score 0-100 (높을수록 위험)
    let s = 0;
    if (r.net_profit != null && r.net_profit < 0) s += 30;
    if (r.equity != null && r.equity < 0) s += 30;
    if (r.nd_ebitda != null && r.nd_ebitda > 4) s += 25;
    else if (r.nd_ebitda != null && r.nd_ebitda > 2) s += 10;
    if (r.curr_ratio != null && r.curr_ratio < 1) s += 20;
    else if (r.curr_ratio != null && r.curr_ratio < 1.5) s += 10;
    if (r.debt_assets != null && r.debt_assets > 60) s += 15;
    if (r.cfo != null && r.cfo < 0) s += 15;
    // 텍스트 기반 hint (key_red_flags)
    const txt = ((r.key_red_flags || "") + " " + (r.financial_risk_note || "") + " " + (r.liquidity_note || "")).toLowerCase();
    if (/distress|severe|critical|going concern|insolvent/i.test(txt)) s += 25;
    if (/cash burn|negative cfo|liquidity (concern|risk|tight)|tight liquidity/i.test(txt)) s += 15;
    if (/covenant breach|default/i.test(txt)) s += 20;
    r.risk_score = Math.min(100, s);
    r.risk_band = s >= 60 ? "High" : s >= 30 ? "Medium" : "Low";
    // Quality Score 0-100 (5축, 각 0-20)
    const scoreROE = (v) => v == null ? 0 : v >= 20 ? 20 : v >= 15 ? 17 : v >= 10 ? 13 : v >= 5 ? 9 : v >= 0 ? 5 : 0;
    const scoreCash = (v) => v == null ? 0 : v >= 100 ? 20 : v >= 70 ? 16 : v >= 50 ? 12 : v >= 0 ? 6 : 0;
    const scoreBS = (v) => v == null ? 0 : v < 0 ? 20 : v <= 1 ? 18 : v <= 2 ? 15 : v <= 3 ? 11 : v <= 4 ? 7 : v <= 6 ? 4 : 0;
    const scoreYield = (e, d) => Math.min(20, Math.max(0, (e || 0) * 1.5 + (d || 0) * 2)); // earnings + div weighted
    r.q_profit = scoreROE(r.roe);
    r.q_cash = scoreCash(r.cash_conv);
    r.q_bs = scoreBS(r.nd_ebitda);
    r.q_yield = scoreYield(r.earnings_yield, r.div_yield);
    r.q_size = r.revenue ? Math.min(20, Math.log10(r.revenue + 1) * 3) : 0;  // 규모 점수 (log scale)
    r.quality_score = r.q_profit + r.q_cash + r.q_bs + r.q_yield + r.q_size;
    r.quality_band = r.quality_score >= 70 ? "A" : r.quality_score >= 50 ? "B" : r.quality_score >= 30 ? "C" : "D";
    // Geographic HHI (Herfindahl) — 4지역 점유율 제곱합 (1.0 = 단일지역, 0.25 = 균등 4분할)
    const areaTotal = (r.area_sumatra || 0) + (r.area_kalimantan || 0) + (r.area_sulawesi || 0) + (r.area_other || 0);
    if (areaTotal > 0) {
      const shares = [r.area_sumatra, r.area_kalimantan, r.area_sulawesi, r.area_other].map(a => (a || 0) / areaTotal);
      r.geo_hhi = shares.reduce((s, v) => s + v * v, 0);
      r.geo_diversification = 1 - r.geo_hhi;  // 0=완전 집중, 0.75=완전 균등
      r.area_total_reported = areaTotal;
    } else {
      r.geo_hhi = null; r.geo_diversification = null; r.area_total_reported = null;
    }
  });
  const allYears = [...new Set(fin.map(r => r.yr))].sort();
  const annualYears = allYears.filter(y => !/Q\d/i.test(y));
  const ly = annualYears[annualYears.length - 1] || allYears[allYears.length - 1];
  const companies = [...new Set(fin.map(r => r.short))].sort();
  const colorMap = Object.fromEntries(companies.map((c, i) => [c, PALETTE[i % PALETTE.length]]));

  root.innerHTML = `
    <h2>🏠 종합 — Annual Report ${companies.length}사 재무 비교</h2>
    <p class="notice">
      출처: IDX 상장 팜 회사 ${companies.length}사 · ${fin.length} 보고기간 row
      · 기간 ${allYears[0]}–${allYears[allYears.length-1]}
      · 단위 IDR bn (10억 루피아)
    </p>

    <div class="filter-bar">
      <label>비교 기준연도:</label>
      <select id="ov-year">
        ${annualYears.map(y => `<option value="${y}" ${y === ly ? "selected" : ""}>${y}</option>`).join("")}
      </select>
      <label>지표 (정렬·랭킹용):</label>
      <select id="ov-metric">
        <option value="revenue" selected>매출 (Revenue)</option>
        <option value="net_profit">순이익 (Net profit)</option>
        <option value="ebitda">EBITDA</option>
        <option value="assets">총자산 (Assets)</option>
        <option value="equity">자기자본 (Equity)</option>
        <option value="mcap">시가총액 (Market cap)</option>
        <option value="debt">총부채 (Debt)</option>
      </select>
      <span class="badge" id="ov-badge"></span>
    </div>

    <div class="kpis" id="ov-kpis"></div>

    <h3 class="section-h">① 회사별 랭킹 — 기준연도 (지표 select)</h3>
    <div class="card"><h3>전체 회사 막대 (정렬)</h3><div id="ov-rank" class="plot plot-tall"></div></div>

    <h3 class="section-h">② 시계열 — 모든 회사 한 차트</h3>
    <div class="grid-2">
      <div class="card"><h3>매출 시계열 (전사)</h3><div id="ov-rev-ts" class="plot plot-tall"></div></div>
      <div class="card"><h3>순이익 시계열 (전사)</h3><div id="ov-np-ts" class="plot plot-tall"></div></div>
    </div>

    <h3 class="section-h">③ 수익성 매트릭스 — 기준연도</h3>
    <div class="grid-2">
      <div class="card"><h3>Bubble: 매출 × 순이익률 (크기=자산)</h3><div id="ov-bubble" class="plot plot-tall"></div></div>
      <div class="card"><h3>ROE vs ROA</h3><div id="ov-roe-roa" class="plot plot-tall"></div></div>
    </div>

    <h3 class="section-h">④ 자본 구조 & 효율성</h3>
    <div class="grid-2">
      <div class="card"><h3>Debt/Equity × 순이익률 (레버리지 vs 수익성)</h3><div id="ov-lev" class="plot plot-tall"></div></div>
      <div class="card"><h3>마진 비교 (Gross / Net) — 회사별</h3><div id="ov-margin" class="plot plot-tall"></div></div>
    </div>

    <h3 class="section-h">⑤ 산업 위계 — Treemap</h3>
    <div class="grid-2">
      <div class="card"><h3>총자산 Treemap (전사)</h3><div id="ov-tree-asset" class="plot plot-tall"></div></div>
      <div class="card"><h3>시가총액 Treemap (전사 · 누락 회사 제외)</h3><div id="ov-tree-mcap" class="plot plot-tall"></div></div>
    </div>

    <h3 class="section-h">⑥ Cash Flow & 효율성 (CFO · CapEx · FCF)</h3>
    <div class="grid-2">
      <div class="card"><h3>CFO vs CapEx — 회사별 (기준연도)</h3><div id="ov-cfocapex" class="plot plot-tall"></div></div>
      <div class="card"><h3>FCF (= CFO − CapEx) 랭킹</h3><div id="ov-fcf-rank" class="plot plot-tall"></div></div>
    </div>
    <div class="grid-2">
      <div class="card"><h3>CapEx Intensity (CapEx/매출 %) — 투자 강도</h3><div id="ov-capex-int" class="plot plot-tall"></div></div>
      <div class="card"><h3>Cash Conversion (CFO/Net Profit %) — 이익 → 현금 전환</h3><div id="ov-cash-conv" class="plot plot-tall"></div></div>
    </div>
    <div class="card"><h3>FCF Margin × FCF Yield scatter (회사별 · 기준연도)</h3><div id="ov-fcf-scatter" class="plot plot-tall"></div></div>

    <h3 class="section-h">⑦ Valuation Multiples (P/E · P/B · Dividend Yield)</h3>
    <div class="grid-2">
      <div class="card"><h3>P/E ratio (price / EPS, 흑자 회사만)</h3><div id="ov-pe" class="plot plot-tall"></div></div>
      <div class="card"><h3>P/B ratio (price / NAV per share)</h3><div id="ov-pb" class="plot plot-tall"></div></div>
    </div>
    <div class="grid-2">
      <div class="card"><h3>Dividend Yield % (interim + final DPS / price)</h3><div id="ov-divy" class="plot plot-tall"></div></div>
      <div class="card"><h3>Earnings Yield % (1/PE) — 가치 점수</h3><div id="ov-eyld" class="plot plot-tall"></div></div>
    </div>
    <div class="card"><h3>P/E × ROE — Value vs Quality 매트릭스</h3><div id="ov-pe-roe" class="plot plot-tall"></div></div>

    <h3 class="section-h">⑧ 권역(Region) 분석 — Sumatra · Kalimantan · Java · Sulawesi · Papua · Diversified</h3>
    <div class="grid-2">
      <div class="card"><h3>권역별 회사 수 + 매출 합 (기준연도)</h3><div id="ov-region-bar" class="plot plot-tall"></div></div>
      <div class="card"><h3>권역별 평균 ROE & 순이익률 (효율성)</h3><div id="ov-region-eff" class="plot plot-tall"></div></div>
    </div>
    <div class="card"><h3>권역별 매출 시계열 (stacked area)</h3><div id="ov-region-ts" class="plot plot-tall"></div></div>
    <div class="card"><h3>회사 → 권역 → 매출 Treemap (기준연도)</h3><div id="ov-region-tree" class="plot plot-tall"></div></div>

    <h3 class="section-h">⑨ 성장률 (Growth) — YoY 매출·순이익 변화</h3>
    <div class="filter-bar">
      <label>비교 기간:</label>
      <select id="ov-growth-pair"></select>
      <span class="badge">YoY = (current − prior) / prior</span>
    </div>
    <div class="grid-2">
      <div class="card"><h3>매출 YoY 성장률 (%)</h3><div id="ov-grow-rev" class="plot plot-tall"></div></div>
      <div class="card"><h3>순이익 YoY 성장률 (%) — Turnaround 포함</h3><div id="ov-grow-np" class="plot plot-tall"></div></div>
    </div>
    <div class="card"><h3>Growth × Margin 매트릭스 (성장 vs 수익성, 크기=매출, 색=권역)</h3><div id="ov-grow-margin" class="plot plot-tall"></div></div>

    <h3 class="section-h">⑩ Balance Sheet 깊이 — 유동성 · 레버리지 · 부채/자산</h3>
    <div class="grid-2">
      <div class="card"><h3>Current Ratio (유동자산/유동부채) — 단기 유동성</h3><div id="ov-curr" class="plot plot-tall"></div></div>
      <div class="card"><h3>Debt / Total Assets (%)</h3><div id="ov-debt-assets" class="plot plot-tall"></div></div>
    </div>
    <div class="grid-2">
      <div class="card"><h3>Net Debt / EBITDA (x) — 레버리지 (낮을수록 안전)</h3><div id="ov-nd-eb" class="plot plot-tall"></div></div>
      <div class="card"><h3>자본 구조 — Equity vs Liabilities (회사별 stacked)</h3><div id="ov-capstack" class="plot plot-tall"></div></div>
    </div>

    <h3 class="section-h">⑪ Per-Share & 주가 시계열 — EPS · NAV · DPS · 종가</h3>
    <div class="filter-bar">
      <label>주당 지표:</label>
      <select id="ov-ps-metric">
        <option value="eps" selected>EPS (주당순이익)</option>
        <option value="nav">NAV (주당순자산)</option>
        <option value="div_total">DPS Total (interim + final)</option>
        <option value="px">종가 (Closing price)</option>
      </select>
      <span class="badge">단위: IDR/share</span>
    </div>
    <div class="card"><h3>전사 주당 지표 multi-line 시계열</h3><div id="ov-ps-ts" class="plot plot-tall"></div></div>
    <div class="grid-2">
      <div class="card"><h3>EPS 시계열 — Top 10 (기준연도 EPS 상위)</h3><div id="ov-eps-top" class="plot plot-tall"></div></div>
      <div class="card"><h3>DPS 지급 회사 (기준연도, 0 제외)</h3><div id="ov-dps" class="plot plot-tall"></div></div>
    </div>

    <h3 class="section-h">⑫ Risk & Red Flags — 자동 점수 + 메타 노트</h3>
    <div class="grid-2">
      <div class="card"><h3>Risk Score 0–100 (재무 지표 + 텍스트 hint 합산)</h3><div id="ov-risk-bar" class="plot plot-tall"></div></div>
      <div class="card"><h3>Risk × 매출 scatter (위험·규모 매트릭스)</h3><div id="ov-risk-scatter" class="plot plot-tall"></div></div>
    </div>
    <div class="card">
      <h3>회사별 Red Flags 카드 (key_red_flags + 재무 risk note) — 검색·정렬</h3>
      <div id="ov-risk-table"></div>
    </div>

    <h3 class="section-h">⑬ Operations — Planted ha · CPO · Revenue/ha (실물 운영)</h3>
    <div class="grid-2">
      <div class="card"><h3>Planted Area (ha) 랭킹 — 회사 규모 실물 지표</h3><div id="ov-planted" class="plot plot-tall"></div></div>
      <div class="card"><h3>CPO Production (ton) 랭킹</h3><div id="ov-cpo-prod" class="plot plot-tall"></div></div>
    </div>
    <div class="grid-2">
      <div class="card"><h3>Revenue / Planted ha (IDR/ha) — 토지당 매출 효율</h3><div id="ov-rev-ha" class="plot plot-tall"></div></div>
      <div class="card"><h3>CPO Yield (ton/ha) — 단위 면적당 CPO 생산성</h3><div id="ov-cpo-yield" class="plot plot-tall"></div></div>
    </div>
    <div class="card"><h3>Mills × Capacity scatter (회사별 mill 수 × 처리 능력 tph)</h3><div id="ov-mills" class="plot plot-tall"></div></div>

    <h3 class="section-h">⑭ Composite Quality Score — 5축 종합 평가</h3>
    <p class="notice">
      5축: ①Profitability(ROE) ②Cash Generation(CFO/NP) ③Balance Sheet(ND/EBITDA) ④Shareholder Yield(Earnings+Div) ⑤Size(log Revenue) — 각 0-20점, 총 0-100
    </p>
    <div class="grid-2">
      <div class="card"><h3>Quality Score 0–100 (A/B/C/D 등급)</h3><div id="ov-quality-bar" class="plot plot-tall"></div></div>
      <div class="card"><h3>Quality × Risk 4분면 (이상=고품질·저위험)</h3><div id="ov-qr-quad" class="plot plot-tall"></div></div>
    </div>
    <div class="card"><h3>Top 8 회사 Radar — 5축 동시 비교</h3><div id="ov-radar" class="plot plot-tall"></div></div>

    <h3 class="section-h">⑮ Peer Comparison — 회사 select × peer 중앙값 비교</h3>
    <div class="filter-bar">
      <label>대상 회사:</label>
      <select id="ov-peer-co"></select>
      <label>비교 기준:</label>
      <select id="ov-peer-base">
        <option value="region" selected>같은 권역 peer</option>
        <option value="all">전체 peer (34사)</option>
      </select>
      <span class="badge" id="ov-peer-info"></span>
    </div>
    <div class="card"><h3>지표별 회사 값 vs Peer 중앙값 (% 차이)</h3><div id="ov-peer-delta" class="plot plot-tall"></div></div>
    <div class="card"><h3>지표별 절대값 비교 (회사 vs peer 중앙값 vs peer Top quartile)</h3><div id="ov-peer-abs" class="plot plot-tall"></div></div>

    <h3 class="section-h">⑯ DuPont 분해 — ROE = 마진 × 자산회전 × 레버리지</h3>
    <p class="notice">
      DuPont: ROE = (Net Profit / Revenue) × (Revenue / Assets) × (Assets / Equity)
      = 순이익률 × 자산회전율 × 자본승수. 같은 ROE라도 분해 패턴이 다르면 비즈니스 성격이 다름.
    </p>
    <div class="grid-3">
      <div class="card"><h3>① Net Margin (NP/Rev %)</h3><div id="ov-dp-margin" class="plot"></div></div>
      <div class="card"><h3>② Asset Turnover (Rev/Assets x)</h3><div id="ov-dp-turn" class="plot"></div></div>
      <div class="card"><h3>③ Equity Multiplier (Assets/Eq x)</h3><div id="ov-dp-lev" class="plot"></div></div>
    </div>
    <div class="card"><h3>Margin × Turnover scatter (색=레버리지, 크기=ROE) — 효율 vs 회전</h3><div id="ov-dp-scatter" class="plot plot-tall"></div></div>

    <h3 class="section-h">⑰ Geographic Concentration — 회사별 농장 지역 분산</h3>
    <p class="notice">
      각 회사의 plantation area를 Sumatra/Kalimantan/Sulawesi/Other 4지역으로 분해.
      HHI(Herfindahl-Hirschman Index) = Σ(share²): 1.0 = 단일지역 집중, 0.25 = 균등 4분할.
    </p>
    <div class="card"><h3>회사별 지역 area 분포 — 100% stacked</h3><div id="ov-geo-stack" class="plot plot-tall"></div></div>
    <div class="grid-2">
      <div class="card"><h3>Geographic HHI — 집중도 ranking (높을수록 단일 지역 집중)</h3><div id="ov-geo-hhi" class="plot plot-tall"></div></div>
      <div class="card"><h3>Diversification × ROE — 분산이 수익성에 영향?</h3><div id="ov-geo-roe" class="plot plot-tall"></div></div>
    </div>

    <h3 class="section-h">⑱ 종합 Ranking 테이블</h3>
    <div class="card"><h3>종합 ranking — 기준연도 (모든 지표 + Quality)</h3><div id="ov-table"></div></div>
  `;

  // ── 시계열 차트는 한 번만
  const seriesByCo = (metric) => companies.map(co => {
    const rows = fin.filter(r => r.short === co).sort((a, b) => a.yr.localeCompare(b.yr));
    return {
      x: rows.map(r => r.yr), y: rows.map(r => r[metric]),
      name: co, type: "scatter", mode: "lines+markers",
      line: { color: colorMap[co], width: 2 },
      marker: { color: colorMap[co], size: 6 },
    };
  }).filter(t => t.y.some(v => v != null));

  plot("ov-rev-ts", seriesByCo("revenue"), {
    yaxis: { title: "Revenue (IDR bn)" },
    legend: { orientation: "h", y: -0.18, font: { size: 9 } },
    margin: { l: 70, r: 20, t: 10, b: 80 }, height: 480,
  });
  plot("ov-np-ts", seriesByCo("net_profit"), {
    yaxis: { title: "Net profit (IDR bn)", zeroline: true },
    legend: { orientation: "h", y: -0.18, font: { size: 9 } },
    margin: { l: 70, r: 20, t: 10, b: 80 }, height: 480,
  });

  // ── 기준연도 변동 차트 (rerender 함수)
  const yearSel = document.getElementById("ov-year");
  const metricSel = document.getElementById("ov-metric");
  const badge = document.getElementById("ov-badge");
  const kpiBox = document.getElementById("ov-kpis");

  const METRIC_LABEL = {
    revenue: "매출", net_profit: "순이익", ebitda: "EBITDA",
    assets: "총자산", equity: "자기자본", mcap: "시가총액", debt: "총부채",
  };

  const renderYearScoped = () => {
    const yr = yearSel.value;
    const metric = metricSel.value;
    const rows = fin.filter(r => r.yr === yr);
    badge.textContent = `${yr} · ${rows.length}사`;

    const sumRev = rows.reduce((s, r) => s + (r.revenue || 0), 0);
    const sumNp = rows.reduce((s, r) => s + (r.net_profit || 0), 0);
    const sumAsset = rows.reduce((s, r) => s + (r.assets || 0), 0);
    const sumMcap = rows.reduce((s, r) => s + (r.mcap || 0), 0);
    const profitable = rows.filter(r => r.net_profit > 0).length;
    kpiBox.innerHTML = [
      kpiHTML("회사 수", `${rows.length}/${companies.length}`),
      kpiHTML(`${yr} 매출 합`, fmtBn(sumRev), "IDR bn"),
      kpiHTML(`${yr} 순이익 합`, fmtBn(sumNp), `흑자 ${profitable}사`, sumNp >= 0 ? "blue" : "error"),
      kpiHTML(`${yr} 총자산 합`, fmtBn(sumAsset)),
      kpiHTML(`${yr} 시가총액 합`, fmtBn(sumMcap), `${rows.filter(r => r.mcap != null).length}사 합산`, "warn"),
    ].join("");

    // ── 랭킹 막대 (지표 select)
    const sorted = [...rows].filter(r => r[metric] != null).sort((a, b) => b[metric] - a[metric]);
    plot("ov-rank", [{
      x: sorted.map(r => r[metric]).reverse(),
      y: sorted.map(r => r.short).reverse(),
      type: "bar", orientation: "h",
      marker: { color: sorted.map(r => colorMap[r.short]).reverse() },
      text: sorted.map(r => Math.round(r[metric]).toLocaleString()).reverse(),
      textposition: "outside",
      hovertemplate: "%{y}<br>" + METRIC_LABEL[metric] + ": %{x:,.0f} bn<extra></extra>",
    }], {
      xaxis: { title: `${METRIC_LABEL[metric]} (IDR bn)` },
      margin: { l: 220, r: 80, t: 10, b: 40 },
      height: Math.max(480, sorted.length * 22 + 80),
    });

    // ── Bubble: revenue × net_margin, size=assets
    const bubble = rows.filter(r => r.revenue != null && r.net_margin != null);
    plot("ov-bubble", [{
      x: bubble.map(r => r.revenue), y: bubble.map(r => r.net_margin),
      mode: "markers+text", type: "scatter",
      text: bubble.map(r => r.short), textposition: "top center", textfont: { size: 9 },
      marker: {
        size: bubble.map(r => Math.max(8, Math.min(60, Math.sqrt((r.assets || 100)) / 4))),
        color: bubble.map(r => colorMap[r.short]),
        opacity: 0.75, line: { color: "#fff", width: 1 },
      },
      hovertemplate: "%{text}<br>매출 %{x:,.0f} bn<br>순이익률 %{y:.1f}%<extra></extra>",
    }], {
      xaxis: { title: "Revenue (IDR bn)", type: "log" },
      yaxis: { title: "Net margin (%)", zeroline: true },
      margin: { l: 60, r: 20, t: 10, b: 50 }, height: 480, showlegend: false,
    });

    // ── ROE vs ROA scatter
    const re = rows.filter(r => r.roe != null && r.roa != null);
    plot("ov-roe-roa", [{
      x: re.map(r => r.roa), y: re.map(r => r.roe),
      mode: "markers+text", type: "scatter",
      text: re.map(r => r.short), textposition: "top center", textfont: { size: 9 },
      marker: { size: 12, color: re.map(r => colorMap[r.short]), opacity: 0.75, line: { color: "#fff", width: 1 } },
      hovertemplate: "%{text}<br>ROA %{x:.2f}%<br>ROE %{y:.2f}%<extra></extra>",
    }], {
      xaxis: { title: "ROA (%)", zeroline: true },
      yaxis: { title: "ROE (%)", zeroline: true },
      margin: { l: 60, r: 20, t: 10, b: 50 }, height: 480, showlegend: false,
    });

    // ── Leverage vs profitability
    const lev = rows.filter(r => r.debt_eq != null && r.net_margin != null);
    plot("ov-lev", [{
      x: lev.map(r => r.debt_eq), y: lev.map(r => r.net_margin),
      mode: "markers+text", type: "scatter",
      text: lev.map(r => r.short), textposition: "top center", textfont: { size: 9 },
      marker: { size: 12, color: lev.map(r => colorMap[r.short]), opacity: 0.75, line: { color: "#fff", width: 1 } },
      hovertemplate: "%{text}<br>D/E %{x:.2f}x<br>Net margin %{y:.1f}%<extra></extra>",
    }], {
      xaxis: { title: "Debt / Equity (x)" },
      yaxis: { title: "Net margin (%)", zeroline: true },
      margin: { l: 60, r: 20, t: 10, b: 50 }, height: 480, showlegend: false,
    });

    // ── 마진 비교 (gross + net) grouped bar
    const mar = rows.filter(r => r.gross_margin != null || r.net_margin != null)
      .sort((a, b) => (b.net_margin || -999) - (a.net_margin || -999));
    plot("ov-margin", [
      { x: mar.map(r => r.short), y: mar.map(r => r.gross_margin), type: "bar", name: "Gross margin", marker: { color: "#2ca02c" } },
      { x: mar.map(r => r.short), y: mar.map(r => r.net_margin), type: "bar", name: "Net margin", marker: { color: "#1f77b4" } },
    ], {
      barmode: "group",
      yaxis: { title: "Margin (%)", zeroline: true },
      xaxis: { tickangle: -45, automargin: true },
      legend: { orientation: "h", y: -0.35 },
      margin: { l: 60, r: 20, t: 10, b: 130 }, height: 480,
    });

    // ── Treemap 총자산
    const ta = rows.filter(r => r.assets > 0);
    plot("ov-tree-asset", [{
      type: "treemap",
      labels: ta.map(r => r.short),
      parents: ta.map(() => ""),
      values: ta.map(r => r.assets),
      textinfo: "label+value+percent root",
      hovertemplate: "%{label}<br>%{value:,.0f} bn<extra></extra>",
      marker: { colors: ta.map(r => colorMap[r.short]) },
    }], { margin: { t: 10, l: 0, r: 0, b: 0 }, height: 480 });

    const tm = rows.filter(r => r.mcap > 0);
    plot("ov-tree-mcap", [{
      type: "treemap",
      labels: tm.map(r => r.short),
      parents: tm.map(() => ""),
      values: tm.map(r => r.mcap),
      textinfo: "label+value+percent root",
      hovertemplate: "%{label}<br>%{value:,.0f} bn<extra></extra>",
      marker: { colors: tm.map(r => colorMap[r.short]) },
    }], { margin: { t: 10, l: 0, r: 0, b: 0 }, height: 480 });

    // ── ⑥ Cash Flow & 효율성
    // CFO vs CapEx grouped bar (정렬 by CFO desc)
    const cfRows = rows.filter(r => r.cfo != null || r.capex != null)
      .sort((a, b) => (b.cfo || 0) - (a.cfo || 0));
    plot("ov-cfocapex", [
      { x: cfRows.map(r => r.short), y: cfRows.map(r => r.cfo), type: "bar", name: "CFO", marker: { color: "#2ca02c" } },
      { x: cfRows.map(r => r.short), y: cfRows.map(r => r.capex), type: "bar", name: "CapEx (절대값)", marker: { color: "#d62728" } },
    ], {
      barmode: "group", yaxis: { title: "IDR bn", zeroline: true },
      xaxis: { tickangle: -45, automargin: true },
      legend: { orientation: "h", y: -0.35 }, margin: { l: 60, r: 20, t: 10, b: 130 }, height: 480,
    });

    // FCF ranking
    const fcfRows = rows.filter(r => r.fcf != null).sort((a, b) => b.fcf - a.fcf);
    plot("ov-fcf-rank", [{
      x: fcfRows.map(r => r.fcf).reverse(), y: fcfRows.map(r => r.short).reverse(),
      type: "bar", orientation: "h",
      marker: { color: fcfRows.map(r => r.fcf >= 0 ? "#2ca02c" : "#d62728").reverse() },
      text: fcfRows.map(r => Math.round(r.fcf).toLocaleString()).reverse(), textposition: "outside",
      hovertemplate: "%{y}<br>FCF: %{x:,.0f} bn<extra></extra>",
    }], {
      xaxis: { title: "FCF = CFO − |CapEx| (IDR bn)", zeroline: true },
      margin: { l: 220, r: 80, t: 10, b: 40 }, height: Math.max(480, fcfRows.length * 22 + 80),
    });

    // CapEx Intensity (CapEx/Revenue %)
    const ciRows = rows.filter(r => r.capex_intensity != null).sort((a, b) => b.capex_intensity - a.capex_intensity);
    plot("ov-capex-int", [{
      x: ciRows.map(r => r.capex_intensity).reverse(), y: ciRows.map(r => r.short).reverse(),
      type: "bar", orientation: "h",
      marker: { color: ciRows.map(r => r.capex_intensity).reverse(), colorscale: "Reds" },
      text: ciRows.map(r => r.capex_intensity.toFixed(1) + "%").reverse(), textposition: "outside",
      hovertemplate: "%{y}<br>CapEx/Rev: %{x:.2f}%<extra></extra>",
    }], {
      xaxis: { title: "CapEx / Revenue (%)" },
      margin: { l: 220, r: 80, t: 10, b: 40 }, height: Math.max(480, ciRows.length * 22 + 80),
    });

    // Cash Conversion (CFO/NP %)
    const ccRows = rows.filter(r => r.cash_conv != null && Math.abs(r.cash_conv) < 1000)
      .sort((a, b) => b.cash_conv - a.cash_conv);
    plot("ov-cash-conv", [{
      x: ccRows.map(r => r.cash_conv).reverse(), y: ccRows.map(r => r.short).reverse(),
      type: "bar", orientation: "h",
      marker: { color: ccRows.map(r => r.cash_conv >= 100 ? "#2ca02c" : (r.cash_conv >= 0 ? "#ffbb78" : "#d62728")).reverse() },
      text: ccRows.map(r => r.cash_conv.toFixed(0) + "%").reverse(), textposition: "outside",
      hovertemplate: "%{y}<br>CFO/NP: %{x:.1f}%<extra></extra>",
    }], {
      xaxis: { title: "CFO / Net Profit (%) — 100% 이상이면 이익 → 현금 변환 우수" },
      margin: { l: 220, r: 80, t: 10, b: 50 }, height: Math.max(480, ccRows.length * 22 + 80),
    });

    // FCF margin × FCF yield scatter
    const fsRows = rows.filter(r => r.fcf_margin != null && r.fcf_yield != null);
    plot("ov-fcf-scatter", [{
      x: fsRows.map(r => r.fcf_margin), y: fsRows.map(r => r.fcf_yield),
      mode: "markers+text", type: "scatter",
      text: fsRows.map(r => r.short), textposition: "top center", textfont: { size: 9 },
      marker: {
        size: fsRows.map(r => Math.max(10, Math.min(50, Math.sqrt(r.mcap || 100) / 4))),
        color: fsRows.map(r => colorMap[r.short]), opacity: 0.75, line: { color: "#fff", width: 1 },
      },
      hovertemplate: "%{text}<br>FCF margin %{x:.2f}%<br>FCF yield %{y:.2f}%<extra></extra>",
    }], {
      xaxis: { title: "FCF / Revenue (%)", zeroline: true },
      yaxis: { title: "FCF / Market Cap (%) — Yield", zeroline: true },
      margin: { l: 60, r: 20, t: 10, b: 50 }, height: 480, showlegend: false,
    });

    // ── ⑦ Valuation multiples
    const peRows = rows.filter(r => r.pe != null && r.pe > 0 && r.pe < 200).sort((a, b) => a.pe - b.pe);
    plot("ov-pe", [{
      x: peRows.map(r => r.pe).reverse(), y: peRows.map(r => r.short).reverse(),
      type: "bar", orientation: "h",
      marker: { color: peRows.map(r => r.pe).reverse(), colorscale: "Blues" },
      text: peRows.map(r => r.pe.toFixed(1) + "x").reverse(), textposition: "outside",
      hovertemplate: "%{y}<br>P/E: %{x:.2f}x<extra></extra>",
    }], { xaxis: { title: "P/E (x)" }, margin: { l: 220, r: 80, t: 10, b: 40 }, height: Math.max(400, peRows.length * 24 + 80) });

    const pbRows = rows.filter(r => r.pb != null && r.pb > 0 && r.pb < 50).sort((a, b) => a.pb - b.pb);
    plot("ov-pb", [{
      x: pbRows.map(r => r.pb).reverse(), y: pbRows.map(r => r.short).reverse(),
      type: "bar", orientation: "h",
      marker: { color: pbRows.map(r => r.pb).reverse(), colorscale: "Purples" },
      text: pbRows.map(r => r.pb.toFixed(2) + "x").reverse(), textposition: "outside",
      hovertemplate: "%{y}<br>P/B: %{x:.2f}x<extra></extra>",
    }], { xaxis: { title: "P/B (x)" }, margin: { l: 220, r: 80, t: 10, b: 40 }, height: Math.max(400, pbRows.length * 24 + 80) });

    const dyRows = rows.filter(r => r.div_yield != null && r.div_yield > 0).sort((a, b) => b.div_yield - a.div_yield);
    plot("ov-divy", [{
      x: dyRows.map(r => r.div_yield).reverse(), y: dyRows.map(r => r.short).reverse(),
      type: "bar", orientation: "h",
      marker: { color: "#2ca02c" },
      text: dyRows.map(r => r.div_yield.toFixed(2) + "%").reverse(), textposition: "outside",
      hovertemplate: "%{y}<br>Div Yield: %{x:.2f}%<br>DPS: " + "<extra></extra>",
    }], { xaxis: { title: "Dividend Yield (%)" }, margin: { l: 220, r: 80, t: 10, b: 40 }, height: Math.max(400, dyRows.length * 24 + 80) });

    const eyRows = rows.filter(r => r.earnings_yield != null).sort((a, b) => b.earnings_yield - a.earnings_yield);
    plot("ov-eyld", [{
      x: eyRows.map(r => r.earnings_yield).reverse(), y: eyRows.map(r => r.short).reverse(),
      type: "bar", orientation: "h",
      marker: { color: eyRows.map(r => r.earnings_yield >= 0 ? "#1f77b4" : "#d62728").reverse() },
      text: eyRows.map(r => r.earnings_yield.toFixed(2) + "%").reverse(), textposition: "outside",
      hovertemplate: "%{y}<br>Earnings Yield: %{x:.2f}%<extra></extra>",
    }], { xaxis: { title: "Earnings Yield (1/PE) (%)", zeroline: true }, margin: { l: 220, r: 80, t: 10, b: 40 }, height: Math.max(400, eyRows.length * 24 + 80) });

    // P/E × ROE scatter
    const peRoeRows = rows.filter(r => r.pe != null && r.pe > 0 && r.pe < 100 && r.roe != null);
    plot("ov-pe-roe", [{
      x: peRoeRows.map(r => r.pe), y: peRoeRows.map(r => r.roe),
      mode: "markers+text", type: "scatter",
      text: peRoeRows.map(r => r.short), textposition: "top center", textfont: { size: 9 },
      marker: {
        size: peRoeRows.map(r => Math.max(10, Math.min(50, Math.sqrt(r.mcap || 100) / 4))),
        color: peRoeRows.map(r => colorMap[r.short]), opacity: 0.75, line: { color: "#fff", width: 1 },
      },
      hovertemplate: "%{text}<br>P/E %{x:.2f}x<br>ROE %{y:.2f}%<br>크기=mcap<extra></extra>",
    }], {
      xaxis: { title: "P/E (x) — 가치(↑싸다)" },
      yaxis: { title: "ROE (%) — 품질(↑좋다)", zeroline: true },
      margin: { l: 60, r: 20, t: 10, b: 50 }, height: 480, showlegend: false,
    });

    // ── ⑧ Region analysis
    const REGIONS = ["Sumatra", "Kalimantan", "Java", "Sulawesi", "Papua", "Diversified", "Other"];
    const regionAgg = {};
    REGIONS.forEach(rg => { regionAgg[rg] = { n: 0, rev: 0, np: 0, assets: 0, roeSum: 0, roeN: 0, marginSum: 0, marginN: 0 }; });
    rows.forEach(r => {
      const a = regionAgg[r.region] || regionAgg.Other;
      a.n++;
      a.rev += r.revenue || 0; a.np += r.net_profit || 0; a.assets += r.assets || 0;
      if (r.roe != null) { a.roeSum += r.roe; a.roeN++; }
      if (r.net_margin != null) { a.marginSum += r.net_margin; a.marginN++; }
    });
    const regionsActive = REGIONS.filter(rg => regionAgg[rg].n > 0);

    plot("ov-region-bar", [
      { x: regionsActive, y: regionsActive.map(rg => regionAgg[rg].rev), type: "bar", name: "매출 합 (bn)", marker: { color: regionsActive.map(rg => REGION_COLOR[rg]) }, yaxis: "y" },
      { x: regionsActive, y: regionsActive.map(rg => regionAgg[rg].n), type: "scatter", mode: "lines+markers", name: "회사 수", line: { color: "#333", width: 2 }, yaxis: "y2" },
    ], {
      yaxis: { title: "매출 합 (IDR bn)" },
      yaxis2: { title: "회사 수", overlaying: "y", side: "right" },
      legend: { orientation: "h", y: -0.18 }, margin: { l: 70, r: 60, t: 10, b: 50 }, height: 480,
    });

    plot("ov-region-eff", [
      { x: regionsActive, y: regionsActive.map(rg => regionAgg[rg].roeN ? regionAgg[rg].roeSum / regionAgg[rg].roeN : null), type: "bar", name: "평균 ROE %", marker: { color: "#1f77b4" } },
      { x: regionsActive, y: regionsActive.map(rg => regionAgg[rg].marginN ? regionAgg[rg].marginSum / regionAgg[rg].marginN : null), type: "bar", name: "평균 순이익률 %", marker: { color: "#2ca02c" } },
    ], {
      barmode: "group", yaxis: { title: "%", zeroline: true },
      legend: { orientation: "h", y: -0.18 }, margin: { l: 70, r: 20, t: 10, b: 50 }, height: 480,
    });

    // 권역별 매출 시계열 (모든 연도)
    const regionTsTraces = REGIONS.map(rg => {
      const y = allYears.map(yr => fin.filter(r => r.region === rg && r.yr === yr).reduce((s, r) => s + (r.revenue || 0), 0));
      return { x: allYears, y, name: rg, type: "scatter", mode: "lines", stackgroup: "rev", line: { color: REGION_COLOR[rg], width: 0 }, fillcolor: REGION_COLOR[rg] };
    }).filter(t => t.y.some(v => v > 0));
    plot("ov-region-ts", regionTsTraces, { yaxis: { title: "매출 합 (IDR bn)" }, legend: { orientation: "h", y: -0.18 }, margin: { l: 70, r: 20, t: 10, b: 50 }, height: 480 });

    // Treemap: region → company
    const tmRows = rows.filter(r => r.revenue > 0);
    const tmLabels = [], tmParents = [], tmValues = [], tmColors = [];
    regionsActive.forEach(rg => {
      tmLabels.push(rg); tmParents.push(""); tmValues.push(0); tmColors.push(REGION_COLOR[rg]);
    });
    tmRows.forEach(r => {
      tmLabels.push(r.short); tmParents.push(r.region); tmValues.push(r.revenue); tmColors.push(REGION_COLOR[r.region]);
    });
    plot("ov-region-tree", [{
      type: "treemap", labels: tmLabels, parents: tmParents, values: tmValues, branchvalues: "total",
      textinfo: "label+value+percent parent",
      hovertemplate: "%{label}<br>%{value:,.0f} bn<extra></extra>",
      marker: { colors: tmColors },
    }], { margin: { t: 10, l: 0, r: 0, b: 0 }, height: 520 });

    // ── ⑩ Balance Sheet 깊이
    const crRows = rows.filter(r => r.curr_ratio != null && r.curr_ratio > 0).sort((a, b) => b.curr_ratio - a.curr_ratio);
    plot("ov-curr", [{
      x: crRows.map(r => r.curr_ratio).reverse(), y: crRows.map(r => r.short).reverse(),
      type: "bar", orientation: "h",
      marker: { color: crRows.map(r => r.curr_ratio >= 2 ? "#2ca02c" : r.curr_ratio >= 1 ? "#ffbb78" : "#d62728").reverse() },
      text: crRows.map(r => r.curr_ratio.toFixed(2) + "x").reverse(), textposition: "outside",
      hovertemplate: "%{y}<br>Current ratio: %{x:.2f}x<extra></extra>",
    }], { xaxis: { title: "Current Ratio (x) — 2.0+ 우수 · 1.0+ 정상 · <1.0 위험" }, margin: { l: 220, r: 80, t: 10, b: 50 }, height: Math.max(400, crRows.length * 22 + 80) });

    const daRows = rows.filter(r => r.debt_assets != null).sort((a, b) => b.debt_assets - a.debt_assets);
    plot("ov-debt-assets", [{
      x: daRows.map(r => r.debt_assets).reverse(), y: daRows.map(r => r.short).reverse(),
      type: "bar", orientation: "h",
      marker: { color: daRows.map(r => r.debt_assets).reverse(), colorscale: "Reds" },
      text: daRows.map(r => r.debt_assets.toFixed(1) + "%").reverse(), textposition: "outside",
      hovertemplate: "%{y}<br>Debt/Assets: %{x:.2f}%<extra></extra>",
    }], { xaxis: { title: "Gross Debt / Total Assets (%)" }, margin: { l: 220, r: 80, t: 10, b: 40 }, height: Math.max(400, daRows.length * 22 + 80) });

    const ndRows = rows.filter(r => r.nd_ebitda != null && Math.abs(r.nd_ebitda) < 30).sort((a, b) => a.nd_ebitda - b.nd_ebitda);
    plot("ov-nd-eb", [{
      x: ndRows.map(r => r.nd_ebitda).reverse(), y: ndRows.map(r => r.short).reverse(),
      type: "bar", orientation: "h",
      marker: { color: ndRows.map(r => r.nd_ebitda < 0 ? "#2ca02c" : r.nd_ebitda < 2 ? "#1f77b4" : r.nd_ebitda < 4 ? "#ffbb78" : "#d62728").reverse() },
      text: ndRows.map(r => r.nd_ebitda.toFixed(2) + "x").reverse(), textposition: "outside",
      hovertemplate: "%{y}<br>Net Debt/EBITDA: %{x:.2f}x<extra></extra>",
    }], { xaxis: { title: "Net Debt / EBITDA (x) — 음수=현금 초과 · 2x 이하 우수 · 4x+ 위험", zeroline: true }, margin: { l: 220, r: 80, t: 10, b: 50 }, height: Math.max(400, ndRows.length * 22 + 80) });

    // ── ⑫ Risk & Red Flags
    const riskRows = [...rows].filter(r => r.risk_score != null).sort((a, b) => b.risk_score - a.risk_score);
    const RISK_COLOR = (s) => s >= 60 ? "#d62728" : s >= 30 ? "#ffbb78" : "#2ca02c";
    plot("ov-risk-bar", [{
      x: riskRows.map(r => r.risk_score).reverse(), y: riskRows.map(r => r.short).reverse(),
      type: "bar", orientation: "h",
      marker: { color: riskRows.map(r => RISK_COLOR(r.risk_score)).reverse() },
      text: riskRows.map(r => `${r.risk_score} · ${r.risk_band}`).reverse(), textposition: "outside",
      hovertemplate: "%{y}<br>Risk %{x}/100<extra></extra>",
    }], { xaxis: { title: "Risk Score (0=안전 · 100=위험)", range: [0, 110] }, margin: { l: 220, r: 100, t: 10, b: 40 }, height: Math.max(400, riskRows.length * 22 + 80) });

    const rsScatter = riskRows.filter(r => r.revenue != null);
    plot("ov-risk-scatter", [{
      x: rsScatter.map(r => r.risk_score), y: rsScatter.map(r => r.revenue),
      mode: "markers+text", type: "scatter",
      text: rsScatter.map(r => r.short), textposition: "top center", textfont: { size: 9 },
      marker: {
        size: rsScatter.map(r => Math.max(10, Math.min(50, Math.sqrt(r.assets || 100) / 4))),
        color: rsScatter.map(r => RISK_COLOR(r.risk_score)),
        opacity: 0.75, line: { color: "#fff", width: 1 },
      },
      hovertemplate: "%{text}<br>Risk %{x}<br>매출 %{y:,.0f} bn<extra></extra>",
    }], {
      xaxis: { title: "Risk Score", range: [0, 110] },
      yaxis: { title: "Revenue (IDR bn)", type: "log" },
      margin: { l: 70, r: 20, t: 10, b: 50 }, height: 480, showlegend: false,
    });

    const riskTbl = riskRows.map(r => ({
      회사: r.short, 권역: r.region,
      Risk: r.risk_score, Band: r.risk_band,
      매출: r.revenue, 순이익: r.net_profit,
      "ND/EB": r.nd_ebitda, "CurR": r.curr_ratio,
      red_flags: (r.key_red_flags || "").slice(0, 300),
      재무_risk_note: (r.financial_risk_note || "").slice(0, 200),
    }));
    makeTable("ov-risk-table", [
      { data: "회사", title: "회사" },
      { data: "권역", title: "권역" },
      { data: "Risk", title: "Risk", render: (d) => `<b style="color:${RISK_COLOR(d)}">${d}</b>` },
      { data: "Band", title: "Band" },
      { data: "매출", title: "매출 bn", render: (d) => d == null ? "-" : Number(d).toLocaleString(undefined, { maximumFractionDigits: 0 }) },
      { data: "순이익", title: "순이익 bn", render: (d) => d == null ? "-" : Number(d).toLocaleString(undefined, { maximumFractionDigits: 0 }) },
      { data: "ND/EB", title: "ND/EB", render: (d) => d == null ? "-" : Number(d).toFixed(2) },
      { data: "CurR", title: "CurR", render: (d) => d == null ? "-" : Number(d).toFixed(2) },
      { data: "red_flags", title: "Key Red Flags (요약)" },
      { data: "재무_risk_note", title: "재무 risk note" },
    ], riskTbl, { pageLength: 20, order: [[2, "desc"]] });

    // ── ⑬ Operations (planted ha, CPO, revenue/ha)
    const plRows = rows.filter(r => r.planted_ha > 0).sort((a, b) => b.planted_ha - a.planted_ha);
    plot("ov-planted", [{
      x: plRows.map(r => r.planted_ha).reverse(), y: plRows.map(r => r.short).reverse(),
      type: "bar", orientation: "h",
      marker: { color: plRows.map(r => REGION_COLOR[r.region] || "#7f7f7f").reverse() },
      text: plRows.map(r => Math.round(r.planted_ha).toLocaleString() + " ha").reverse(), textposition: "outside",
      hovertemplate: "%{y}<br>%{x:,.0f} ha<extra></extra>",
    }], { xaxis: { title: "Planted Area (ha)" }, margin: { l: 220, r: 100, t: 10, b: 40 }, height: Math.max(400, plRows.length * 24 + 80) });

    const cpoRows = rows.filter(r => r.cpo_t > 0).sort((a, b) => b.cpo_t - a.cpo_t);
    plot("ov-cpo-prod", [{
      x: cpoRows.map(r => r.cpo_t).reverse(), y: cpoRows.map(r => r.short).reverse(),
      type: "bar", orientation: "h",
      marker: { color: cpoRows.map(r => r.cpo_t).reverse(), colorscale: "YlOrRd" },
      text: cpoRows.map(r => Math.round(r.cpo_t).toLocaleString() + " t").reverse(), textposition: "outside",
      hovertemplate: "%{y}<br>%{x:,.0f} ton CPO<extra></extra>",
    }], { xaxis: { title: "CPO Production (ton)" }, margin: { l: 220, r: 100, t: 10, b: 40 }, height: Math.max(400, cpoRows.length * 24 + 80) });

    const rhRows = rows.filter(r => r.rev_per_ha != null).sort((a, b) => b.rev_per_ha - a.rev_per_ha);
    plot("ov-rev-ha", [{
      x: rhRows.map(r => r.rev_per_ha / 1e6).reverse(),  // IDR mn/ha
      y: rhRows.map(r => r.short).reverse(),
      type: "bar", orientation: "h",
      marker: { color: rhRows.map(r => r.rev_per_ha).reverse(), colorscale: "Greens" },
      text: rhRows.map(r => (r.rev_per_ha / 1e6).toFixed(1) + "M").reverse(), textposition: "outside",
      hovertemplate: "%{y}<br>Revenue/ha: %{x:.2f} IDR mn/ha<extra></extra>",
    }], { xaxis: { title: "Revenue / Planted ha (IDR mn/ha)" }, margin: { l: 220, r: 80, t: 10, b: 40 }, height: Math.max(400, rhRows.length * 24 + 80) });

    const cyRows = rows.filter(r => r.cpo_per_ha != null).sort((a, b) => b.cpo_per_ha - a.cpo_per_ha);
    plot("ov-cpo-yield", [{
      x: cyRows.map(r => r.cpo_per_ha).reverse(), y: cyRows.map(r => r.short).reverse(),
      type: "bar", orientation: "h",
      marker: { color: cyRows.map(r => r.cpo_per_ha).reverse(), colorscale: "Viridis" },
      text: cyRows.map(r => r.cpo_per_ha.toFixed(2) + " t/ha").reverse(), textposition: "outside",
      hovertemplate: "%{y}<br>CPO Yield: %{x:.3f} ton/ha<extra></extra>",
    }], { xaxis: { title: "CPO Production / Planted ha (ton/ha)" }, margin: { l: 220, r: 80, t: 10, b: 40 }, height: Math.max(400, cyRows.length * 24 + 80) });

    const millRows = rows.filter(r => r.mills_n != null && r.mill_cap_tph != null);
    plot("ov-mills", [{
      x: millRows.map(r => r.mills_n), y: millRows.map(r => r.mill_cap_tph),
      mode: "markers+text", type: "scatter",
      text: millRows.map(r => r.short), textposition: "top center", textfont: { size: 9 },
      marker: {
        size: millRows.map(r => Math.max(10, Math.min(50, Math.sqrt(r.planted_ha || 100) / 30))),
        color: millRows.map(r => REGION_COLOR[r.region] || "#7f7f7f"),
        opacity: 0.75, line: { color: "#fff", width: 1 },
      },
      hovertemplate: "%{text}<br>Mills %{x} · 처리능력 %{y} tph<br>크기=planted ha<extra></extra>",
    }], {
      xaxis: { title: "Mills count" },
      yaxis: { title: "Mill Capacity (tph)" },
      margin: { l: 70, r: 20, t: 10, b: 50 }, height: 480, showlegend: false,
    });

    // ── ⑭ Composite Quality Score
    const qRows = [...rows].sort((a, b) => b.quality_score - a.quality_score);
    const QBAND_COLOR = (b) => ({ A: "#2ca02c", B: "#1f77b4", C: "#ffbb78", D: "#d62728" }[b] || "#7f7f7f");
    plot("ov-quality-bar", [{
      x: qRows.map(r => r.quality_score).reverse(), y: qRows.map(r => r.short).reverse(),
      type: "bar", orientation: "h",
      marker: { color: qRows.map(r => QBAND_COLOR(r.quality_band)).reverse() },
      text: qRows.map(r => `${r.quality_score.toFixed(0)} (${r.quality_band})`).reverse(), textposition: "outside",
      hovertemplate: "%{y}<br>Quality %{x:.1f}/100<extra></extra>",
    }], { xaxis: { title: "Quality Score (0=낮음 · 100=최상)", range: [0, 110] }, margin: { l: 220, r: 100, t: 10, b: 40 }, height: Math.max(400, qRows.length * 22 + 80) });

    // Quality × Risk 4분면
    const qrRows = rows.filter(r => r.risk_score != null);
    plot("ov-qr-quad", [{
      x: qrRows.map(r => r.risk_score), y: qrRows.map(r => r.quality_score),
      mode: "markers+text", type: "scatter",
      text: qrRows.map(r => r.short), textposition: "top center", textfont: { size: 9 },
      marker: {
        size: qrRows.map(r => Math.max(10, Math.min(50, Math.sqrt(r.revenue || 100) / 4))),
        color: qrRows.map(r => QBAND_COLOR(r.quality_band)),
        opacity: 0.75, line: { color: "#fff", width: 1 },
      },
      hovertemplate: "%{text}<br>Risk %{x}<br>Quality %{y:.1f}<extra></extra>",
    }], {
      xaxis: { title: "Risk Score (↓낮을수록 안전)", range: [0, 110] },
      yaxis: { title: "Quality Score (↑높을수록 우수)", range: [0, 110] },
      margin: { l: 60, r: 20, t: 10, b: 50 }, height: 480, showlegend: false,
      shapes: [
        { type: "line", x0: 50, y0: 0, x1: 50, y1: 110, line: { color: "#ccc", dash: "dash", width: 1 } },
        { type: "line", x0: 0, y0: 50, x1: 110, y1: 50, line: { color: "#ccc", dash: "dash", width: 1 } },
      ],
      annotations: [
        { x: 25, y: 100, text: "이상: 고품질·저위험", showarrow: false, font: { color: "#2ca02c", size: 11 } },
        { x: 90, y: 100, text: "성장형: 고품질·고위험", showarrow: false, font: { color: "#1f77b4", size: 11 } },
        { x: 25, y: 5, text: "지루: 저품질·저위험", showarrow: false, font: { color: "#999", size: 11 } },
        { x: 90, y: 5, text: "위험: 저품질·고위험", showarrow: false, font: { color: "#d62728", size: 11 } },
      ],
    });

    // Top 8 Radar (5축)
    const top8Q = qRows.slice(0, 8);
    const radarTraces = top8Q.map(r => ({
      type: "scatterpolar",
      r: [r.q_profit, r.q_cash, r.q_bs, r.q_yield, r.q_size, r.q_profit],
      theta: ["Profitability", "Cash Gen", "Balance Sheet", "Yield", "Size", "Profitability"],
      fill: "toself",
      name: r.short,
      line: { color: colorMap[r.short] },
    }));
    plot("ov-radar", radarTraces, {
      polar: { radialaxis: { visible: true, range: [0, 22] } },
      showlegend: true, legend: { orientation: "h", y: -0.18, font: { size: 9 } },
      margin: { l: 40, r: 40, t: 20, b: 60 }, height: 520,
    });

    // 자본구조 stacked (equity + liab = assets), 회사별
    const csRows = rows.filter(r => r.equity != null && r.liab != null).sort((a, b) => (b.assets || 0) - (a.assets || 0));
    plot("ov-capstack", [
      { x: csRows.map(r => r.short), y: csRows.map(r => r.equity), type: "bar", name: "Equity", marker: { color: "#2ca02c" } },
      { x: csRows.map(r => r.short), y: csRows.map(r => r.liab), type: "bar", name: "Liabilities", marker: { color: "#d62728" } },
    ], {
      barmode: "stack", yaxis: { title: "IDR bn" },
      xaxis: { tickangle: -45, automargin: true },
      legend: { orientation: "h", y: -0.35 }, margin: { l: 70, r: 20, t: 10, b: 130 }, height: 480,
    });

    // ── ⑯ DuPont 3-factor
    // 3 ranking bar (margin / turnover / leverage), 정렬 by 각 지표 desc
    const dpRows = rows.filter(r => r.dp_margin != null && r.dp_turnover != null && r.dp_leverage != null);
    const sortedByMargin = [...dpRows].sort((a, b) => b.dp_margin - a.dp_margin);
    const sortedByTurnover = [...dpRows].sort((a, b) => b.dp_turnover - a.dp_turnover);
    const sortedByLev = [...dpRows].sort((a, b) => b.dp_leverage - a.dp_leverage);

    plot("ov-dp-margin", [{
      x: sortedByMargin.map(r => r.dp_margin * 100).reverse(),
      y: sortedByMargin.map(r => r.short).reverse(),
      type: "bar", orientation: "h",
      marker: { color: sortedByMargin.map(r => r.dp_margin >= 0 ? "#2ca02c" : "#d62728").reverse() },
      text: sortedByMargin.map(r => (r.dp_margin * 100).toFixed(1) + "%").reverse(), textposition: "outside",
    }], { xaxis: { title: "Net Margin (%)", zeroline: true }, margin: { l: 180, r: 60, t: 10, b: 40 }, height: Math.max(400, sortedByMargin.length * 22 + 60) });

    plot("ov-dp-turn", [{
      x: sortedByTurnover.map(r => r.dp_turnover).reverse(),
      y: sortedByTurnover.map(r => r.short).reverse(),
      type: "bar", orientation: "h",
      marker: { color: sortedByTurnover.map(r => r.dp_turnover).reverse(), colorscale: "Blues" },
      text: sortedByTurnover.map(r => r.dp_turnover.toFixed(2) + "x").reverse(), textposition: "outside",
    }], { xaxis: { title: "Asset Turnover (x)" }, margin: { l: 180, r: 60, t: 10, b: 40 }, height: Math.max(400, sortedByTurnover.length * 22 + 60) });

    plot("ov-dp-lev", [{
      x: sortedByLev.map(r => r.dp_leverage).reverse(),
      y: sortedByLev.map(r => r.short).reverse(),
      type: "bar", orientation: "h",
      marker: { color: sortedByLev.map(r => r.dp_leverage > 3 ? "#d62728" : r.dp_leverage > 2 ? "#ffbb78" : "#2ca02c").reverse() },
      text: sortedByLev.map(r => r.dp_leverage.toFixed(2) + "x").reverse(), textposition: "outside",
    }], { xaxis: { title: "Equity Multiplier (x)" }, margin: { l: 180, r: 60, t: 10, b: 40 }, height: Math.max(400, sortedByLev.length * 22 + 60) });

    // Margin × Turnover scatter, color=leverage, size=ROE
    const dpScRows = dpRows.filter(r => r.roe != null);
    plot("ov-dp-scatter", [{
      x: dpScRows.map(r => r.dp_margin * 100),
      y: dpScRows.map(r => r.dp_turnover),
      mode: "markers+text", type: "scatter",
      text: dpScRows.map(r => r.short), textposition: "top center", textfont: { size: 9 },
      marker: {
        size: dpScRows.map(r => Math.max(8, Math.min(48, Math.abs(r.roe) / 2 + 8))),
        color: dpScRows.map(r => r.dp_leverage),
        colorscale: "RdYlGn_r", showscale: true, colorbar: { title: "Leverage (x)" },
        opacity: 0.85, line: { color: "#fff", width: 1 },
      },
      hovertemplate: "%{text}<br>Margin %{x:.2f}%<br>Turnover %{y:.2f}x<br>크기=|ROE|<extra></extra>",
    }], {
      xaxis: { title: "Net Margin (%) — 효율", zeroline: true },
      yaxis: { title: "Asset Turnover (x) — 회전", zeroline: true },
      margin: { l: 70, r: 50, t: 10, b: 50 }, height: 520, showlegend: false,
    });

    // ── ⑰ Geographic Concentration
    const geoRows = rows.filter(r => r.area_total_reported > 0).sort((a, b) => b.area_total_reported - a.area_total_reported);
    plot("ov-geo-stack", [
      { x: geoRows.map(r => r.short), y: geoRows.map(r => r.area_sumatra / r.area_total_reported * 100), type: "bar", name: "Sumatra", marker: { color: "#2ca02c" } },
      { x: geoRows.map(r => r.short), y: geoRows.map(r => r.area_kalimantan / r.area_total_reported * 100), type: "bar", name: "Kalimantan", marker: { color: "#ff7f0e" } },
      { x: geoRows.map(r => r.short), y: geoRows.map(r => r.area_sulawesi / r.area_total_reported * 100), type: "bar", name: "Sulawesi", marker: { color: "#9467bd" } },
      { x: geoRows.map(r => r.short), y: geoRows.map(r => r.area_other / r.area_total_reported * 100), type: "bar", name: "Other", marker: { color: "#7f7f7f" } },
    ], {
      barmode: "stack", yaxis: { title: "지역 점유 (%)", range: [0, 100] },
      xaxis: { tickangle: -45, automargin: true },
      legend: { orientation: "h", y: -0.35 },
      margin: { l: 70, r: 20, t: 10, b: 130 }, height: 480,
    });

    // HHI ranking
    const hhiRows = [...geoRows].sort((a, b) => b.geo_hhi - a.geo_hhi);
    plot("ov-geo-hhi", [{
      x: hhiRows.map(r => r.geo_hhi).reverse(), y: hhiRows.map(r => r.short).reverse(),
      type: "bar", orientation: "h",
      marker: { color: hhiRows.map(r => r.geo_hhi > 0.8 ? "#d62728" : r.geo_hhi > 0.5 ? "#ffbb78" : "#2ca02c").reverse() },
      text: hhiRows.map(r => r.geo_hhi.toFixed(2)).reverse(), textposition: "outside",
      hovertemplate: "%{y}<br>HHI %{x:.3f}<extra></extra>",
    }], { xaxis: { title: "Geographic HHI (0.25 균등 — 1.0 단일지역)", range: [0, 1.1] }, margin: { l: 220, r: 60, t: 10, b: 40 }, height: Math.max(400, hhiRows.length * 22 + 60) });

    // Diversification × ROE scatter
    const drRows = geoRows.filter(r => r.geo_diversification != null && r.roe != null);
    plot("ov-geo-roe", [{
      x: drRows.map(r => r.geo_diversification), y: drRows.map(r => r.roe),
      mode: "markers+text", type: "scatter",
      text: drRows.map(r => r.short), textposition: "top center", textfont: { size: 9 },
      marker: {
        size: drRows.map(r => Math.max(10, Math.min(48, Math.sqrt(r.area_total_reported || 100) / 30))),
        color: drRows.map(r => REGION_COLOR[r.region] || "#7f7f7f"),
        opacity: 0.8, line: { color: "#fff", width: 1 },
      },
      hovertemplate: "%{text}<br>Diversification %{x:.3f}<br>ROE %{y:.2f}%<extra></extra>",
    }], {
      xaxis: { title: "Diversification (1 - HHI)" },
      yaxis: { title: "ROE (%)", zeroline: true },
      margin: { l: 60, r: 20, t: 10, b: 50 }, height: 480, showlegend: false,
    });

    // ── 종합 ranking 테이블
    const tableRows = [...rows].sort((a, b) => (b.quality_score || 0) - (a.quality_score || 0)).map(r => ({
      회사: r.short, 권역: r.region, "Quality": r.quality_score, Band: r.quality_band, "Risk": r.risk_score,
      매출: r.revenue, 순이익: r.net_profit, EBITDA: r.ebitda,
      자산: r.assets, 부채: r.liab, 자본: r.equity, 시가총액: r.mcap,
      CFO: r.cfo, CapEx: r.capex, FCF: r.fcf,
      "P/E": r.pe, "P/B": r.pb, "DivY%": r.div_yield,
      "순이익률(%)": r.net_margin, "ROE(%)": r.roe, "ROA(%)": r.roa,
      "D/E(x)": r.debt_eq, "CurR": r.curr_ratio, "ND/EB": r.nd_ebitda,
      "Planted ha": r.planted_ha, "CPO t": r.cpo_t, "Rev/ha(M)": r.rev_per_ha ? r.rev_per_ha / 1e6 : null,
    }));
    const numFmt = (d) => d == null ? "-" : Number(d).toLocaleString(undefined, { maximumFractionDigits: 0 });
    const pctFmt = (d) => d == null ? "-" : Number(d).toFixed(2);
    makeTable("ov-table", [
      { data: "회사", title: "회사" },
      { data: "권역", title: "권역" },
      { data: "Quality", title: "Quality", render: pctFmt },
      { data: "Band", title: "Band" },
      { data: "Risk", title: "Risk", render: pctFmt },
      { data: "매출", title: "매출 bn", render: numFmt },
      { data: "순이익", title: "순이익 bn", render: numFmt },
      { data: "EBITDA", title: "EBITDA bn", render: numFmt },
      { data: "자산", title: "자산 bn", render: numFmt },
      { data: "부채", title: "부채 bn", render: numFmt },
      { data: "자본", title: "자본 bn", render: numFmt },
      { data: "시가총액", title: "시총 bn", render: numFmt },
      { data: "CFO", title: "CFO bn", render: numFmt },
      { data: "CapEx", title: "CapEx bn", render: numFmt },
      { data: "FCF", title: "FCF bn", render: numFmt },
      { data: "P/E", title: "P/E x", render: pctFmt },
      { data: "P/B", title: "P/B x", render: pctFmt },
      { data: "DivY%", title: "DivY%", render: pctFmt },
      { data: "순이익률(%)", title: "순이익률%", render: pctFmt },
      { data: "ROE(%)", title: "ROE%", render: pctFmt },
      { data: "ROA(%)", title: "ROA%", render: pctFmt },
      { data: "D/E(x)", title: "D/E x", render: pctFmt },
      { data: "CurR", title: "CurR x", render: pctFmt },
      { data: "ND/EB", title: "ND/EBITDA", render: pctFmt },
      { data: "Planted ha", title: "Planted ha", render: numFmt },
      { data: "CPO t", title: "CPO ton", render: numFmt },
      { data: "Rev/ha(M)", title: "Rev/ha (IDR M)", render: pctFmt },
    ], tableRows, { pageLength: 25 });
  };

  yearSel.addEventListener("change", renderYearScoped);
  metricSel.addEventListener("change", renderYearScoped);
  renderYearScoped();

  // ── ⑨ Growth (YoY) — annual years pair select
  const pairSel = document.getElementById("ov-growth-pair");
  const pairs = [];
  for (let i = 1; i < annualYears.length; i++) pairs.push([annualYears[i-1], annualYears[i]]);
  pairSel.innerHTML = pairs.map(([a, b], i) => `<option value="${i}" ${i === pairs.length - 1 ? "selected" : ""}>${a} → ${b}</option>`).join("");

  const renderGrowth = () => {
    const [fromY, toY] = pairs[Number(pairSel.value)];
    const findFin = (co, yr) => fin.find(r => r.short === co && r.yr === yr);
    const growthRows = companies.map(co => {
      const a = findFin(co, fromY), b = findFin(co, toY);
      if (!a || !b) return null;
      const rev0 = a.revenue, rev1 = b.revenue;
      const np0 = a.net_profit, np1 = b.net_profit;
      const rev_g = (rev0 && rev1 != null) ? (rev1 / rev0 - 1) * 100 : null;
      // np growth — 적자→흑자 case handling
      let np_g = null;
      if (np0 != null && np1 != null) {
        if (Math.abs(np0) > 1) np_g = (np1 - np0) / Math.abs(np0) * 100;
      }
      return { short: co, region: b.region || a.region, rev0, rev1, np0, np1, rev_g, np_g, margin: b.net_margin, revenue: b.revenue };
    }).filter(Boolean);

    // 매출 성장 ranking
    const rg = [...growthRows].filter(r => r.rev_g != null).sort((a, b) => b.rev_g - a.rev_g);
    plot("ov-grow-rev", [{
      x: rg.map(r => r.rev_g).reverse(), y: rg.map(r => r.short).reverse(),
      type: "bar", orientation: "h",
      marker: { color: rg.map(r => r.rev_g >= 0 ? "#2ca02c" : "#d62728").reverse() },
      text: rg.map(r => r.rev_g.toFixed(1) + "%").reverse(), textposition: "outside",
      hovertemplate: "%{y}<br>매출: " + fromY + " → " + toY + " " + "%{x:+.1f}%<extra></extra>",
    }], { xaxis: { title: `Revenue ${fromY} → ${toY} YoY (%)`, zeroline: true }, margin: { l: 220, r: 80, t: 10, b: 40 }, height: Math.max(400, rg.length * 22 + 80) });

    // 순이익 성장
    const npg = [...growthRows].filter(r => r.np_g != null).sort((a, b) => b.np_g - a.np_g);
    plot("ov-grow-np", [{
      x: npg.map(r => Math.max(-500, Math.min(500, r.np_g))).reverse(),  // clamp ±500
      y: npg.map(r => r.short).reverse(),
      type: "bar", orientation: "h",
      marker: { color: npg.map(r => r.np_g >= 0 ? "#2ca02c" : "#d62728").reverse() },
      text: npg.map(r => r.np_g >= 500 ? ">500%" : r.np_g <= -500 ? "<-500%" : r.np_g.toFixed(0) + "%").reverse(),
      textposition: "outside",
      hovertemplate: "%{y}<br>순이익: " + fromY + " " + "%{customdata[0]} bn → " + toY + " %{customdata[1]} bn<br>YoY %{customdata[2]:+.1f}%<extra></extra>",
      customdata: npg.map(r => [Math.round(r.np0).toLocaleString(), Math.round(r.np1).toLocaleString(), r.np_g]).reverse(),
    }], { xaxis: { title: `Net profit ${fromY} → ${toY} YoY (%), clamp ±500%`, zeroline: true }, margin: { l: 220, r: 80, t: 10, b: 40 }, height: Math.max(400, npg.length * 22 + 80) });

    // Growth × Margin scatter
    const gm = growthRows.filter(r => r.rev_g != null && r.margin != null);
    plot("ov-grow-margin", [{
      x: gm.map(r => r.rev_g), y: gm.map(r => r.margin),
      mode: "markers+text", type: "scatter",
      text: gm.map(r => r.short), textposition: "top center", textfont: { size: 9 },
      marker: {
        size: gm.map(r => Math.max(10, Math.min(50, Math.sqrt(r.revenue || 100) / 4))),
        color: gm.map(r => REGION_COLOR[r.region] || "#7f7f7f"),
        opacity: 0.75, line: { color: "#fff", width: 1 },
      },
      hovertemplate: "%{text}<br>매출 YoY %{x:+.1f}%<br>순이익률 %{y:.1f}%<extra></extra>",
    }], {
      xaxis: { title: `Revenue YoY (%) — ${fromY}→${toY}`, zeroline: true },
      yaxis: { title: "Net margin (%)", zeroline: true },
      margin: { l: 60, r: 20, t: 10, b: 50 }, height: 480, showlegend: false,
    });
  };
  pairSel.addEventListener("change", renderGrowth);
  renderGrowth();

  // ── ⑪ Per-Share & 주가 시계열
  const psSel = document.getElementById("ov-ps-metric");
  const PS_LABEL = { eps: "EPS", nav: "NAV/share", div_total: "DPS Total", px: "종가" };

  const renderPS = () => {
    const m = psSel.value;
    // 전사 multi-line
    const traces = companies.map(co => {
      const series = fin.filter(r => r.short === co).sort((a, b) => a.yr.localeCompare(b.yr));
      return {
        x: series.map(r => r.yr), y: series.map(r => r[m]),
        name: co, type: "scatter", mode: "lines+markers",
        line: { color: colorMap[co], width: 1.5 }, marker: { color: colorMap[co], size: 5 },
      };
    }).filter(t => t.y.some(v => v != null));
    plot("ov-ps-ts", traces, {
      yaxis: { title: `${PS_LABEL[m]} (IDR/share)`, zeroline: true },
      legend: { orientation: "h", y: -0.18, font: { size: 9 } },
      margin: { l: 80, r: 20, t: 10, b: 80 }, height: 480,
    });
  };
  psSel.addEventListener("change", renderPS);
  renderPS();

  // ── ⑮ Peer Comparison
  const peerCoSel = document.getElementById("ov-peer-co");
  const peerBaseSel = document.getElementById("ov-peer-base");
  const peerInfo = document.getElementById("ov-peer-info");
  peerCoSel.innerHTML = companies.map(c => `<option value="${c}">${c}</option>`).join("");

  const PEER_METRICS = [
    { key: "net_margin", label: "Net margin %", fmt: (v) => v.toFixed(2) + "%" },
    { key: "roe", label: "ROE %", fmt: (v) => v.toFixed(2) + "%" },
    { key: "roa", label: "ROA %", fmt: (v) => v.toFixed(2) + "%" },
    { key: "fcf_margin", label: "FCF margin %", fmt: (v) => v.toFixed(2) + "%" },
    { key: "cash_conv", label: "CFO/NP %", fmt: (v) => v.toFixed(0) + "%" },
    { key: "nd_ebitda", label: "ND/EBITDA x", fmt: (v) => v.toFixed(2) + "x" },
    { key: "div_yield", label: "Div Yield %", fmt: (v) => v.toFixed(2) + "%" },
    { key: "quality_score", label: "Quality Score", fmt: (v) => v.toFixed(0) },
  ];

  const median = (arr) => {
    const a = arr.filter(v => v != null && !isNaN(v)).sort((x, y) => x - y);
    if (a.length === 0) return null;
    const m = Math.floor(a.length / 2);
    return a.length % 2 ? a[m] : (a[m-1] + a[m]) / 2;
  };
  const quantile = (arr, q) => {
    const a = arr.filter(v => v != null && !isNaN(v)).sort((x, y) => x - y);
    if (a.length === 0) return null;
    const pos = (a.length - 1) * q;
    const base = Math.floor(pos), rest = pos - base;
    return a[base + 1] != null ? a[base] + rest * (a[base + 1] - a[base]) : a[base];
  };

  const renderPeer = () => {
    const co = peerCoSel.value;
    const target = fin.find(r => r.short === co && r.yr === ly);
    if (!target) return;
    const peerPool = peerBaseSel.value === "region"
      ? fin.filter(r => r.yr === ly && r.region === target.region && r.short !== co)
      : fin.filter(r => r.yr === ly && r.short !== co);
    peerInfo.textContent = `대상 ${co} (${target.region}) · Peer ${peerPool.length}사 · ${ly}`;

    // Delta vs median (%)
    const deltas = PEER_METRICS.map(m => {
      const med = median(peerPool.map(r => r[m.key]));
      const v = target[m.key];
      if (v == null || med == null || med === 0) return { label: m.label, delta: null, raw: v, med };
      const delta = m.key === "nd_ebitda" ? (med - v) / Math.abs(med) * 100 : (v - med) / Math.abs(med) * 100;
      // ND/EBITDA는 낮을수록 좋으므로 부호 반전
      return { label: m.label, delta, raw: v, med };
    });

    plot("ov-peer-delta", [{
      x: deltas.map(d => d.delta).reverse(), y: deltas.map(d => d.label).reverse(),
      type: "bar", orientation: "h",
      marker: { color: deltas.map(d => d.delta == null ? "#999" : d.delta >= 0 ? "#2ca02c" : "#d62728").reverse() },
      text: deltas.map(d => d.delta == null ? "n/a" : (d.delta >= 0 ? "+" : "") + d.delta.toFixed(0) + "%").reverse(),
      textposition: "outside",
      hovertemplate: "%{y}<br>%{x:+.1f}% vs peer median<extra></extra>",
    }], {
      xaxis: { title: `${co} vs peer median (%) — 양수=좋음, ND/EBITDA는 부호 반전`, zeroline: true },
      margin: { l: 160, r: 80, t: 10, b: 50 }, height: 380,
    });

    // 절대값 비교: target, peer median, peer top quartile
    const absBars = PEER_METRICS.map(m => {
      const peerVals = peerPool.map(r => r[m.key]).filter(v => v != null);
      // Top quartile: ND/EBITDA는 낮은 게 좋으니 25th percentile
      const isLowerBetter = m.key === "nd_ebitda";
      return {
        label: m.label,
        target: target[m.key],
        med: median(peerVals),
        top: quantile(peerVals, isLowerBetter ? 0.25 : 0.75),
      };
    });
    plot("ov-peer-abs", [
      { x: absBars.map(b => b.label), y: absBars.map(b => b.target), type: "bar", name: `${co}`, marker: { color: "#1f77b4" } },
      { x: absBars.map(b => b.label), y: absBars.map(b => b.med), type: "bar", name: "Peer median", marker: { color: "#999" } },
      { x: absBars.map(b => b.label), y: absBars.map(b => b.top), type: "bar", name: "Peer top quartile", marker: { color: "#2ca02c" } },
    ], {
      barmode: "group", yaxis: { title: "지표 값 (단위는 지표별 상이)", zeroline: true },
      xaxis: { tickangle: -20, automargin: true },
      legend: { orientation: "h", y: -0.2 },
      margin: { l: 70, r: 20, t: 10, b: 100 }, height: 480,
    });
  };
  peerCoSel.addEventListener("change", renderPeer);
  peerBaseSel.addEventListener("change", renderPeer);
  renderPeer();

  // Top 10 EPS 시계열 (기준연도 EPS 상위)
  const lyEps = fin.filter(r => r.yr === ly && r.eps != null).sort((a, b) => b.eps - a.eps).slice(0, 10).map(r => r.short);
  const epsTraces = lyEps.map(co => {
    const series = fin.filter(r => r.short === co).sort((a, b) => a.yr.localeCompare(b.yr));
    return {
      x: series.map(r => r.yr), y: series.map(r => r.eps),
      name: co, type: "scatter", mode: "lines+markers",
      line: { color: colorMap[co], width: 2.5 }, marker: { color: colorMap[co], size: 8 },
    };
  });
  plot("ov-eps-top", epsTraces, {
    yaxis: { title: "EPS (IDR/share)", zeroline: true },
    legend: { orientation: "h", y: -0.18 },
    margin: { l: 80, r: 20, t: 10, b: 60 }, height: 480,
  });

  // DPS 지급 회사 (기준연도)
  const dpsRows = fin.filter(r => r.yr === ly && r.div_total > 0).sort((a, b) => b.div_total - a.div_total);
  plot("ov-dps", [
    { x: dpsRows.map(r => r.short), y: dpsRows.map(r => r.dps_interim || 0), type: "bar", name: "Interim DPS", marker: { color: "#aec7e8" } },
    { x: dpsRows.map(r => r.short), y: dpsRows.map(r => r.dps_final || 0), type: "bar", name: "Final DPS", marker: { color: "#1f77b4" } },
  ], {
    barmode: "stack", yaxis: { title: "DPS (IDR/share)" },
    xaxis: { tickangle: -45, automargin: true },
    legend: { orientation: "h", y: -0.35 }, margin: { l: 70, r: 20, t: 10, b: 130 }, height: 480,
  });
}
