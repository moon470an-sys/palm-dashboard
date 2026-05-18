// 종합 — Annual Report 34사 재무 한눈에 비교.
// IDR bn (10억 루피아) 단위, 기준연도 select 가능.
import { state, kpiHTML, fmtInt, plot, makeTable } from "../data.js";

const fmtBn = (n) => n == null ? "-" : `${Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 })} bn`;
const shortName = (s) => (s || "").replace(/^PT\s+/i, "").replace(/\s+Tbk\.?$/i, "").trim();
const num = (v) => (v == null || v === "" || isNaN(Number(v))) ? null : Number(v);

// core_region 텍스트 → primary region 분류 (가장 먼저 언급된 지역 우선, 다지역이면 Diversified)
const REGION_COLOR = { Sumatra: "#2ca02c", Kalimantan: "#ff7f0e", Java: "#1f77b4", Sulawesi: "#9467bd", Papua: "#d62728", Diversified: "#8c564b", Other: "#7f7f7f" };
const BM_COLOR = { Upstream: "#2ca02c", Integrated: "#1f77b4", Downstream: "#ff7f0e", Other: "#7f7f7f", Unknown: "#cccccc" };
function classifyBM(s) {
  const t = (s || "").trim();
  const m = t.match(/^([A-Za-z]+)/);
  const w = m ? m[1] : "Unknown";
  return ["Upstream", "Integrated", "Downstream", "Other"].includes(w) ? w : "Other";
}
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
      bm_class: classifyBM(cMeta.business_model),
      key_red_flags: cMeta.key_red_flags || "", overall_comment: cMeta.overall_comment || "",
      financial_risk_note: r.financial_risk_note || "", liquidity_note: r.liquidity_note || "",
      planted_ha: planted, ffb_t: ffb, cpo_t: cpo,
      area_sumatra: num(op.sumatra_area_ha) || 0, area_kalimantan: num(op.kalimantan_area_ha) || 0,
      area_sulawesi: num(op.sulawesi_area_ha) || 0, area_other: num(op.other_region_area_ha) || 0,
      mills_n: num(op.mills_count), mill_cap_tph: num(op.mill_capacity_tph),
      ffb_processed_t: num(op.ffb_processed_t), third_party_ffb_t: num(op.third_party_ffb_t),
      rbdpo_t: num(op.rbdpo_production_t) || 0, olein_t: num(op.olein_production_t) || 0,
      stearin_t: num(op.stearin_production_t) || 0, pfad_t: num(op.pfad_production_t) || 0,
      pko_t: num(op.pko_production_t) || 0, pke_t: num(op.pke_production_t) || 0,
      cpo_refinery: num(op.cpo_refinery_count) || 0, pko_refinery: num(op.pko_refinery_count) || 0,
      domestic_pct: num(op.domestic_sales_pct), export_pct: num(op.export_sales_pct),
      mature_ha: num(op.mature_area_ha), immature_ha: num(op.immature_area_ha),
      productive_ha: num(op.productive_age_area_ha), old_ha: num(op.old_age_area_ha),
      avg_tree_age: num(op.average_tree_age_years), replanting_ha: num(op.replanting_area_ha),
      nucleus_ha: num(op.nucleus_area_ha), plasma_ha: num(op.plasma_area_ha),
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
    // Margin cascade (모두 % of Revenue)
    r.m_gross = (r.gross_profit != null && r.revenue) ? r.gross_profit / r.revenue * 100 : null;
    r.m_ebitda = (r.ebitda != null && r.revenue) ? r.ebitda / r.revenue * 100 : null;
    r.m_ebit = (r.ebit != null && r.revenue) ? r.ebit / r.revenue * 100 : null;
    r.m_net = (r.net_profit != null && r.revenue) ? r.net_profit / r.revenue * 100 : null;
    // Operating leverage proxy: EBITDA - EBIT (≈ D&A)
    r.da_implied = (r.ebitda != null && r.ebit != null) ? r.ebitda - r.ebit : null;
    // Working Capital + Asset composition
    const ca2 = num(r.current_assets_idr_bn);
    const cl2 = num(r.current_liabilities_idr_bn);
    const nca = num(r.non_current_assets_idr_bn);
    r.nwc = (ca2 != null && cl2 != null) ? ca2 - cl2 : null;
    r.nwc_per_rev = (r.nwc != null && r.revenue) ? r.nwc / r.revenue * 100 : null;  // %
    r.ca_share = (ca2 != null && r.assets) ? ca2 / r.assets * 100 : null;
    r.nca_share = (nca != null && r.assets) ? nca / r.assets * 100 : null;
    r.cash_share = (r.cash != null && r.assets) ? r.cash / r.assets * 100 : null;
    // Liability maturity
    const ltl = num(r.long_term_liabilities_idr_bn);
    const ctl = num(r.current_liabilities_idr_bn);
    const tlTot = (ltl != null && ctl != null) ? ltl + ctl : null;
    r.ltl = ltl; r.ctl_bn = ctl;
    r.lt_share = (tlTot && ltl != null) ? ltl / tlTot * 100 : null;  // long-term share of total liabilities
    r.st_share = (tlTot && ctl != null) ? ctl / tlTot * 100 : null;
    r.st_to_equity = (ctl != null && r.equity && r.equity > 0) ? ctl / r.equity : null;  // short-term burden vs equity
    // Downstream Integration Score 0-6 (refinery count + refined product 가짓수)
    r.downstream_score = (r.cpo_refinery > 0 ? 1 : 0) + (r.pko_refinery > 0 ? 1 : 0)
      + (r.rbdpo_t > 0 ? 1 : 0) + (r.olein_t > 0 ? 1 : 0)
      + (r.stearin_t > 0 ? 1 : 0) + (r.pfad_t > 0 ? 1 : 0);
    r.refined_total_t = (r.rbdpo_t || 0) + (r.olein_t || 0) + (r.stearin_t || 0) + (r.pfad_t || 0);
    r.refined_per_cpo = (r.refined_total_t > 0 && r.cpo_t > 0) ? r.refined_total_t / r.cpo_t * 100 : null;
    // Tree maturity ratios
    const mTot = (r.mature_ha || 0) + (r.immature_ha || 0);
    r.mature_share = mTot > 0 ? r.mature_ha / mTot * 100 : null;
    r.immature_share = mTot > 0 ? r.immature_ha / mTot * 100 : null;
    // Nucleus vs Plasma
    const npTot = (r.nucleus_ha || 0) + (r.plasma_ha || 0);
    r.plasma_share = npTot > 0 ? r.plasma_ha / npTot * 100 : null;
    // Per-mature-ha efficiency (immature 제외, 실제 생산기만)
    r.rev_per_mature_ha = (r.revenue && r.mature_ha) ? r.revenue * 1e9 / r.mature_ha : null;
    r.cpo_per_mature_ha = (r.cpo_t && r.mature_ha) ? r.cpo_t / r.mature_ha : null;
    r.ebitda_per_planted_ha = (r.ebitda && r.planted_ha) ? r.ebitda * 1e9 / r.planted_ha : null;
    // Mill utilization (assume 8760 hours/year, 100% theoretical = continuous operation)
    r.annual_cap_t = r.mill_cap_tph != null ? r.mill_cap_tph * 8760 : null;
    r.mill_util = (r.ffb_processed_t != null && r.annual_cap_t) ? r.ffb_processed_t / r.annual_cap_t * 100 : null;
    // Third-party FFB dependence
    r.third_party_share = (r.third_party_ffb_t != null && r.ffb_processed_t) ? r.third_party_ffb_t / r.ffb_processed_t * 100 : null;
    r.own_ffb_share = r.third_party_share != null ? 100 - r.third_party_share : null;
    // Dividend analytics
    const shares = num(r.shares_outstanding_mn);
    r.div_total_bn = (r.div_total != null && shares != null) ? r.div_total * shares / 1000 : null;  // IDR bn
    r.payout_ratio = (r.div_total != null && r.eps != null && r.eps > 0) ? r.div_total / r.eps * 100 : null;  // DPS/EPS %
    r.fcf_div_coverage = (r.div_total_bn != null && r.div_total_bn > 0 && r.fcf != null) ? r.fcf / r.div_total_bn : null;  // FCF can cover N× dividend
    // Capital allocation: CFO → CapEx + Div + Retained
    if (r.cfo != null && r.cfo > 0) {
      const capex = r.capex || 0;
      const div = r.div_total_bn || 0;
      const retained = r.cfo - capex - div;
      r.cap_capex_share = capex / r.cfo * 100;
      r.cap_div_share = div / r.cfo * 100;
      r.cap_retained_share = retained / r.cfo * 100;
      r.payout_total = (capex + div) / r.cfo * 100;  // total deployment %
    } else {
      r.cap_capex_share = null; r.cap_div_share = null; r.cap_retained_share = null; r.payout_total = null;
    }
    // Cash position ratios
    r.cash_to_mcap = (r.cash != null && r.mcap && r.mcap > 0) ? r.cash / r.mcap * 100 : null;  // Cash yield %
    r.cash_ratio = (r.cash != null && r.ctl_bn && r.ctl_bn > 0) ? r.cash / r.ctl_bn : null;  // Cash / Current Liab
    r.cash_to_debt = (r.cash != null && r.debt && r.debt > 0) ? r.cash / r.debt * 100 : null;  // Cash vs Gross Debt %
    // Tax + Interest burden (NP / EBIT %) — 효율 측정
    r.np_to_ebit = (r.net_profit != null && r.ebit && r.ebit > 0) ? r.net_profit / r.ebit * 100 : null;
    r.burden_share = r.np_to_ebit != null ? 100 - r.np_to_ebit : null;  // 잃은 비율 (세금+이자)
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

    <h3 class="section-h">⑱ Margin Cascade — Gross → EBITDA → EBIT → Net</h3>
    <p class="notice">
      매출 100%에서 각 단계까지의 잔존률. Gross → EBITDA 차이 = SG&A · EBITDA → EBIT 차이 = 감가상각(D&A) · EBIT → Net 차이 = 이자·세금.
    </p>
    <div class="card"><h3>회사별 4-단계 마진 동시 비교 (정렬: Net Margin desc)</h3><div id="ov-margin-cascade" class="plot plot-tall"></div></div>
    <div class="grid-2">
      <div class="card"><h3>Gross → Net 변환율 (회사별 마진 손실 폭)</h3><div id="ov-margin-loss" class="plot plot-tall"></div></div>
      <div class="card"><h3>EBITDA Margin × EBIT Margin scatter (operating leverage proxy)</h3><div id="ov-eb-scatter" class="plot plot-tall"></div></div>
    </div>

    <h3 class="section-h">⑲ Multi-Year 평균 (최근 3년) — Consistency 분석</h3>
    <p class="notice">
      최근 3개 annual 보고기간 평균 ROE / Net Margin / FCF Margin / Net Debt-EBITDA + 표준편차로 "꾸준한 회사" vs "변동 큰 회사" 식별.
    </p>
    <div class="grid-2">
      <div class="card"><h3>3yr 평균 ROE — Smoother 수익성</h3><div id="ov-avg-roe" class="plot plot-tall"></div></div>
      <div class="card"><h3>3yr 평균 Net Margin</h3><div id="ov-avg-margin" class="plot plot-tall"></div></div>
    </div>
    <div class="card"><h3>3yr 평균 vs 변동성(StdDev) — Consistency Map</h3><div id="ov-consistency" class="plot plot-tall"></div></div>

    <h3 class="section-h">⑳ Working Capital & 자산 구성</h3>
    <p class="notice">
      NWC (Net Working Capital) = 유동자산 − 유동부채. NWC/Revenue 높으면 운전자금에 매출 묶임. 자산 구성 = 유동/비유동/현금 비중 (plantation 회사는 비유동 ↑가 정상).
    </p>
    <div class="grid-2">
      <div class="card"><h3>NWC (IDR bn) — 회사별 운전자금 규모</h3><div id="ov-nwc" class="plot plot-tall"></div></div>
      <div class="card"><h3>NWC / Revenue (%) — 운전자금 강도</h3><div id="ov-nwc-rev" class="plot plot-tall"></div></div>
    </div>
    <div class="card"><h3>자산 구성 — Current / Non-Current / Cash (100% stacked)</h3><div id="ov-asset-mix" class="plot plot-tall"></div></div>

    <h3 class="section-h">㉑ Downstream Integration — 정제·다운스트림 통합도</h3>
    <p class="notice">
      0-6점: CPO refinery + PKO refinery + RBDPO/Olein/Stearin/PFAD 생산 가짓수. 높을수록 수직 통합 (upstream→downstream).
      Refined/CPO = 정제유 생산량 / CPO 생산량 (downstream 변환율).
    </p>
    <div class="grid-2">
      <div class="card"><h3>Downstream Integration Score 0–6</h3><div id="ov-dsi" class="plot plot-tall"></div></div>
      <div class="card"><h3>회사별 정제유 mix (RBDPO/Olein/Stearin/PFAD/PKO)</h3><div id="ov-refined-mix" class="plot plot-tall"></div></div>
    </div>
    <div class="card"><h3>Domestic vs Export 매출 비중 (operations 보고된 회사)</h3><div id="ov-dom-exp" class="plot plot-tall"></div></div>

    <h3 class="section-h">㉒ Tree Age & Replanting Profile</h3>
    <p class="notice">
      Mature(생산기) vs Immature(미성숙기) 비중 + 평균 수령(years) + Plasma(외부 smallholder) 비중. Mature 비중↑이면 단기 생산↑ 하지만 노후 위험↑.
    </p>
    <div class="card"><h3>Mature vs Immature 비중 (회사별)</h3><div id="ov-maturity" class="plot plot-tall"></div></div>
    <div class="grid-2">
      <div class="card"><h3>평균 Tree Age (years) — 노화 ranking</h3><div id="ov-tree-age" class="plot plot-tall"></div></div>
      <div class="card"><h3>Nucleus vs Plasma 비중 — Smallholder 통합도</h3><div id="ov-nuc-plasma" class="plot plot-tall"></div></div>
    </div>

    <h3 class="section-h">㉓ OER & CPO Price — 공장 효율 + 판가 spread</h3>
    <p class="notice">
      OER (Oil Extraction Rate, %) = CPO / FFB 처리량. 업계 평균 21-23%. 평균 CPO 판매가(IDR/kg)는 회사별 마켓 포지셔닝 + 품질 + 계약 구조 차이.
    </p>
    <div class="grid-2">
      <div class="card"><h3>OER (%) — 공장 추출 효율</h3><div id="ov-oer" class="plot plot-tall"></div></div>
      <div class="card"><h3>평균 CPO 판매가 (IDR/kg)</h3><div id="ov-cpo-price" class="plot plot-tall"></div></div>
    </div>
    <div class="card"><h3>OER × Net Margin scatter (효율이 수익성에 영향?)</h3><div id="ov-oer-margin" class="plot plot-tall"></div></div>

    <h3 class="section-h">㉔ Mill Utilization & Third-party FFB</h3>
    <p class="notice">
      Mill Utilization (%) = FFB processed / (capacity tph × 8760h). 30-50% = 정상, 60%+ = 풀가동.
      Third-party FFB share = 외부 plasma/협력 농장 FFB / 총 처리 FFB. 100%에 가까울수록 자체 plantation 없이 가공 중심.
    </p>
    <div class="grid-2">
      <div class="card"><h3>Mill Utilization (%) ranking</h3><div id="ov-mill-util" class="plot plot-tall"></div></div>
      <div class="card"><h3>Third-party FFB Share (%) — 외부 FFB 의존도</h3><div id="ov-third-party" class="plot plot-tall"></div></div>
    </div>
    <div class="card"><h3>Mill Capacity (tph) × FFB Production scatter — 자체 FFB가 mill capacity 충족?</h3><div id="ov-cap-prod" class="plot plot-tall"></div></div>

    <h3 class="section-h">㉕ Business Model Cluster — Upstream / Integrated / Downstream / Other</h3>
    <p class="notice">
      회사 메타 business_model 필드 기준 4그룹: Upstream(plantation+mill), Integrated(+downstream refinery), Downstream(가공/유통 중심), Other(다업종/지원사업).
    </p>
    <div class="grid-2">
      <div class="card"><h3>Cluster별 회사 수 + 매출 합 (기준연도)</h3><div id="ov-bm-bar" class="plot plot-tall"></div></div>
      <div class="card"><h3>Cluster별 평균 ROE / Net Margin / Quality</h3><div id="ov-bm-eff" class="plot plot-tall"></div></div>
    </div>
    <div class="card"><h3>Cluster × Region 매트릭스 — 회사 수 (양방향 분포)</h3><div id="ov-bm-region" class="plot plot-tall"></div></div>

    <h3 class="section-h">㉖ Cash Flow Waterfall — 회사 select × 5단계 분해</h3>
    <p class="notice">
      Revenue → EBITDA → CFO → FCF → 배당 후 Retained. 각 단계 누적 잔존 시각화. 회사 select로 개별 회사 분석 가능.
    </p>
    <div class="filter-bar">
      <label>회사:</label>
      <select id="ov-wf-co"></select>
      <span class="badge" id="ov-wf-info"></span>
    </div>
    <div class="card"><h3>Waterfall: Revenue → 단계별 cash 흐름</h3><div id="ov-waterfall" class="plot plot-tall"></div></div>
    <div class="card"><h3>FCF Conversion 전체 비교 — Revenue → FCF 변환율 (FCF / Revenue %)</h3><div id="ov-fcf-conv" class="plot plot-tall"></div></div>

    <h3 class="section-h">㉗ Liability Maturity — 단기 vs 장기 부채</h3>
    <p class="notice">
      Short-term liab 비중 ↑ 이면 refinancing 위험 ↑. Short-term liab / Equity 가 1.0 이상이면 단기 부담 큼.
    </p>
    <div class="card"><h3>회사별 부채 만기 구성 (100% stacked) — Current vs Long-term</h3><div id="ov-mat-stack" class="plot plot-tall"></div></div>
    <div class="grid-2">
      <div class="card"><h3>Short-term Liab / Equity (x) — 단기 부담</h3><div id="ov-stl-eq" class="plot plot-tall"></div></div>
      <div class="card"><h3>Long-term Liab 절대값 (IDR bn) ranking</h3><div id="ov-ltl-abs" class="plot plot-tall"></div></div>
    </div>

    <h3 class="section-h">㉘ Dividend Analytics — 배당 정책 & 지속 가능성</h3>
    <p class="notice">
      Payout Ratio = DPS / EPS (%). 30-60% = 정상, 100%↑ = 이익 초과 배당 위험.
      FCF / Div Coverage = FCF / 총 배당. 1.5x 이상이면 배당 지속 안정적.
    </p>
    <div class="grid-2">
      <div class="card"><h3>Payout Ratio (DPS/EPS %) 랭킹</h3><div id="ov-payout" class="plot plot-tall"></div></div>
      <div class="card"><h3>Dividend Total (IDR bn) 랭킹 — 총 배당 규모</h3><div id="ov-div-bn" class="plot plot-tall"></div></div>
    </div>
    <div class="card"><h3>FCF / Dividend Coverage (x) — 배당 지속 가능성</h3><div id="ov-fcf-cov" class="plot plot-tall"></div></div>

    <h3 class="section-h">㉙ Profitability Stability — 흑자 지속성 & 변동 계수</h3>
    <p class="notice">
      전 기간 회사별 흑자/적자 연수 카운트 + Net Profit 변동 계수(CV = StdDev / |Mean|). CV ↑이면 변동 큰 회사.
    </p>
    <div class="grid-2">
      <div class="card"><h3>흑자/적자 연수 (전 기간)</h3><div id="ov-profit-years" class="plot plot-tall"></div></div>
      <div class="card"><h3>Net Profit 변동 계수 (CV) — 변동성 ranking</h3><div id="ov-np-cv" class="plot plot-tall"></div></div>
    </div>
    <div class="card"><h3>흑자 지속률 vs 평균 NP (영구 흑자 유지하면서 큰 이익 = 우량주)</h3><div id="ov-profit-quad" class="plot plot-tall"></div></div>

    <h3 class="section-h">㉚ Capital Allocation Map — CFO를 어디에 쓰나</h3>
    <p class="notice">
      CFO = CapEx (성장 재투자) + Dividend (주주 환원) + Retained (Cash 누적). 100% stacked로 자본 사용 패턴 식별.
      Reinvestment Rate (CapEx/CFO) ↑ = Growth firm · Return Rate (Div/CFO) ↑ = Mature/Income firm.
    </p>
    <div class="card"><h3>CFO 분해 (100% stacked) — CapEx / Dividend / Retained</h3><div id="ov-cap-alloc" class="plot plot-tall"></div></div>
    <div class="grid-2">
      <div class="card"><h3>Reinvestment vs Return scatter — Growth vs Income</h3><div id="ov-reinv-return" class="plot plot-tall"></div></div>
      <div class="card"><h3>Total Deployment (CapEx+Div) / CFO % — Cash Burn 위험</h3><div id="ov-deploy" class="plot plot-tall"></div></div>
    </div>

    <h3 class="section-h">㉛ Asset Turnover Trend — 자산 효율 다년 변화</h3>
    <p class="notice">
      Asset Turnover = Revenue / Total Assets. 시간에 따라 ↑이면 자산 활용 효율 개선, ↓이면 악화 (자산 늘었는데 매출 못 따라옴).
    </p>
    <div class="card"><h3>Top 8 Asset Turnover 시계열 (기준연도 상위)</h3><div id="ov-at-top" class="plot plot-tall"></div></div>
    <div class="grid-2">
      <div class="card"><h3>Asset Turnover 개선 폭 (latest − first annual) 랭킹</h3><div id="ov-at-improve" class="plot plot-tall"></div></div>
      <div class="card"><h3>최신 vs 첫 연도 Asset Turnover — Slope 차트</h3><div id="ov-at-slope" class="plot plot-tall"></div></div>
    </div>

    <h3 class="section-h">㉜ Earnings Quality Trend — CFO vs Net Profit 다년 비교</h3>
    <p class="notice">
      이상적 회사: CFO ≈ Net Profit (이익이 현금으로 잘 전환). CFO ≪ NP = 매출채권/재고 누적 (현금화 지연). CFO ≫ NP = 비현금 비용 큼.
      Avg CFO/NP 100% 근처 + 변동 작으면 earnings quality 우수.
    </p>
    <div class="card"><h3>Top 8 회사 CFO vs NP overlay (기준연도 NP 상위)</h3><div id="ov-eq-overlay" class="plot plot-tall"></div></div>
    <div class="grid-2">
      <div class="card"><h3>다년 평균 CFO/NP (%) — Quality 지속성</h3><div id="ov-eq-avg" class="plot plot-tall"></div></div>
      <div class="card"><h3>CFO vs NP divergence — 누적 차이 (CFO 합 − NP 합) bn</h3><div id="ov-eq-div" class="plot plot-tall"></div></div>
    </div>

    <h3 class="section-h">㉝ CapEx Cycle — 다년 투자 사이클 패턴</h3>
    <p class="notice">
      CapEx 다년 변화로 회사의 expansion vs harvest phase 식별. 최근/평균 CapEx 비율: 1.5x+ = 증액 사이클, 0.5x↓ = 감액 사이클.
    </p>
    <div class="card"><h3>Top 8 CapEx 회사 다년 시계열 (전 기간 합산 상위)</h3><div id="ov-capex-trend" class="plot plot-tall"></div></div>
    <div class="grid-2">
      <div class="card"><h3>최근/평균 CapEx (x) — Expansion vs Harvest</h3><div id="ov-capex-cycle" class="plot plot-tall"></div></div>
      <div class="card"><h3>총 누적 CapEx (전 기간 IDR bn) ranking</h3><div id="ov-capex-cum" class="plot plot-tall"></div></div>
    </div>

    <h3 class="section-h">㉞ EBITDA Margin Trend — 마진 진화</h3>
    <p class="notice">
      EBITDA Margin 다년 변화로 비즈니스 효율 개선 vs 악화 추적. Top 8 라인 + 개선 폭 ranking + slope (first vs latest).
    </p>
    <div class="card"><h3>Top 8 EBITDA Margin 회사 시계열 (기준연도 상위)</h3><div id="ov-ebmt-top" class="plot plot-tall"></div></div>
    <div class="grid-2">
      <div class="card"><h3>EBITDA Margin 개선 폭 (latest − first pp)</h3><div id="ov-ebmt-delta" class="plot plot-tall"></div></div>
      <div class="card"><h3>EBITDA Margin Slope — first vs latest</h3><div id="ov-ebmt-slope" class="plot plot-tall"></div></div>
    </div>

    <h3 class="section-h">㉟ Cash Position — Cash 보유 & 유동성 안전 지표</h3>
    <p class="notice">
      Cash / Market Cap = "Cash Yield" (시총 대비 보유 현금). Cash Ratio = Cash / Current Liab (단기 부채 즉시 상환 능력).
    </p>
    <div class="grid-2">
      <div class="card"><h3>Cash Balance (IDR bn) ranking</h3><div id="ov-cash-bal" class="plot plot-tall"></div></div>
      <div class="card"><h3>Cash / Market Cap (%) — Cash Yield</h3><div id="ov-cash-mcap" class="plot plot-tall"></div></div>
    </div>
    <div class="card"><h3>Cash Ratio (Cash / Current Liab) — 즉시 상환 능력</h3><div id="ov-cash-ratio" class="plot plot-tall"></div></div>

    <h3 class="section-h">㊱ Industry Concentration — Top 5 vs Long Tail</h3>
    <p class="notice">
      매출 누적 % 곡선으로 산업 집중도 시각화. Top 5 vs 나머지 share, 분위별 분포로 IDX 팜 산업 구조 파악.
    </p>
    <div class="card"><h3>Cumulative Revenue Share Curve — Top → Bottom</h3><div id="ov-conc-curve" class="plot plot-tall"></div></div>
    <div class="grid-2">
      <div class="card"><h3>Top 5 / Top 10 / Long Tail share</h3><div id="ov-conc-pie" class="plot plot-tall"></div></div>
      <div class="card"><h3>매출 분위별 평균 (5분위)</h3><div id="ov-conc-quintile" class="plot plot-tall"></div></div>
    </div>

    <h3 class="section-h">㊲ Net Debt Decomposition — Gross Debt vs Cash</h3>
    <p class="notice">
      Net Debt = Gross Debt − Cash. Cash가 Gross Debt 초과 시 Net Cash 상태 (negative net debt). 회사별 부채 vs 현금 양방향 시각화.
    </p>
    <div class="card"><h3>Gross Debt vs Cash 양방향 (회사별, 음수=Cash, 양수=Debt)</h3><div id="ov-nd-decomp" class="plot plot-tall"></div></div>
    <div class="grid-2">
      <div class="card"><h3>Cash / Gross Debt (%) — 부채 대비 현금 보유</h3><div id="ov-cash-debt" class="plot plot-tall"></div></div>
      <div class="card"><h3>Net Cash vs Net Debt 분류 (회사 수)</h3><div id="ov-netcash-pie" class="plot plot-tall"></div></div>
    </div>

    <h3 class="section-h">㊳ Revenue Trend & Stability — 매출 시계열 변동</h3>
    <p class="notice">
      회사별 매출 다년 변화 + 변동 계수(CV) + CAGR. 안정/성장 회사 식별.
    </p>
    <div class="card"><h3>Top 12 매출 회사 시계열 (annual years)</h3><div id="ov-rev-top" class="plot plot-tall"></div></div>
    <div class="grid-2">
      <div class="card"><h3>Revenue CV (변동 계수) — 매출 안정성</h3><div id="ov-rev-cv" class="plot plot-tall"></div></div>
      <div class="card"><h3>Revenue CAGR (전 기간) — 장기 성장률</h3><div id="ov-rev-cagr" class="plot plot-tall"></div></div>
    </div>

    <h3 class="section-h">㊴ Quarterly Snapshot — 2026 Q1 가장 최신 데이터</h3>
    <p class="notice">
      2026 Q1 보고된 회사 단일 분기 매출/순이익. Annualized = Q1 × 4 (단순 추정, seasonality 미반영). 2025 full-year와 비교.
    </p>
    <div class="grid-2">
      <div class="card"><h3>2026 Q1 매출 ranking</h3><div id="ov-q1-rev" class="plot plot-tall"></div></div>
      <div class="card"><h3>2026 Q1 순이익 ranking (음수 포함)</h3><div id="ov-q1-np" class="plot plot-tall"></div></div>
    </div>
    <div class="card"><h3>2026 Q1 Annualized (×4) vs 2025 Full-Year — 가속/감속</h3><div id="ov-q1-annualized" class="plot plot-tall"></div></div>

    <h3 class="section-h">㊵ Market Cap 다년 변화</h3>
    <p class="notice">
      회사별 시가총액 (shares × closing price) 다년 변화. 시장의 평가 변화 + 시총 CAGR로 주가 성과 비교.
    </p>
    <div class="card"><h3>Top 12 시가총액 회사 시계열 (annual years)</h3><div id="ov-mcap-top" class="plot plot-tall"></div></div>
    <div class="grid-2">
      <div class="card"><h3>Market Cap CAGR (전 기간) — 주가 성과</h3><div id="ov-mcap-cagr" class="plot plot-tall"></div></div>
      <div class="card"><h3>최신 / 첫 mcap 비율 (x) — 시총 배수</h3><div id="ov-mcap-mult" class="plot plot-tall"></div></div>
    </div>

    <h3 class="section-h">㊶ Margin Compression Detector</h3>
    <p class="notice">
      Gross + Net margin 동시 감소 회사 = 비용 압박 + 마진 saved 등 구조적 문제. 양쪽 모두 −pp 큰 회사 위험.
    </p>
    <div class="card"><h3>Gross Δ × Net Δ scatter — 4분면 (좌하단=동시 압축)</h3><div id="ov-compr-quad" class="plot plot-tall"></div></div>
    <div class="grid-2">
      <div class="card"><h3>Gross Margin Δ ranking (latest − first pp)</h3><div id="ov-gm-delta" class="plot plot-tall"></div></div>
      <div class="card"><h3>Net Margin Δ ranking (latest − first pp)</h3><div id="ov-nm-delta" class="plot plot-tall"></div></div>
    </div>

    <h3 class="section-h">㊷ 단위 면적당 효율 — Revenue/Mature ha · CPO/Mature ha · EBITDA/Planted ha</h3>
    <p class="notice">
      Planted ha 전체가 아닌 생산 가능한 Mature ha 기준으로 효율 측정. EBITDA per planted ha는 운영 마진 기준.
    </p>
    <div class="grid-2">
      <div class="card"><h3>Revenue / Mature ha (IDR M/ha)</h3><div id="ov-rev-mat" class="plot plot-tall"></div></div>
      <div class="card"><h3>CPO / Mature ha (ton/ha) — 진짜 yield</h3><div id="ov-cpo-mat" class="plot plot-tall"></div></div>
    </div>
    <div class="card"><h3>EBITDA / Planted ha (IDR M/ha) — 운영 수익 효율</h3><div id="ov-ebitda-ha" class="plot plot-tall"></div></div>

    <h3 class="section-h">㊸ Quality vs Valuation — 저평가 우량주 식별</h3>
    <p class="notice">
      Quality Score (높을수록 좋음) × P/E (낮을수록 저평가) 매트릭스. 좌상단 = 저평가 우량주 (Hidden Gem). 우하단 = 고평가 부실주 (피해야 함).
    </p>
    <div class="card"><h3>Quality × P/E 4분면 (Hidden Gem 식별)</h3><div id="ov-qv-pe" class="plot plot-tall"></div></div>
    <div class="grid-2">
      <div class="card"><h3>Quality × P/B 4분면</h3><div id="ov-qv-pb" class="plot plot-tall"></div></div>
      <div class="card"><h3>Quality × Dividend Yield 4분면 (Quality + Income)</h3><div id="ov-qv-dy" class="plot plot-tall"></div></div>
    </div>

    <h3 class="section-h">㊹ Tax & Interest Burden — EBIT → NP 전환율</h3>
    <p class="notice">
      NP/EBIT 비율 = EBIT 100원이 NP로 얼마나 남는가. 80%+ 효율 · 50-80% 정상 · 50%↓ 세금/이자 부담 큼. 음수 = 적자.
    </p>
    <div class="grid-2">
      <div class="card"><h3>NP / EBIT (%) 랭킹 — 효율 (양수만)</h3><div id="ov-np-ebit" class="plot plot-tall"></div></div>
      <div class="card"><h3>Burden Share (1 − NP/EBIT) % — 세금+이자 손실</h3><div id="ov-burden" class="plot plot-tall"></div></div>
    </div>
    <div class="card"><h3>EBIT vs NP scatter (이상: y=x 라인 가까이, 멀수록 부담 큼)</h3><div id="ov-ebit-np" class="plot plot-tall"></div></div>

    <h3 class="section-h">㊺ 종합 Ranking 테이블</h3>
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

    // ── ㊹ Tax & Interest Burden
    const neRows = rows.filter(r => r.np_to_ebit != null && r.np_to_ebit > 0).sort((a, b) => b.np_to_ebit - a.np_to_ebit);
    plot("ov-np-ebit", [{
      x: neRows.map(r => Math.min(150, r.np_to_ebit)).reverse(), y: neRows.map(r => r.short).reverse(),
      type: "bar", orientation: "h",
      marker: { color: neRows.map(r => r.np_to_ebit >= 80 ? "#2ca02c" : r.np_to_ebit >= 50 ? "#1f77b4" : r.np_to_ebit >= 25 ? "#ffbb78" : "#d62728").reverse() },
      text: neRows.map(r => r.np_to_ebit > 150 ? ">150%" : r.np_to_ebit.toFixed(1) + "%").reverse(), textposition: "outside",
    }], { xaxis: { title: "NP / EBIT (%) — 80%+ 우수 · 50-80% 정상" }, margin: { l: 220, r: 80, t: 10, b: 50 }, height: Math.max(360, neRows.length * 24 + 60) });

    const bsRows = rows.filter(r => r.burden_share != null && r.burden_share >= 0 && r.burden_share <= 200).sort((a, b) => b.burden_share - a.burden_share);
    plot("ov-burden", [{
      x: bsRows.map(r => r.burden_share).reverse(), y: bsRows.map(r => r.short).reverse(),
      type: "bar", orientation: "h",
      marker: { color: bsRows.map(r => r.burden_share <= 20 ? "#2ca02c" : r.burden_share <= 50 ? "#1f77b4" : r.burden_share <= 75 ? "#ffbb78" : "#d62728").reverse() },
      text: bsRows.map(r => r.burden_share.toFixed(1) + "%").reverse(), textposition: "outside",
      hovertemplate: "%{y}<br>세금+이자 손실 %{x:.1f}%<extra></extra>",
    }], { xaxis: { title: "Burden Share (%) — 낮을수록 효율" }, margin: { l: 220, r: 80, t: 10, b: 50 }, height: Math.max(360, bsRows.length * 24 + 60) });

    // EBIT vs NP scatter
    const enRows = rows.filter(r => r.ebit != null && r.net_profit != null);
    const maxV = Math.max(...enRows.map(r => Math.max(Math.abs(r.ebit), Math.abs(r.net_profit))));
    plot("ov-ebit-np", [{
      x: enRows.map(r => r.ebit), y: enRows.map(r => r.net_profit),
      mode: "markers+text", type: "scatter",
      text: enRows.map(r => r.short), textposition: "top center", textfont: { size: 9 },
      marker: {
        size: enRows.map(r => Math.max(10, Math.min(48, Math.sqrt(Math.abs(r.revenue) || 100) / 4))),
        color: enRows.map(r => REGION_COLOR[r.region] || "#7f7f7f"),
        opacity: 0.8, line: { color: "#fff", width: 1 },
      },
      hovertemplate: "%{text}<br>EBIT %{x:,.0f} bn<br>NP %{y:,.0f} bn<extra></extra>",
    }], {
      xaxis: { title: "EBIT (IDR bn)" }, yaxis: { title: "Net Profit (IDR bn)" },
      margin: { l: 70, r: 20, t: 10, b: 50 }, height: 520, showlegend: false,
      shapes: [{ type: "line", x0: -maxV, y0: -maxV, x1: maxV, y1: maxV, line: { color: "#ccc", dash: "dot", width: 1 } }],
    });

    // ── ㊸ Quality vs Valuation 매트릭스
    const QBAND_COLOR_LOCAL = (b) => ({ A: "#2ca02c", B: "#1f77b4", C: "#ffbb78", D: "#d62728" }[b] || "#7f7f7f");
    const qvPe = rows.filter(r => r.quality_score != null && r.pe != null && r.pe > 0 && r.pe < 100);
    plot("ov-qv-pe", [{
      x: qvPe.map(r => r.pe), y: qvPe.map(r => r.quality_score),
      mode: "markers+text", type: "scatter",
      text: qvPe.map(r => r.short), textposition: "top center", textfont: { size: 9 },
      marker: {
        size: qvPe.map(r => Math.max(10, Math.min(48, Math.sqrt(r.mcap || 100) / 4))),
        color: qvPe.map(r => QBAND_COLOR_LOCAL(r.quality_band)),
        opacity: 0.8, line: { color: "#fff", width: 1 },
      },
      hovertemplate: "%{text}<br>P/E %{x:.2f}x<br>Quality %{y:.1f}<extra></extra>",
    }], {
      xaxis: { title: "P/E (낮을수록 저평가)" },
      yaxis: { title: "Quality Score" },
      margin: { l: 60, r: 20, t: 10, b: 50 }, height: 520, showlegend: false,
      annotations: [
        { x: 5, y: 90, text: "Hidden Gem", showarrow: false, font: { color: "#2ca02c", size: 11 } },
        { x: 60, y: 90, text: "Premium Quality", showarrow: false, font: { color: "#1f77b4", size: 11 } },
        { x: 60, y: 10, text: "비싸고 부실", showarrow: false, font: { color: "#d62728", size: 11 } },
      ],
    });

    const qvPb = rows.filter(r => r.quality_score != null && r.pb != null && r.pb > 0 && r.pb < 20);
    plot("ov-qv-pb", [{
      x: qvPb.map(r => r.pb), y: qvPb.map(r => r.quality_score),
      mode: "markers+text", type: "scatter",
      text: qvPb.map(r => r.short), textposition: "top center", textfont: { size: 9 },
      marker: {
        size: qvPb.map(r => Math.max(10, Math.min(48, Math.sqrt(r.mcap || 100) / 4))),
        color: qvPb.map(r => QBAND_COLOR_LOCAL(r.quality_band)),
        opacity: 0.8, line: { color: "#fff", width: 1 },
      },
      hovertemplate: "%{text}<br>P/B %{x:.2f}x<br>Quality %{y:.1f}<extra></extra>",
    }], { xaxis: { title: "P/B (낮을수록 저평가)" }, yaxis: { title: "Quality Score" }, margin: { l: 60, r: 20, t: 10, b: 50 }, height: 480, showlegend: false });

    const qvDy = rows.filter(r => r.quality_score != null && r.div_yield != null && r.div_yield > 0);
    plot("ov-qv-dy", [{
      x: qvDy.map(r => r.div_yield), y: qvDy.map(r => r.quality_score),
      mode: "markers+text", type: "scatter",
      text: qvDy.map(r => r.short), textposition: "top center", textfont: { size: 9 },
      marker: {
        size: qvDy.map(r => Math.max(10, Math.min(48, Math.sqrt(r.mcap || 100) / 4))),
        color: qvDy.map(r => QBAND_COLOR_LOCAL(r.quality_band)),
        opacity: 0.8, line: { color: "#fff", width: 1 },
      },
      hovertemplate: "%{text}<br>Div Yield %{x:.2f}%<br>Quality %{y:.1f}<extra></extra>",
    }], { xaxis: { title: "Dividend Yield (%) — 우측이 고배당" }, yaxis: { title: "Quality Score" }, margin: { l: 60, r: 20, t: 10, b: 50 }, height: 480, showlegend: false });

    // ── ㊷ 단위 면적당 효율 (Mature ha 기준)
    const rmRows = rows.filter(r => r.rev_per_mature_ha != null && r.rev_per_mature_ha > 0).sort((a, b) => b.rev_per_mature_ha - a.rev_per_mature_ha);
    plot("ov-rev-mat", [{
      x: rmRows.map(r => r.rev_per_mature_ha / 1e6).reverse(), y: rmRows.map(r => r.short).reverse(),
      type: "bar", orientation: "h",
      marker: { color: rmRows.map(r => r.rev_per_mature_ha).reverse(), colorscale: "Greens" },
      text: rmRows.map(r => (r.rev_per_mature_ha / 1e6).toFixed(1) + "M").reverse(), textposition: "outside",
    }], { xaxis: { title: "Revenue / Mature ha (IDR mn/ha)" }, margin: { l: 220, r: 80, t: 10, b: 40 }, height: Math.max(360, rmRows.length * 24 + 60) });

    const cmRows2 = rows.filter(r => r.cpo_per_mature_ha != null && r.cpo_per_mature_ha > 0).sort((a, b) => b.cpo_per_mature_ha - a.cpo_per_mature_ha);
    plot("ov-cpo-mat", [{
      x: cmRows2.map(r => r.cpo_per_mature_ha).reverse(), y: cmRows2.map(r => r.short).reverse(),
      type: "bar", orientation: "h",
      marker: { color: cmRows2.map(r => r.cpo_per_mature_ha >= 4 ? "#2ca02c" : r.cpo_per_mature_ha >= 3 ? "#1f77b4" : r.cpo_per_mature_ha >= 2 ? "#ffbb78" : "#d62728").reverse() },
      text: cmRows2.map(r => r.cpo_per_mature_ha.toFixed(2) + " t/ha").reverse(), textposition: "outside",
    }], { xaxis: { title: "CPO / Mature ha (ton/ha) — 4+ 우수" }, margin: { l: 220, r: 80, t: 10, b: 50 }, height: Math.max(360, cmRows2.length * 24 + 60) });

    const ehRows = rows.filter(r => r.ebitda_per_planted_ha != null && r.ebitda_per_planted_ha > 0).sort((a, b) => b.ebitda_per_planted_ha - a.ebitda_per_planted_ha);
    plot("ov-ebitda-ha", [{
      x: ehRows.map(r => r.ebitda_per_planted_ha / 1e6).reverse(), y: ehRows.map(r => r.short).reverse(),
      type: "bar", orientation: "h",
      marker: { color: ehRows.map(r => r.ebitda_per_planted_ha).reverse(), colorscale: "Viridis" },
      text: ehRows.map(r => (r.ebitda_per_planted_ha / 1e6).toFixed(2) + "M").reverse(), textposition: "outside",
    }], { xaxis: { title: "EBITDA / Planted ha (IDR mn/ha)" }, margin: { l: 220, r: 80, t: 10, b: 40 }, height: Math.max(360, ehRows.length * 24 + 60) });

    // ── ㊲ Net Debt Decomposition
    const ndRows2 = rows.filter(r => r.debt != null && r.cash != null).sort((a, b) => (b.debt - b.cash) - (a.debt - a.cash));
    plot("ov-nd-decomp", [
      { x: ndRows2.map(r => r.debt), y: ndRows2.map(r => r.short), type: "bar", orientation: "h", name: "Gross Debt (+)", marker: { color: "#d62728" } },
      { x: ndRows2.map(r => -r.cash), y: ndRows2.map(r => r.short), type: "bar", orientation: "h", name: "Cash (−)", marker: { color: "#2ca02c" } },
    ], {
      barmode: "relative", xaxis: { title: "IDR bn (음수=Cash, 양수=Debt)", zeroline: true },
      legend: { orientation: "h", y: -0.1 },
      margin: { l: 220, r: 40, t: 10, b: 50 }, height: Math.max(400, ndRows2.length * 22 + 60),
    });

    const cdRows = rows.filter(r => r.cash_to_debt != null && r.cash_to_debt > 0).sort((a, b) => b.cash_to_debt - a.cash_to_debt);
    plot("ov-cash-debt", [{
      x: cdRows.map(r => Math.min(500, r.cash_to_debt)).reverse(), y: cdRows.map(r => r.short).reverse(),
      type: "bar", orientation: "h",
      marker: { color: cdRows.map(r => r.cash_to_debt >= 100 ? "#2ca02c" : r.cash_to_debt >= 30 ? "#1f77b4" : r.cash_to_debt >= 10 ? "#ffbb78" : "#d62728").reverse() },
      text: cdRows.map(r => r.cash_to_debt > 500 ? ">500%" : r.cash_to_debt.toFixed(1) + "%").reverse(), textposition: "outside",
    }], { xaxis: { title: "Cash / Gross Debt (%) — 100%↑ = Net Cash position" }, margin: { l: 220, r: 80, t: 10, b: 50 }, height: Math.max(360, cdRows.length * 24 + 60) });

    // Net Cash vs Net Debt pie
    const netCashN = rows.filter(r => r.net_debt != null && r.net_debt < 0).length;
    const lowNDN = rows.filter(r => r.net_debt != null && r.net_debt >= 0 && r.nd_ebitda != null && r.nd_ebitda < 2).length;
    const medND = rows.filter(r => r.nd_ebitda != null && r.nd_ebitda >= 2 && r.nd_ebitda < 4).length;
    const highND = rows.filter(r => r.nd_ebitda != null && r.nd_ebitda >= 4).length;
    plot("ov-netcash-pie", [{
      labels: ["Net Cash", "Net Debt 저 (<2x EBITDA)", "Net Debt 중 (2-4x)", "Net Debt 고 (4x+)"],
      values: [netCashN, lowNDN, medND, highND],
      type: "pie", hole: 0.45,
      marker: { colors: ["#2ca02c", "#1f77b4", "#ffbb78", "#d62728"] },
      textinfo: "label+value+percent",
    }], { margin: { t: 20, b: 20, l: 0, r: 0 }, height: 480 });

    // ── ㊱ Industry Concentration
    const concRows = rows.filter(r => r.revenue > 0).sort((a, b) => b.revenue - a.revenue);
    const totalRev = concRows.reduce((s, r) => s + r.revenue, 0);
    let cum = 0;
    const cumPoints = concRows.map((r, i) => {
      cum += r.revenue;
      return { idx: i + 1, short: r.short, rev: r.revenue, cum, cumPct: cum / totalRev * 100 };
    });
    plot("ov-conc-curve", [{
      x: cumPoints.map(p => p.idx), y: cumPoints.map(p => p.cumPct),
      type: "scatter", mode: "lines+markers",
      line: { color: "#1f77b4", width: 3 }, marker: { color: "#1f77b4", size: 6 },
      text: cumPoints.map(p => p.short), hovertemplate: "#%{x}: %{text}<br>누적 %{y:.1f}%<extra></extra>",
    }], {
      xaxis: { title: "회사 순위 (매출 큰 순)" },
      yaxis: { title: "누적 매출 점유 (%)", range: [0, 105] },
      margin: { l: 70, r: 20, t: 10, b: 50 }, height: 480, showlegend: false,
      shapes: [
        { type: "line", x0: 5, y0: 0, x1: 5, y1: 105, line: { color: "#d62728", dash: "dash", width: 1 } },
        { type: "line", x0: 10, y0: 0, x1: 10, y1: 105, line: { color: "#ff7f0e", dash: "dash", width: 1 } },
      ],
      annotations: [
        { x: 5, y: 50, text: "Top 5", showarrow: false, font: { color: "#d62728" } },
        { x: 10, y: 30, text: "Top 10", showarrow: false, font: { color: "#ff7f0e" } },
      ],
    });

    // Top 5 / Top 6-10 / Long Tail pie
    const top5Sum = cumPoints.slice(0, 5).reduce((s, p) => s + p.rev, 0);
    const top10Sum = cumPoints.slice(0, 10).reduce((s, p) => s + p.rev, 0);
    const next5 = top10Sum - top5Sum;
    const longTail = totalRev - top10Sum;
    plot("ov-conc-pie", [{
      labels: ["Top 5", "Top 6-10", `Long Tail (나머지 ${concRows.length - 10}사)`],
      values: [top5Sum, next5, longTail],
      type: "pie", hole: 0.45,
      marker: { colors: ["#d62728", "#ff7f0e", "#9ca3af"] },
      text: [
        `${(top5Sum/totalRev*100).toFixed(1)}%`,
        `${(next5/totalRev*100).toFixed(1)}%`,
        `${(longTail/totalRev*100).toFixed(1)}%`,
      ],
      textinfo: "label+text", hoverinfo: "label+value+percent",
    }], { margin: { t: 20, b: 20, l: 0, r: 0 }, height: 480 });

    // Quintile bars (5 분위, 가장 큰 → 작은)
    const n = concRows.length;
    const quintileSize = Math.ceil(n / 5);
    const quintiles = [];
    for (let i = 0; i < 5; i++) {
      const chunk = concRows.slice(i * quintileSize, (i + 1) * quintileSize);
      if (chunk.length === 0) continue;
      quintiles.push({
        label: `Q${i + 1}`,
        n: chunk.length,
        sum: chunk.reduce((s, r) => s + r.revenue, 0),
        avg: chunk.reduce((s, r) => s + r.revenue, 0) / chunk.length,
      });
    }
    plot("ov-conc-quintile", [
      { x: quintiles.map(q => `${q.label} (${q.n}사)`), y: quintiles.map(q => q.avg), type: "bar", name: "평균 매출 (bn)", marker: { color: "#1f77b4" } },
      { x: quintiles.map(q => `${q.label} (${q.n}사)`), y: quintiles.map(q => q.sum), type: "scatter", mode: "lines+markers", name: "총 매출 (bn)", line: { color: "#d62728", width: 2 }, yaxis: "y2" },
    ], {
      yaxis: { title: "분위 평균 매출 (IDR bn)" },
      yaxis2: { title: "분위 총 매출 (IDR bn)", overlaying: "y", side: "right" },
      legend: { orientation: "h", y: -0.18 }, margin: { l: 70, r: 60, t: 10, b: 50 }, height: 480,
    });

    // ── ㉟ Cash Position
    const cbRows = rows.filter(r => r.cash != null && r.cash > 0).sort((a, b) => b.cash - a.cash);
    plot("ov-cash-bal", [{
      x: cbRows.map(r => r.cash).reverse(), y: cbRows.map(r => r.short).reverse(),
      type: "bar", orientation: "h",
      marker: { color: cbRows.map(r => r.cash).reverse(), colorscale: "Greens" },
      text: cbRows.map(r => Math.round(r.cash).toLocaleString()).reverse(), textposition: "outside",
    }], { xaxis: { title: "Cash & Equivalents (IDR bn)" }, margin: { l: 220, r: 80, t: 10, b: 40 }, height: Math.max(360, cbRows.length * 24 + 60) });

    const cmRows = rows.filter(r => r.cash_to_mcap != null && r.cash_to_mcap > 0).sort((a, b) => b.cash_to_mcap - a.cash_to_mcap);
    plot("ov-cash-mcap", [{
      x: cmRows.map(r => Math.min(200, r.cash_to_mcap)).reverse(), y: cmRows.map(r => r.short).reverse(),
      type: "bar", orientation: "h",
      marker: { color: cmRows.map(r => r.cash_to_mcap >= 30 ? "#2ca02c" : r.cash_to_mcap >= 10 ? "#1f77b4" : "#ffbb78").reverse() },
      text: cmRows.map(r => r.cash_to_mcap > 200 ? ">200%" : r.cash_to_mcap.toFixed(1) + "%").reverse(), textposition: "outside",
      hovertemplate: "%{y}<br>Cash/Mcap %{x:.2f}%<extra></extra>",
    }], { xaxis: { title: "Cash / Market Cap (%) — 30%↑ = 시총의 1/3 현금" }, margin: { l: 220, r: 80, t: 10, b: 50 }, height: Math.max(360, cmRows.length * 24 + 60) });

    const crRows2 = rows.filter(r => r.cash_ratio != null && r.cash_ratio > 0).sort((a, b) => b.cash_ratio - a.cash_ratio);
    plot("ov-cash-ratio", [{
      x: crRows2.map(r => Math.min(10, r.cash_ratio)).reverse(), y: crRows2.map(r => r.short).reverse(),
      type: "bar", orientation: "h",
      marker: { color: crRows2.map(r => r.cash_ratio >= 1 ? "#2ca02c" : r.cash_ratio >= 0.3 ? "#1f77b4" : r.cash_ratio >= 0.1 ? "#ffbb78" : "#d62728").reverse() },
      text: crRows2.map(r => r.cash_ratio > 10 ? ">10x" : r.cash_ratio.toFixed(2) + "x").reverse(), textposition: "outside",
      hovertemplate: "%{y}<br>Cash Ratio %{x:.2f}x<extra></extra>",
    }], { xaxis: { title: "Cash Ratio (Cash / Current Liab) — 1.0+ 우수 · 0.3+ 정상" }, margin: { l: 220, r: 80, t: 10, b: 50 }, height: Math.max(360, crRows2.length * 24 + 60) });

    // ── ㉚ Capital Allocation
    const caRows = rows.filter(r => r.cap_capex_share != null).sort((a, b) => (b.cfo || 0) - (a.cfo || 0));
    plot("ov-cap-alloc", [
      { x: caRows.map(r => r.short), y: caRows.map(r => r.cap_capex_share), type: "bar", name: "CapEx", marker: { color: "#ff7f0e" } },
      { x: caRows.map(r => r.short), y: caRows.map(r => r.cap_div_share), type: "bar", name: "Dividend", marker: { color: "#1f77b4" } },
      { x: caRows.map(r => r.short), y: caRows.map(r => Math.max(0, r.cap_retained_share)), type: "bar", name: "Retained (≥0)", marker: { color: "#2ca02c" } },
    ], {
      barmode: "stack", yaxis: { title: "% of CFO" },
      xaxis: { tickangle: -45, automargin: true },
      legend: { orientation: "h", y: -0.35 },
      margin: { l: 70, r: 20, t: 10, b: 130 }, height: 480,
    });

    const rrRows = rows.filter(r => r.cap_capex_share != null && r.cap_div_share != null);
    plot("ov-reinv-return", [{
      x: rrRows.map(r => r.cap_capex_share), y: rrRows.map(r => r.cap_div_share),
      mode: "markers+text", type: "scatter",
      text: rrRows.map(r => r.short), textposition: "top center", textfont: { size: 9 },
      marker: {
        size: rrRows.map(r => Math.max(10, Math.min(48, Math.sqrt(Math.abs(r.cfo) || 100) / 4))),
        color: rrRows.map(r => REGION_COLOR[r.region] || "#7f7f7f"),
        opacity: 0.8, line: { color: "#fff", width: 1 },
      },
      hovertemplate: "%{text}<br>CapEx %{x:.1f}%<br>Div %{y:.1f}% (of CFO)<extra></extra>",
    }], {
      xaxis: { title: "Reinvestment (CapEx / CFO %) — Growth" },
      yaxis: { title: "Return (Dividend / CFO %) — Income" },
      margin: { l: 70, r: 20, t: 10, b: 50 }, height: 480, showlegend: false,
      annotations: [
        { x: 75, y: 5, text: "성장형 (재투자)", showarrow: false, font: { color: "#ff7f0e", size: 11 } },
        { x: 10, y: 60, text: "배당주", showarrow: false, font: { color: "#1f77b4", size: 11 } },
      ],
    });

    const dpRows2 = rows.filter(r => r.payout_total != null).sort((a, b) => b.payout_total - a.payout_total);
    plot("ov-deploy", [{
      x: dpRows2.map(r => Math.min(300, r.payout_total)).reverse(), y: dpRows2.map(r => r.short).reverse(),
      type: "bar", orientation: "h",
      marker: { color: dpRows2.map(r => r.payout_total > 100 ? "#d62728" : r.payout_total > 70 ? "#ffbb78" : "#2ca02c").reverse() },
      text: dpRows2.map(r => r.payout_total > 300 ? ">300%" : r.payout_total.toFixed(0) + "%").reverse(), textposition: "outside",
      hovertemplate: "%{y}<br>Deploy %{x:.1f}% (CapEx+Div / CFO)<extra></extra>",
    }], { xaxis: { title: "Total Deployment / CFO (%) — 100%↑ 시 CFO 초과 사용" }, margin: { l: 220, r: 80, t: 10, b: 50 }, height: Math.max(360, dpRows2.length * 24 + 60) });

    // ── ㉘ Dividend Analytics
    const poRows = rows.filter(r => r.payout_ratio != null && r.payout_ratio < 500).sort((a, b) => b.payout_ratio - a.payout_ratio);
    plot("ov-payout", [{
      x: poRows.map(r => r.payout_ratio).reverse(), y: poRows.map(r => r.short).reverse(),
      type: "bar", orientation: "h",
      marker: { color: poRows.map(r => r.payout_ratio > 100 ? "#d62728" : r.payout_ratio >= 30 ? "#2ca02c" : r.payout_ratio >= 0 ? "#ffbb78" : "#9ca3af").reverse() },
      text: poRows.map(r => r.payout_ratio.toFixed(0) + "%").reverse(), textposition: "outside",
      hovertemplate: "%{y}<br>Payout %{x:.1f}%<extra></extra>",
    }], { xaxis: { title: "Payout Ratio (DPS/EPS %) — 30-60% 정상, 100%+ 위험" }, margin: { l: 220, r: 80, t: 10, b: 50 }, height: Math.max(360, poRows.length * 24 + 60) });

    const dbRows = rows.filter(r => r.div_total_bn != null && r.div_total_bn > 0).sort((a, b) => b.div_total_bn - a.div_total_bn);
    plot("ov-div-bn", [{
      x: dbRows.map(r => r.div_total_bn).reverse(), y: dbRows.map(r => r.short).reverse(),
      type: "bar", orientation: "h",
      marker: { color: "#1f77b4" },
      text: dbRows.map(r => Math.round(r.div_total_bn).toLocaleString()).reverse(), textposition: "outside",
      hovertemplate: "%{y}<br>Div Total %{x:,.0f} bn<extra></extra>",
    }], { xaxis: { title: "Total Dividend (IDR bn)" }, margin: { l: 220, r: 80, t: 10, b: 40 }, height: Math.max(360, dbRows.length * 24 + 60) });

    const fdRows = rows.filter(r => r.fcf_div_coverage != null && Math.abs(r.fcf_div_coverage) < 50).sort((a, b) => b.fcf_div_coverage - a.fcf_div_coverage);
    plot("ov-fcf-cov", [{
      x: fdRows.map(r => r.fcf_div_coverage).reverse(), y: fdRows.map(r => r.short).reverse(),
      type: "bar", orientation: "h",
      marker: { color: fdRows.map(r => r.fcf_div_coverage >= 2 ? "#2ca02c" : r.fcf_div_coverage >= 1 ? "#1f77b4" : r.fcf_div_coverage >= 0 ? "#ffbb78" : "#d62728").reverse() },
      text: fdRows.map(r => r.fcf_div_coverage.toFixed(2) + "x").reverse(), textposition: "outside",
      hovertemplate: "%{y}<br>FCF/Div %{x:.2f}x<extra></extra>",
    }], { xaxis: { title: "FCF / Dividend (x) — 1x 이상 안전, 2x+ 우수", zeroline: true }, margin: { l: 220, r: 80, t: 10, b: 50 }, height: Math.max(360, fdRows.length * 24 + 60) });

    // ── ㉗ Liability Maturity
    const mtRows = rows.filter(r => r.lt_share != null).sort((a, b) => (b.liab || 0) - (a.liab || 0));
    plot("ov-mat-stack", [
      { x: mtRows.map(r => r.short), y: mtRows.map(r => r.st_share), type: "bar", name: "Current (단기)", marker: { color: "#d62728" } },
      { x: mtRows.map(r => r.short), y: mtRows.map(r => r.lt_share), type: "bar", name: "Long-term (장기)", marker: { color: "#1f77b4" } },
    ], {
      barmode: "stack", yaxis: { title: "% of total liabilities", range: [0, 105] },
      xaxis: { tickangle: -45, automargin: true },
      legend: { orientation: "h", y: -0.35 },
      margin: { l: 70, r: 20, t: 10, b: 130 }, height: 480,
    });

    const stRows = rows.filter(r => r.st_to_equity != null && Math.abs(r.st_to_equity) < 50).sort((a, b) => b.st_to_equity - a.st_to_equity);
    plot("ov-stl-eq", [{
      x: stRows.map(r => r.st_to_equity).reverse(), y: stRows.map(r => r.short).reverse(),
      type: "bar", orientation: "h",
      marker: { color: stRows.map(r => r.st_to_equity > 1.5 ? "#d62728" : r.st_to_equity > 0.8 ? "#ffbb78" : "#2ca02c").reverse() },
      text: stRows.map(r => r.st_to_equity.toFixed(2) + "x").reverse(), textposition: "outside",
    }], { xaxis: { title: "Short-term Liab / Equity (x)" }, margin: { l: 220, r: 80, t: 10, b: 50 }, height: Math.max(400, stRows.length * 22 + 60) });

    const ltlRows = rows.filter(r => r.ltl != null && r.ltl > 0).sort((a, b) => b.ltl - a.ltl);
    plot("ov-ltl-abs", [{
      x: ltlRows.map(r => r.ltl).reverse(), y: ltlRows.map(r => r.short).reverse(),
      type: "bar", orientation: "h",
      marker: { color: ltlRows.map(r => r.ltl).reverse(), colorscale: "Blues" },
      text: ltlRows.map(r => Math.round(r.ltl).toLocaleString()).reverse(), textposition: "outside",
    }], { xaxis: { title: "Long-term Liabilities (IDR bn)" }, margin: { l: 220, r: 80, t: 10, b: 50 }, height: Math.max(400, ltlRows.length * 22 + 60) });

    // ── ㉕ Business Model Cluster
    const BM_LIST = ["Upstream", "Integrated", "Downstream", "Other"];
    const bmAgg = {};
    BM_LIST.forEach(b => { bmAgg[b] = { n: 0, rev: 0, roeSum: 0, roeN: 0, marginSum: 0, marginN: 0, qSum: 0, qN: 0 }; });
    rows.forEach(r => {
      const a = bmAgg[r.bm_class] || bmAgg.Other;
      a.n++;
      a.rev += r.revenue || 0;
      if (r.roe != null) { a.roeSum += r.roe; a.roeN++; }
      if (r.net_margin != null) { a.marginSum += r.net_margin; a.marginN++; }
      if (r.quality_score != null) { a.qSum += r.quality_score; a.qN++; }
    });
    const bmActive = BM_LIST.filter(b => bmAgg[b].n > 0);

    plot("ov-bm-bar", [
      { x: bmActive, y: bmActive.map(b => bmAgg[b].rev), type: "bar", name: "매출 합 (bn)", marker: { color: bmActive.map(b => BM_COLOR[b]) }, yaxis: "y" },
      { x: bmActive, y: bmActive.map(b => bmAgg[b].n), type: "scatter", mode: "lines+markers", name: "회사 수", line: { color: "#333", width: 2 }, yaxis: "y2" },
    ], {
      yaxis: { title: "매출 합 (IDR bn)" },
      yaxis2: { title: "회사 수", overlaying: "y", side: "right" },
      legend: { orientation: "h", y: -0.18 }, margin: { l: 70, r: 60, t: 10, b: 50 }, height: 480,
    });

    plot("ov-bm-eff", [
      { x: bmActive, y: bmActive.map(b => bmAgg[b].roeN ? bmAgg[b].roeSum / bmAgg[b].roeN : null), type: "bar", name: "평균 ROE %", marker: { color: "#1f77b4" } },
      { x: bmActive, y: bmActive.map(b => bmAgg[b].marginN ? bmAgg[b].marginSum / bmAgg[b].marginN : null), type: "bar", name: "평균 순이익률 %", marker: { color: "#2ca02c" } },
      { x: bmActive, y: bmActive.map(b => bmAgg[b].qN ? bmAgg[b].qSum / bmAgg[b].qN : null), type: "bar", name: "평균 Quality", marker: { color: "#ff7f0e" } },
    ], {
      barmode: "group", yaxis: { title: "값 (%/score)", zeroline: true },
      legend: { orientation: "h", y: -0.18 }, margin: { l: 70, r: 20, t: 10, b: 50 }, height: 480,
    });

    // Cluster × Region grouped bar (region별 BM 회사 수)
    const REGIONS_BM = ["Sumatra", "Kalimantan", "Java", "Sulawesi", "Papua", "Diversified", "Other"];
    const crMatrix = {};
    REGIONS_BM.forEach(rg => { crMatrix[rg] = {}; BM_LIST.forEach(b => { crMatrix[rg][b] = 0; }); });
    rows.forEach(r => { crMatrix[r.region] = crMatrix[r.region] || {}; crMatrix[r.region][r.bm_class] = (crMatrix[r.region][r.bm_class] || 0) + 1; });
    const regionsActiveBM = REGIONS_BM.filter(rg => Object.values(crMatrix[rg] || {}).some(v => v > 0));
    plot("ov-bm-region", BM_LIST.map(b => ({
      x: regionsActiveBM, y: regionsActiveBM.map(rg => crMatrix[rg][b] || 0),
      type: "bar", name: b, marker: { color: BM_COLOR[b] },
    })), {
      barmode: "stack", yaxis: { title: "회사 수" },
      legend: { orientation: "h", y: -0.18 },
      margin: { l: 70, r: 20, t: 10, b: 60 }, height: 480,
    });

    // ── ㉔ Mill Utilization & Third-party FFB
    const muRows = rows.filter(r => r.mill_util != null && r.mill_util > 0 && r.mill_util < 200).sort((a, b) => b.mill_util - a.mill_util);
    plot("ov-mill-util", [{
      x: muRows.map(r => r.mill_util).reverse(), y: muRows.map(r => r.short).reverse(),
      type: "bar", orientation: "h",
      marker: { color: muRows.map(r => r.mill_util > 60 ? "#2ca02c" : r.mill_util > 40 ? "#1f77b4" : r.mill_util > 20 ? "#ffbb78" : "#d62728").reverse() },
      text: muRows.map(r => r.mill_util.toFixed(1) + "%").reverse(), textposition: "outside",
      hovertemplate: "%{y}<br>Util %{x:.2f}%<br>(processed / 연 capacity)<extra></extra>",
    }], { xaxis: { title: "Mill Utilization (%) — 60%+ 풀가동" }, margin: { l: 220, r: 80, t: 10, b: 50 }, height: Math.max(400, muRows.length * 22 + 60) });

    const tpRows = rows.filter(r => r.third_party_share != null).sort((a, b) => b.third_party_share - a.third_party_share);
    plot("ov-third-party", [{
      x: tpRows.map(r => r.third_party_share).reverse(), y: tpRows.map(r => r.short).reverse(),
      type: "bar", orientation: "h",
      marker: { color: tpRows.map(r => r.third_party_share > 70 ? "#d62728" : r.third_party_share > 40 ? "#ffbb78" : r.third_party_share > 15 ? "#1f77b4" : "#2ca02c").reverse() },
      text: tpRows.map(r => r.third_party_share.toFixed(1) + "%").reverse(), textposition: "outside",
      hovertemplate: "%{y}<br>3rd Party %{x:.1f}%<br>자체 FFB %{customdata:.1f}%<extra></extra>",
      customdata: tpRows.map(r => 100 - r.third_party_share).reverse(),
    }], { xaxis: { title: "Third-party FFB Share (%) — 외부 FFB 의존도" }, margin: { l: 220, r: 80, t: 10, b: 50 }, height: Math.max(400, tpRows.length * 22 + 60) });

    // Cap × Production scatter
    const cpScRows = rows.filter(r => r.mill_cap_tph != null && r.ffb_t > 0);
    plot("ov-cap-prod", [{
      x: cpScRows.map(r => r.mill_cap_tph), y: cpScRows.map(r => r.ffb_t),
      mode: "markers+text", type: "scatter",
      text: cpScRows.map(r => r.short), textposition: "top center", textfont: { size: 9 },
      marker: {
        size: cpScRows.map(r => Math.max(10, Math.min(48, Math.sqrt(r.planted_ha || 100) / 30))),
        color: cpScRows.map(r => REGION_COLOR[r.region] || "#7f7f7f"),
        opacity: 0.8, line: { color: "#fff", width: 1 },
      },
      hovertemplate: "%{text}<br>Capacity %{x} tph<br>Own FFB %{y:,.0f} ton<extra></extra>",
    }], {
      xaxis: { title: "Mill Capacity (tph)", type: "log" },
      yaxis: { title: "Own FFB Production (ton)", type: "log" },
      margin: { l: 70, r: 20, t: 10, b: 50 }, height: 480, showlegend: false,
    });

    // ── ㉓ OER & CPO Price
    const oerRows = rows.filter(r => r.oer_pct != null && r.oer_pct > 0).sort((a, b) => b.oer_pct - a.oer_pct);
    // oer_pct가 0-1 (소수) 또는 0-100 (퍼센트)로 들어올 수 있음 — 정규화
    const oerNorm = (v) => v > 1 ? v : v * 100;
    plot("ov-oer", [{
      x: oerRows.map(r => oerNorm(r.oer_pct)).reverse(),
      y: oerRows.map(r => r.short).reverse(),
      type: "bar", orientation: "h",
      marker: { color: oerRows.map(r => oerNorm(r.oer_pct) > 23 ? "#2ca02c" : oerNorm(r.oer_pct) > 20 ? "#1f77b4" : oerNorm(r.oer_pct) > 18 ? "#ffbb78" : "#d62728").reverse() },
      text: oerRows.map(r => oerNorm(r.oer_pct).toFixed(2) + "%").reverse(), textposition: "outside",
      hovertemplate: "%{y}<br>OER %{x:.2f}%<extra></extra>",
    }], { xaxis: { title: "Oil Extraction Rate (%) — 업계 23%+ 우수" }, margin: { l: 220, r: 80, t: 10, b: 50 }, height: Math.max(400, oerRows.length * 22 + 60) });

    const cpRows = rows.filter(r => r.cpo_price_kg != null && r.cpo_price_kg > 0).sort((a, b) => b.cpo_price_kg - a.cpo_price_kg);
    plot("ov-cpo-price", [{
      x: cpRows.map(r => r.cpo_price_kg).reverse(),
      y: cpRows.map(r => r.short).reverse(),
      type: "bar", orientation: "h",
      marker: { color: cpRows.map(r => r.cpo_price_kg).reverse(), colorscale: "YlGn" },
      text: cpRows.map(r => r.cpo_price_kg.toLocaleString()).reverse(), textposition: "outside",
    }], { xaxis: { title: "평균 CPO 판매가 (IDR/kg)" }, margin: { l: 220, r: 80, t: 10, b: 50 }, height: Math.max(400, cpRows.length * 22 + 60) });

    const omRows = rows.filter(r => r.oer_pct != null && r.oer_pct > 0 && r.net_margin != null);
    plot("ov-oer-margin", [{
      x: omRows.map(r => oerNorm(r.oer_pct)), y: omRows.map(r => r.net_margin),
      mode: "markers+text", type: "scatter",
      text: omRows.map(r => r.short), textposition: "top center", textfont: { size: 9 },
      marker: {
        size: omRows.map(r => Math.max(10, Math.min(48, Math.sqrt(r.cpo_t || 100) / 20))),
        color: omRows.map(r => REGION_COLOR[r.region] || "#7f7f7f"),
        opacity: 0.8, line: { color: "#fff", width: 1 },
      },
      hovertemplate: "%{text}<br>OER %{x:.2f}%<br>Net Margin %{y:.2f}%<extra></extra>",
    }], {
      xaxis: { title: "OER (%)" }, yaxis: { title: "Net Margin (%)", zeroline: true },
      margin: { l: 70, r: 20, t: 10, b: 50 }, height: 480, showlegend: false,
    });

    // ── ㉒ Tree Age & Replanting
    const mrRows = rows.filter(r => r.mature_share != null).sort((a, b) => b.mature_share - a.mature_share);
    plot("ov-maturity", [
      { x: mrRows.map(r => r.short), y: mrRows.map(r => r.mature_share), type: "bar", name: "Mature %", marker: { color: "#2ca02c" } },
      { x: mrRows.map(r => r.short), y: mrRows.map(r => r.immature_share), type: "bar", name: "Immature %", marker: { color: "#ffbb78" } },
    ], {
      barmode: "stack", yaxis: { title: "% of (mature + immature) area", range: [0, 105] },
      xaxis: { tickangle: -45, automargin: true },
      legend: { orientation: "h", y: -0.35 },
      margin: { l: 70, r: 20, t: 10, b: 130 }, height: 480,
    });

    const taRows = rows.filter(r => r.avg_tree_age != null).sort((a, b) => b.avg_tree_age - a.avg_tree_age);
    plot("ov-tree-age", [{
      x: taRows.map(r => r.avg_tree_age).reverse(), y: taRows.map(r => r.short).reverse(),
      type: "bar", orientation: "h",
      marker: { color: taRows.map(r => r.avg_tree_age > 20 ? "#d62728" : r.avg_tree_age > 15 ? "#ffbb78" : r.avg_tree_age > 8 ? "#1f77b4" : "#2ca02c").reverse() },
      text: taRows.map(r => r.avg_tree_age.toFixed(1) + " yrs").reverse(), textposition: "outside",
    }], { xaxis: { title: "평균 Tree Age (years) — Palm 수령 25yr+ replanting 권장" }, margin: { l: 220, r: 80, t: 10, b: 50 }, height: Math.max(400, taRows.length * 22 + 60) });

    const npRows = rows.filter(r => r.plasma_share != null).sort((a, b) => b.plasma_share - a.plasma_share);
    plot("ov-nuc-plasma", [{
      x: npRows.map(r => r.plasma_share).reverse(), y: npRows.map(r => r.short).reverse(),
      type: "bar", orientation: "h",
      marker: { color: npRows.map(r => r.plasma_share).reverse(), colorscale: "Oranges" },
      text: npRows.map(r => r.plasma_share.toFixed(1) + "%").reverse(), textposition: "outside",
      hovertemplate: "%{y}<br>Plasma %{x:.1f}% (Nucleus %{customdata:.1f}%)<extra></extra>",
      customdata: npRows.map(r => 100 - r.plasma_share).reverse(),
    }], { xaxis: { title: "Plasma 비중 (%) — 외부 smallholder farmer 의존도" }, margin: { l: 220, r: 80, t: 10, b: 50 }, height: Math.max(400, npRows.length * 22 + 60) });

    // ── ㉑ Downstream Integration
    const dsRows = [...rows].sort((a, b) => b.downstream_score - a.downstream_score);
    plot("ov-dsi", [{
      x: dsRows.map(r => r.downstream_score).reverse(), y: dsRows.map(r => r.short).reverse(),
      type: "bar", orientation: "h",
      marker: { color: dsRows.map(r => r.downstream_score >= 4 ? "#2ca02c" : r.downstream_score >= 2 ? "#1f77b4" : r.downstream_score >= 1 ? "#ffbb78" : "#9ca3af").reverse() },
      text: dsRows.map(r => r.downstream_score).reverse(), textposition: "outside",
      hovertemplate: "%{y}<br>Downstream %{x}/6<extra></extra>",
    }], { xaxis: { title: "Downstream Integration Score (0=pure upstream, 6=완전 통합)", range: [0, 7] }, margin: { l: 220, r: 60, t: 10, b: 50 }, height: Math.max(400, dsRows.length * 22 + 60) });

    const rfRows = rows.filter(r => r.refined_total_t > 0).sort((a, b) => b.refined_total_t - a.refined_total_t);
    plot("ov-refined-mix", [
      { x: rfRows.map(r => r.short), y: rfRows.map(r => r.rbdpo_t), type: "bar", name: "RBDPO", marker: { color: "#2ca02c" } },
      { x: rfRows.map(r => r.short), y: rfRows.map(r => r.olein_t), type: "bar", name: "Olein", marker: { color: "#1f77b4" } },
      { x: rfRows.map(r => r.short), y: rfRows.map(r => r.stearin_t), type: "bar", name: "Stearin", marker: { color: "#ff7f0e" } },
      { x: rfRows.map(r => r.short), y: rfRows.map(r => r.pfad_t), type: "bar", name: "PFAD", marker: { color: "#d62728" } },
      { x: rfRows.map(r => r.short), y: rfRows.map(r => r.pko_t), type: "bar", name: "PKO", marker: { color: "#9467bd" } },
    ], {
      barmode: "stack", yaxis: { title: "정제유 생산 (ton)" },
      xaxis: { tickangle: -30, automargin: true },
      legend: { orientation: "h", y: -0.25 }, margin: { l: 70, r: 20, t: 10, b: 100 }, height: 480,
    });

    const deRows = rows.filter(r => r.domestic_pct != null || r.export_pct != null).sort((a, b) => (b.export_pct || 0) - (a.export_pct || 0));
    plot("ov-dom-exp", [
      { x: deRows.map(r => r.short), y: deRows.map(r => r.domestic_pct || 0), type: "bar", name: "Domestic %", marker: { color: "#1f77b4" } },
      { x: deRows.map(r => r.short), y: deRows.map(r => r.export_pct || 0), type: "bar", name: "Export %", marker: { color: "#ff7f0e" } },
    ], {
      barmode: "stack", yaxis: { title: "Sales mix (%)", range: [0, 105] },
      xaxis: { tickangle: -45, automargin: true },
      legend: { orientation: "h", y: -0.35 }, margin: { l: 70, r: 20, t: 10, b: 130 }, height: 480,
    });

    // ── ⑳ Working Capital + Asset Composition
    const nwcRows = rows.filter(r => r.nwc != null).sort((a, b) => b.nwc - a.nwc);
    plot("ov-nwc", [{
      x: nwcRows.map(r => r.nwc).reverse(), y: nwcRows.map(r => r.short).reverse(),
      type: "bar", orientation: "h",
      marker: { color: nwcRows.map(r => r.nwc >= 0 ? "#2ca02c" : "#d62728").reverse() },
      text: nwcRows.map(r => Math.round(r.nwc).toLocaleString()).reverse(), textposition: "outside",
    }], { xaxis: { title: "Net Working Capital (IDR bn)", zeroline: true }, margin: { l: 220, r: 80, t: 10, b: 40 }, height: Math.max(400, nwcRows.length * 22 + 60) });

    const nwcRevRows = rows.filter(r => r.nwc_per_rev != null && Math.abs(r.nwc_per_rev) < 500).sort((a, b) => b.nwc_per_rev - a.nwc_per_rev);
    plot("ov-nwc-rev", [{
      x: nwcRevRows.map(r => r.nwc_per_rev).reverse(), y: nwcRevRows.map(r => r.short).reverse(),
      type: "bar", orientation: "h",
      marker: { color: nwcRevRows.map(r => r.nwc_per_rev > 50 ? "#ffbb78" : r.nwc_per_rev >= 0 ? "#1f77b4" : "#d62728").reverse() },
      text: nwcRevRows.map(r => r.nwc_per_rev.toFixed(1) + "%").reverse(), textposition: "outside",
    }], { xaxis: { title: "NWC / Revenue (%)", zeroline: true }, margin: { l: 220, r: 80, t: 10, b: 50 }, height: Math.max(400, nwcRevRows.length * 22 + 60) });

    const amRows2 = rows.filter(r => r.ca_share != null && r.nca_share != null).sort((a, b) => (b.assets || 0) - (a.assets || 0));
    plot("ov-asset-mix", [
      { x: amRows2.map(r => r.short), y: amRows2.map(r => r.cash_share || 0), type: "bar", name: "Cash", marker: { color: "#2ca02c" } },
      { x: amRows2.map(r => r.short), y: amRows2.map(r => (r.ca_share || 0) - (r.cash_share || 0)), type: "bar", name: "Current (non-cash)", marker: { color: "#1f77b4" } },
      { x: amRows2.map(r => r.short), y: amRows2.map(r => r.nca_share || 0), type: "bar", name: "Non-Current", marker: { color: "#9467bd" } },
    ], {
      barmode: "stack", yaxis: { title: "% of Total Assets", range: [0, 105] },
      xaxis: { tickangle: -45, automargin: true },
      legend: { orientation: "h", y: -0.35 }, margin: { l: 70, r: 20, t: 10, b: 130 }, height: 480,
    });

    // ── ⑲ Multi-Year Average (3yr) — 회사별, 최근 3 annual year
    const last3 = annualYears.slice(-3);
    const mean = (a) => { const x = a.filter(v => v != null); return x.length ? x.reduce((s, v) => s + v, 0) / x.length : null; };
    const stddev = (a) => {
      const x = a.filter(v => v != null);
      if (x.length < 2) return null;
      const m = x.reduce((s, v) => s + v, 0) / x.length;
      return Math.sqrt(x.reduce((s, v) => s + (v - m) ** 2, 0) / (x.length - 1));
    };
    const avgRows = companies.map(co => {
      const series = fin.filter(r => r.short === co && last3.includes(r.yr));
      if (series.length === 0) return null;
      return {
        short: co, region: series[series.length - 1].region,
        n: series.length,
        avg_roe: mean(series.map(r => r.roe)),
        avg_margin: mean(series.map(r => r.net_margin)),
        avg_fcf_margin: mean(series.map(r => r.fcf_margin)),
        avg_nd_eb: mean(series.map(r => r.nd_ebitda)),
        std_roe: stddev(series.map(r => r.roe)),
        std_margin: stddev(series.map(r => r.net_margin)),
        revenue: series[series.length - 1].revenue,
      };
    }).filter(Boolean);

    const arRows = [...avgRows].filter(r => r.avg_roe != null).sort((a, b) => b.avg_roe - a.avg_roe);
    plot("ov-avg-roe", [{
      x: arRows.map(r => r.avg_roe).reverse(), y: arRows.map(r => r.short).reverse(),
      type: "bar", orientation: "h",
      marker: { color: arRows.map(r => r.avg_roe >= 15 ? "#2ca02c" : r.avg_roe >= 5 ? "#1f77b4" : r.avg_roe >= 0 ? "#ffbb78" : "#d62728").reverse() },
      text: arRows.map(r => r.avg_roe.toFixed(1) + "%").reverse(), textposition: "outside",
      hovertemplate: `%{y}<br>3yr Avg ROE: %{x:.2f}% (n=${last3.length})<extra></extra>`,
    }], { xaxis: { title: `3yr 평균 ROE (%) — ${last3.join("/")}`, zeroline: true }, margin: { l: 220, r: 80, t: 10, b: 50 }, height: Math.max(400, arRows.length * 22 + 60) });

    const amRows = [...avgRows].filter(r => r.avg_margin != null).sort((a, b) => b.avg_margin - a.avg_margin);
    plot("ov-avg-margin", [{
      x: amRows.map(r => r.avg_margin).reverse(), y: amRows.map(r => r.short).reverse(),
      type: "bar", orientation: "h",
      marker: { color: amRows.map(r => r.avg_margin >= 0 ? "#2ca02c" : "#d62728").reverse() },
      text: amRows.map(r => r.avg_margin.toFixed(1) + "%").reverse(), textposition: "outside",
    }], { xaxis: { title: `3yr 평균 Net Margin (%)`, zeroline: true }, margin: { l: 220, r: 80, t: 10, b: 50 }, height: Math.max(400, amRows.length * 22 + 60) });

    // Consistency Map: 평균 ROE × StdDev (낮은 stddev = consistent)
    const csRows2 = avgRows.filter(r => r.avg_roe != null && r.std_roe != null);
    plot("ov-consistency", [{
      x: csRows2.map(r => r.std_roe), y: csRows2.map(r => r.avg_roe),
      mode: "markers+text", type: "scatter",
      text: csRows2.map(r => r.short), textposition: "top center", textfont: { size: 9 },
      marker: {
        size: csRows2.map(r => Math.max(10, Math.min(48, Math.sqrt(r.revenue || 100) / 4))),
        color: csRows2.map(r => REGION_COLOR[r.region] || "#7f7f7f"),
        opacity: 0.8, line: { color: "#fff", width: 1 },
      },
      hovertemplate: "%{text}<br>3yr ROE %{y:.2f}%<br>변동성(StdDev) %{x:.2f}<extra></extra>",
    }], {
      xaxis: { title: "ROE StdDev (낮을수록 consistent)" },
      yaxis: { title: "3yr 평균 ROE (%)", zeroline: true },
      margin: { l: 70, r: 20, t: 10, b: 50 }, height: 520, showlegend: false,
      annotations: [
        { x: 1, y: 25, text: "이상: 고ROE·꾸준", showarrow: false, font: { color: "#2ca02c", size: 11 } },
        { x: 1, y: -15, text: "지루: 저ROE·꾸준", showarrow: false, font: { color: "#999", size: 11 } },
      ],
    });

    // ── ⑱ Margin Cascade
    const mcRows = rows.filter(r => r.m_net != null).sort((a, b) => b.m_net - a.m_net);
    plot("ov-margin-cascade", [
      { x: mcRows.map(r => r.short), y: mcRows.map(r => r.m_gross), type: "bar", name: "Gross %", marker: { color: "#2ca02c" } },
      { x: mcRows.map(r => r.short), y: mcRows.map(r => r.m_ebitda), type: "bar", name: "EBITDA %", marker: { color: "#1f77b4" } },
      { x: mcRows.map(r => r.short), y: mcRows.map(r => r.m_ebit), type: "bar", name: "EBIT %", marker: { color: "#ff7f0e" } },
      { x: mcRows.map(r => r.short), y: mcRows.map(r => r.m_net), type: "bar", name: "Net %", marker: { color: "#d62728" } },
    ], {
      barmode: "group", yaxis: { title: "Margin (%)", zeroline: true },
      xaxis: { tickangle: -45, automargin: true },
      legend: { orientation: "h", y: -0.3 },
      margin: { l: 70, r: 20, t: 10, b: 130 }, height: 480,
    });

    // Gross → Net 손실 폭 (Gross - Net) = SG&A + D&A + Interest + Tax 총합
    const lossRows = rows.filter(r => r.m_gross != null && r.m_net != null).sort((a, b) => (b.m_gross - b.m_net) - (a.m_gross - a.m_net));
    plot("ov-margin-loss", [{
      x: lossRows.map(r => r.m_gross - r.m_net).reverse(), y: lossRows.map(r => r.short).reverse(),
      type: "bar", orientation: "h",
      marker: { color: "#8c564b" },
      text: lossRows.map(r => (r.m_gross - r.m_net).toFixed(1) + "pp").reverse(), textposition: "outside",
      hovertemplate: "%{y}<br>Gross %{customdata[0]:.1f}% → Net %{customdata[1]:.1f}%<br>손실 %{x:.1f}pp<extra></extra>",
      customdata: lossRows.map(r => [r.m_gross, r.m_net]).reverse(),
    }], { xaxis: { title: "Gross − Net Margin (pp) — SG&A·D&A·이자·세금 누적" }, margin: { l: 220, r: 80, t: 10, b: 50 }, height: Math.max(400, lossRows.length * 22 + 60) });

    // EBITDA vs EBIT scatter (operating leverage = D&A 비중)
    const ebRows = rows.filter(r => r.m_ebitda != null && r.m_ebit != null);
    plot("ov-eb-scatter", [{
      x: ebRows.map(r => r.m_ebitda), y: ebRows.map(r => r.m_ebit),
      mode: "markers+text", type: "scatter",
      text: ebRows.map(r => r.short), textposition: "top center", textfont: { size: 9 },
      marker: {
        size: ebRows.map(r => Math.max(10, Math.min(48, Math.sqrt(r.assets || 100) / 4))),
        color: ebRows.map(r => REGION_COLOR[r.region] || "#7f7f7f"),
        opacity: 0.8, line: { color: "#fff", width: 1 },
      },
      hovertemplate: "%{text}<br>EBITDA %{x:.2f}%<br>EBIT %{y:.2f}%<br>차이=D&A 비중<extra></extra>",
    }], {
      xaxis: { title: "EBITDA Margin (%)", zeroline: true },
      yaxis: { title: "EBIT Margin (%)", zeroline: true },
      margin: { l: 70, r: 20, t: 10, b: 50 }, height: 480, showlegend: false,
      shapes: [{ type: "line", x0: -50, y0: -50, x1: 100, y1: 100, line: { color: "#ccc", dash: "dot", width: 1 } }],
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

  // ── ㉖ Cash Flow Waterfall (회사 select)
  const wfSel = document.getElementById("ov-wf-co");
  const wfInfo = document.getElementById("ov-wf-info");
  wfSel.innerHTML = companies.map(c => `<option value="${c}">${c}</option>`).join("");
  const renderWaterfall = () => {
    const co = wfSel.value;
    const r = fin.find(x => x.short === co && x.yr === ly);
    if (!r) { wfInfo.textContent = `${co}: ${ly} 데이터 없음`; return; }
    wfInfo.textContent = `${co} · ${ly} · 권역 ${r.region}`;
    const rev = r.revenue || 0;
    const ebitda = r.ebitda || 0;
    const cfo = r.cfo || 0;
    const capex = r.capex || 0;
    const fcf = r.fcf || (cfo - capex);
    const divTotal = (r.div_total != null && r.shares_outstanding_mn != null) ? r.div_total * r.shares_outstanding_mn / 1000 : 0;  // IDR bn
    const retained = fcf - divTotal;
    const measure = ["absolute", "relative", "relative", "relative", "relative", "relative", "total"];
    const x = ["Revenue", "→ EBITDA", "→ CFO", "− CapEx", "= FCF", "− 배당", "Retained"];
    const y = [rev, ebitda - rev, cfo - ebitda, -capex, 0, -divTotal, 0];
    plot("ov-waterfall", [{
      type: "waterfall", measure, x, y,
      text: y.map(v => Math.round(v).toLocaleString()),
      connector: { line: { color: "#888" } },
      increasing: { marker: { color: "#2ca02c" } },
      decreasing: { marker: { color: "#d62728" } },
      totals: { marker: { color: "#1f77b4" } },
    }], { yaxis: { title: "IDR bn", zeroline: true }, margin: { l: 70, r: 20, t: 10, b: 50 }, height: 480 });
  };
  wfSel.addEventListener("change", renderWaterfall);
  renderWaterfall();

  // ── ㊶ Margin Compression Detector
  const marginDelta = companies.map(co => {
    const s = fin.filter(r => r.short === co && annualYears.includes(r.yr) && r.m_gross != null && r.m_net != null).sort((a, b) => a.yr.localeCompare(b.yr));
    if (s.length < 2) return null;
    return {
      short: co, region: s[s.length - 1].region,
      gm_delta: s[s.length - 1].m_gross - s[0].m_gross,
      nm_delta: s[s.length - 1].m_net - s[0].m_net,
      gm_first: s[0].m_gross, gm_last: s[s.length - 1].m_gross,
      nm_first: s[0].m_net, nm_last: s[s.length - 1].m_net,
      revenue: s[s.length - 1].revenue,
    };
  }).filter(Boolean);

  plot("ov-compr-quad", [{
    x: marginDelta.map(r => r.gm_delta), y: marginDelta.map(r => r.nm_delta),
    mode: "markers+text", type: "scatter",
    text: marginDelta.map(r => r.short), textposition: "top center", textfont: { size: 9 },
    marker: {
      size: marginDelta.map(r => Math.max(10, Math.min(48, Math.sqrt(Math.abs(r.revenue) || 100) / 4))),
      color: marginDelta.map(r => (r.gm_delta < 0 && r.nm_delta < 0) ? "#d62728" : (r.gm_delta >= 0 && r.nm_delta >= 0) ? "#2ca02c" : "#ffbb78"),
      opacity: 0.8, line: { color: "#fff", width: 1 },
    },
    hovertemplate: "%{text}<br>Gross Δ %{x:+.2f}pp<br>Net Δ %{y:+.2f}pp<extra></extra>",
  }], {
    xaxis: { title: "Gross Margin Δ (pp)", zeroline: true },
    yaxis: { title: "Net Margin Δ (pp)", zeroline: true },
    margin: { l: 70, r: 20, t: 10, b: 50 }, height: 520, showlegend: false,
    annotations: [
      { x: -20, y: -20, text: "동시 압축 (위험)", showarrow: false, font: { color: "#d62728", size: 11 } },
      { x: 20, y: 20, text: "동시 확대", showarrow: false, font: { color: "#2ca02c", size: 11 } },
    ],
  });

  const gmD = [...marginDelta].sort((a, b) => b.gm_delta - a.gm_delta);
  plot("ov-gm-delta", [{
    x: gmD.map(r => r.gm_delta).reverse(), y: gmD.map(r => r.short).reverse(),
    type: "bar", orientation: "h",
    marker: { color: gmD.map(r => r.gm_delta >= 0 ? "#2ca02c" : "#d62728").reverse() },
    text: gmD.map(r => (r.gm_delta >= 0 ? "+" : "") + r.gm_delta.toFixed(1) + "pp").reverse(), textposition: "outside",
    hovertemplate: "%{y}<br>Gross %{customdata[0]:.1f}% → %{customdata[1]:.1f}% (Δ%{x:+.2f}pp)<extra></extra>",
    customdata: gmD.map(r => [r.gm_first, r.gm_last]).reverse(),
  }], { xaxis: { title: "Gross Margin Δ (pp, latest − first)", zeroline: true }, margin: { l: 220, r: 80, t: 10, b: 50 }, height: Math.max(360, gmD.length * 24 + 60) });

  const nmD = [...marginDelta].sort((a, b) => b.nm_delta - a.nm_delta);
  plot("ov-nm-delta", [{
    x: nmD.map(r => r.nm_delta).reverse(), y: nmD.map(r => r.short).reverse(),
    type: "bar", orientation: "h",
    marker: { color: nmD.map(r => r.nm_delta >= 0 ? "#2ca02c" : "#d62728").reverse() },
    text: nmD.map(r => (r.nm_delta >= 0 ? "+" : "") + r.nm_delta.toFixed(1) + "pp").reverse(), textposition: "outside",
  }], { xaxis: { title: "Net Margin Δ (pp, latest − first)", zeroline: true }, margin: { l: 220, r: 80, t: 10, b: 50 }, height: Math.max(360, nmD.length * 24 + 60) });

  // ── ㊵ Market Cap 다년
  const mcapSeries = companies.map(co => {
    const s = fin.filter(r => r.short === co && annualYears.includes(r.yr) && r.mcap != null && r.mcap > 0).sort((a, b) => a.yr.localeCompare(b.yr));
    return { short: co, region: s[s.length - 1]?.region, s };
  }).filter(r => r.s.length > 0);

  const mcTop12 = [...mcapSeries].map(r => ({ ...r, last: r.s[r.s.length - 1].mcap })).sort((a, b) => b.last - a.last).slice(0, 12);
  plot("ov-mcap-top", mcTop12.map(s => ({
    x: s.s.map(r => r.yr), y: s.s.map(r => r.mcap),
    name: s.short, type: "scatter", mode: "lines+markers",
    line: { color: colorMap[s.short], width: 2 }, marker: { color: colorMap[s.short], size: 6 },
  })), {
    yaxis: { title: "Market Cap (IDR bn)" },
    legend: { orientation: "h", y: -0.18, font: { size: 9 } },
    margin: { l: 70, r: 20, t: 10, b: 80 }, height: 480,
  });

  const mcCagr = mcapSeries.filter(r => r.s.length >= 2).map(r => {
    const first = r.s[0].mcap, last = r.s[r.s.length - 1].mcap;
    const years = r.s.length - 1;
    const c = (first > 0 && last > 0 && years > 0) ? (Math.pow(last / first, 1 / years) - 1) * 100 : null;
    return { short: r.short, region: r.region, cagr: c, mult: first > 0 ? last / first : null, first, last };
  }).filter(r => r.cagr != null && isFinite(r.cagr)).sort((a, b) => b.cagr - a.cagr);

  plot("ov-mcap-cagr", [{
    x: mcCagr.map(r => r.cagr).reverse(), y: mcCagr.map(r => r.short).reverse(),
    type: "bar", orientation: "h",
    marker: { color: mcCagr.map(r => r.cagr >= 20 ? "#2ca02c" : r.cagr >= 5 ? "#1f77b4" : r.cagr >= -5 ? "#ffbb78" : "#d62728").reverse() },
    text: mcCagr.map(r => (r.cagr >= 0 ? "+" : "") + r.cagr.toFixed(1) + "%").reverse(), textposition: "outside",
    hovertemplate: "%{y}<br>Mcap CAGR %{x:+.2f}%/yr<extra></extra>",
  }], { xaxis: { title: "Market Cap CAGR (%/yr)", zeroline: true }, margin: { l: 220, r: 80, t: 10, b: 50 }, height: Math.max(360, mcCagr.length * 24 + 60) });

  const mcMult = [...mcCagr].sort((a, b) => b.mult - a.mult);
  plot("ov-mcap-mult", [{
    x: mcMult.map(r => Math.min(20, r.mult)).reverse(), y: mcMult.map(r => r.short).reverse(),
    type: "bar", orientation: "h",
    marker: { color: mcMult.map(r => r.mult >= 2 ? "#2ca02c" : r.mult >= 1 ? "#1f77b4" : r.mult >= 0.5 ? "#ffbb78" : "#d62728").reverse() },
    text: mcMult.map(r => r.mult > 20 ? ">20x" : r.mult.toFixed(2) + "x").reverse(), textposition: "outside",
    hovertemplate: "%{y}<br>Latest/First %{x:.2f}x<br>%{customdata[0]:,.0f} → %{customdata[1]:,.0f} bn<extra></extra>",
    customdata: mcMult.map(r => [r.first, r.last]).reverse(),
  }], { xaxis: { title: "Mcap Latest / First (x) — 1x 동일, 2x+ 두배 이상" }, margin: { l: 220, r: 80, t: 10, b: 50 }, height: Math.max(360, mcMult.length * 24 + 60) });

  // ── ㊴ Quarterly Snapshot (2026 Q1)
  const Q1_YR = "2026 Q1";
  if (allYears.includes(Q1_YR)) {
    const q1Rows = fin.filter(r => r.yr === Q1_YR);
    const q1Rev = q1Rows.filter(r => r.revenue != null).sort((a, b) => b.revenue - a.revenue);
    plot("ov-q1-rev", [{
      x: q1Rev.map(r => r.revenue).reverse(), y: q1Rev.map(r => r.short).reverse(),
      type: "bar", orientation: "h",
      marker: { color: q1Rev.map(r => REGION_COLOR[r.region] || "#7f7f7f").reverse() },
      text: q1Rev.map(r => Math.round(r.revenue).toLocaleString()).reverse(), textposition: "outside",
    }], { xaxis: { title: "Revenue Q1 2026 (IDR bn)" }, margin: { l: 220, r: 80, t: 10, b: 40 }, height: Math.max(360, q1Rev.length * 24 + 60) });

    const q1NP = q1Rows.filter(r => r.net_profit != null).sort((a, b) => b.net_profit - a.net_profit);
    plot("ov-q1-np", [{
      x: q1NP.map(r => r.net_profit).reverse(), y: q1NP.map(r => r.short).reverse(),
      type: "bar", orientation: "h",
      marker: { color: q1NP.map(r => r.net_profit >= 0 ? "#2ca02c" : "#d62728").reverse() },
      text: q1NP.map(r => Math.round(r.net_profit).toLocaleString()).reverse(), textposition: "outside",
    }], { xaxis: { title: "Net Profit Q1 2026 (IDR bn)", zeroline: true }, margin: { l: 220, r: 80, t: 10, b: 40 }, height: Math.max(360, q1NP.length * 24 + 60) });

    // Annualized × 4 vs 2025
    const annData = q1Rows.map(r => {
      const fy2025 = fin.find(x => x.short === r.short && x.yr === "2025" && x.revenue != null);
      if (!fy2025) return null;
      const annualized = r.revenue * 4;
      const delta = (annualized - fy2025.revenue) / fy2025.revenue * 100;
      return { short: r.short, region: r.region, fy2025: fy2025.revenue, annualized, delta };
    }).filter(Boolean).sort((a, b) => b.delta - a.delta);

    plot("ov-q1-annualized", [
      { x: annData.map(r => r.short), y: annData.map(r => r.fy2025), type: "bar", name: "2025 FY 매출", marker: { color: "#9ca3af" } },
      { x: annData.map(r => r.short), y: annData.map(r => r.annualized), type: "bar", name: "Q1 ×4 Annualized", marker: { color: "#1f77b4" } },
      { x: annData.map(r => r.short), y: annData.map(r => r.delta), type: "scatter", mode: "lines+markers+text", name: "Δ %", line: { color: "#d62728", width: 2 }, marker: { color: "#d62728", size: 6 }, yaxis: "y2", text: annData.map(r => (r.delta >= 0 ? "+" : "") + r.delta.toFixed(0) + "%"), textposition: "top center", textfont: { size: 9 } },
    ], {
      yaxis: { title: "Revenue (IDR bn)" },
      yaxis2: { title: "Δ (%)", overlaying: "y", side: "right", zeroline: true },
      xaxis: { tickangle: -45, automargin: true },
      legend: { orientation: "h", y: -0.3 }, margin: { l: 70, r: 60, t: 10, b: 130 }, height: 480, barmode: "group",
    });
  }

  // ── ㊳ Revenue Trend & Stability
  const revAll = companies.map(co => {
    const s = fin.filter(r => r.short === co && annualYears.includes(r.yr) && r.revenue != null && r.revenue > 0).sort((a, b) => a.yr.localeCompare(b.yr));
    return { short: co, region: s[s.length - 1]?.region, s };
  }).filter(r => r.s.length > 0);

  const rTop12 = [...revAll].map(r => ({ ...r, last: r.s[r.s.length - 1].revenue })).sort((a, b) => b.last - a.last).slice(0, 12);
  plot("ov-rev-top", rTop12.map(s => ({
    x: s.s.map(r => r.yr), y: s.s.map(r => r.revenue),
    name: s.short, type: "scatter", mode: "lines+markers",
    line: { color: colorMap[s.short], width: 2 }, marker: { color: colorMap[s.short], size: 6 },
  })), {
    yaxis: { title: "Revenue (IDR bn)" },
    legend: { orientation: "h", y: -0.18, font: { size: 9 } },
    margin: { l: 70, r: 20, t: 10, b: 80 }, height: 480,
  });

  // CV per company
  const cv = (a) => {
    if (a.length < 2) return null;
    const m = a.reduce((s, v) => s + v, 0) / a.length;
    const sd = Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / (a.length - 1));
    return Math.abs(m) > 0.01 ? sd / Math.abs(m) : null;
  };
  const rvCV = revAll.map(r => ({ short: r.short, region: r.region, cv: cv(r.s.map(x => x.revenue)) })).filter(x => x.cv != null).sort((a, b) => b.cv - a.cv);
  plot("ov-rev-cv", [{
    x: rvCV.map(r => r.cv).reverse(), y: rvCV.map(r => r.short).reverse(),
    type: "bar", orientation: "h",
    marker: { color: rvCV.map(r => r.cv > 0.5 ? "#d62728" : r.cv > 0.3 ? "#ffbb78" : r.cv > 0.15 ? "#1f77b4" : "#2ca02c").reverse() },
    text: rvCV.map(r => r.cv.toFixed(2)).reverse(), textposition: "outside",
  }], { xaxis: { title: "Revenue CV (StdDev/Mean) — 낮을수록 안정" }, margin: { l: 220, r: 80, t: 10, b: 50 }, height: Math.max(360, rvCV.length * 24 + 60) });

  // CAGR (first → last)
  const cagrs = revAll.filter(r => r.s.length >= 2).map(r => {
    const first = r.s[0].revenue, last = r.s[r.s.length - 1].revenue;
    const years = r.s.length - 1;
    const c = (first > 0 && last > 0 && years > 0) ? (Math.pow(last / first, 1 / years) - 1) * 100 : null;
    return { short: r.short, region: r.region, cagr: c, first, last, years };
  }).filter(r => r.cagr != null && isFinite(r.cagr)).sort((a, b) => b.cagr - a.cagr);
  plot("ov-rev-cagr", [{
    x: cagrs.map(r => r.cagr).reverse(), y: cagrs.map(r => r.short).reverse(),
    type: "bar", orientation: "h",
    marker: { color: cagrs.map(r => r.cagr >= 15 ? "#2ca02c" : r.cagr >= 5 ? "#1f77b4" : r.cagr >= 0 ? "#ffbb78" : "#d62728").reverse() },
    text: cagrs.map(r => (r.cagr >= 0 ? "+" : "") + r.cagr.toFixed(1) + "%").reverse(), textposition: "outside",
    hovertemplate: "%{y}<br>CAGR %{x:+.2f}%/yr<br>%{customdata[0]:,.0f} → %{customdata[1]:,.0f} bn (%{customdata[2]}yr)<extra></extra>",
    customdata: cagrs.map(r => [r.first, r.last, r.years]).reverse(),
  }], { xaxis: { title: "Revenue CAGR (%/yr) — 전 기간", zeroline: true }, margin: { l: 220, r: 80, t: 10, b: 50 }, height: Math.max(360, cagrs.length * 24 + 60) });

  // ── ㉞ EBITDA Margin Trend
  const ebMt = companies.map(co => {
    const series = fin.filter(r => r.short === co && annualYears.includes(r.yr) && r.m_ebitda != null).sort((a, b) => a.yr.localeCompare(b.yr));
    if (series.length === 0) return null;
    return { short: co, region: series[series.length - 1].region, series, last: series[series.length - 1].m_ebitda, first: series[0].m_ebitda };
  }).filter(Boolean);

  const ebTop8 = [...ebMt].filter(s => s.last != null).sort((a, b) => b.last - a.last).slice(0, 8);
  plot("ov-ebmt-top", ebTop8.map(s => ({
    x: s.series.map(r => r.yr), y: s.series.map(r => r.m_ebitda),
    name: s.short, type: "scatter", mode: "lines+markers",
    line: { color: colorMap[s.short], width: 2.5 }, marker: { color: colorMap[s.short], size: 8 },
  })), {
    yaxis: { title: "EBITDA Margin (%)", zeroline: true },
    legend: { orientation: "h", y: -0.18 },
    margin: { l: 70, r: 20, t: 10, b: 60 }, height: 480,
  });

  const ebDelta = ebMt.filter(s => s.series.length >= 2 && s.first != null && s.last != null)
    .map(s => ({ ...s, delta: s.last - s.first })).sort((a, b) => b.delta - a.delta);
  plot("ov-ebmt-delta", [{
    x: ebDelta.map(r => r.delta).reverse(), y: ebDelta.map(r => r.short).reverse(),
    type: "bar", orientation: "h",
    marker: { color: ebDelta.map(r => r.delta >= 0 ? "#2ca02c" : "#d62728").reverse() },
    text: ebDelta.map(r => (r.delta >= 0 ? "+" : "") + r.delta.toFixed(1) + "pp").reverse(), textposition: "outside",
    hovertemplate: "%{y}<br>Δ %{x:+.2f}pp<br>%{customdata[0]:.1f}% → %{customdata[1]:.1f}%<extra></extra>",
    customdata: ebDelta.map(r => [r.first, r.last]).reverse(),
  }], { xaxis: { title: "EBITDA Margin Δ (latest − first, pp)", zeroline: true }, margin: { l: 220, r: 80, t: 10, b: 50 }, height: Math.max(360, ebDelta.length * 24 + 60) });

  plot("ov-ebmt-slope", ebDelta.map(r => ({
    x: ["First", "Latest"], y: [r.first, r.last], name: r.short, type: "scatter",
    mode: "lines+markers", line: { color: r.delta >= 0 ? "#2ca02c" : "#d62728", width: 1.5 },
    marker: { size: 5 }, hovertemplate: r.short + "<br>%{x}: %{y:.2f}%<extra></extra>",
  })), {
    yaxis: { title: "EBITDA Margin (%)", zeroline: true }, showlegend: false,
    margin: { l: 70, r: 20, t: 10, b: 50 }, height: 480,
  });

  // ── ㉝ CapEx Cycle
  const capexCum = companies.map(co => {
    const series = fin.filter(r => r.short === co && annualYears.includes(r.yr) && r.capex != null).sort((a, b) => a.yr.localeCompare(b.yr));
    if (series.length === 0) return null;
    const total = series.reduce((s, r) => s + r.capex, 0);
    const avg = total / series.length;
    const latest = series[series.length - 1].capex;
    const ratio = avg > 0 ? latest / avg : null;
    return { short: co, region: series[series.length - 1].region, series, total, avg, latest, ratio };
  }).filter(Boolean);

  // Top 8 capex (전 기간 합)
  const cxTop8 = [...capexCum].sort((a, b) => b.total - a.total).slice(0, 8);
  plot("ov-capex-trend", cxTop8.map(s => ({
    x: s.series.map(r => r.yr), y: s.series.map(r => r.capex),
    name: s.short, type: "scatter", mode: "lines+markers",
    line: { color: colorMap[s.short], width: 2.5 }, marker: { color: colorMap[s.short], size: 8 },
  })), {
    yaxis: { title: "CapEx (IDR bn)" },
    legend: { orientation: "h", y: -0.18 },
    margin: { l: 70, r: 20, t: 10, b: 60 }, height: 480,
  });

  // Cycle ratio (latest / avg)
  const cxCycle = capexCum.filter(r => r.ratio != null && r.ratio > 0 && isFinite(r.ratio)).sort((a, b) => b.ratio - a.ratio);
  plot("ov-capex-cycle", [{
    x: cxCycle.map(r => Math.min(10, r.ratio)).reverse(), y: cxCycle.map(r => r.short).reverse(),
    type: "bar", orientation: "h",
    marker: { color: cxCycle.map(r => r.ratio >= 1.5 ? "#ff7f0e" : r.ratio >= 0.8 ? "#1f77b4" : "#2ca02c").reverse() },
    text: cxCycle.map(r => r.ratio > 10 ? ">10x" : r.ratio.toFixed(2) + "x").reverse(), textposition: "outside",
    hovertemplate: "%{y}<br>Latest %{customdata[0]:,.0f} bn / Avg %{customdata[1]:,.0f} bn<br>= %{x:.2f}x<extra></extra>",
    customdata: cxCycle.map(r => [r.latest, r.avg]).reverse(),
  }], { xaxis: { title: "Latest / Avg CapEx (x) — 1.5x+ Expansion, <0.8x Harvest", range: [0, 10.5] }, margin: { l: 220, r: 80, t: 10, b: 50 }, height: Math.max(360, cxCycle.length * 24 + 60) });

  // Total cumulative
  const cxCum = [...capexCum].sort((a, b) => b.total - a.total);
  plot("ov-capex-cum", [{
    x: cxCum.map(r => r.total).reverse(), y: cxCum.map(r => r.short).reverse(),
    type: "bar", orientation: "h",
    marker: { color: cxCum.map(r => r.total).reverse(), colorscale: "Oranges" },
    text: cxCum.map(r => Math.round(r.total).toLocaleString()).reverse(), textposition: "outside",
    hovertemplate: "%{y}<br>총 CapEx %{x:,.0f} bn<extra></extra>",
  }], { xaxis: { title: "총 누적 CapEx (IDR bn, 전 기간)" }, margin: { l: 220, r: 80, t: 10, b: 40 }, height: Math.max(360, cxCum.length * 24 + 60) });

  // ── ㉜ Earnings Quality Trend
  // Top 8 NP companies — CFO + NP overlay
  const top8NP = fin.filter(r => r.yr === ly && r.net_profit != null)
    .sort((a, b) => b.net_profit - a.net_profit).slice(0, 8).map(r => r.short);
  const eqTraces = [];
  top8NP.forEach(co => {
    const series = fin.filter(r => r.short === co && annualYears.includes(r.yr)).sort((a, b) => a.yr.localeCompare(b.yr));
    eqTraces.push({
      x: series.map(r => `${r.yr}\n${co.slice(0, 8)}`), y: series.map(r => r.cfo),
      type: "bar", name: `CFO — ${co}`, marker: { color: colorMap[co], opacity: 0.6 }, legendgroup: co, showlegend: false,
    });
    eqTraces.push({
      x: series.map(r => `${r.yr}\n${co.slice(0, 8)}`), y: series.map(r => r.net_profit),
      type: "scatter", mode: "lines+markers", name: co, line: { color: colorMap[co], width: 2.5 }, marker: { color: colorMap[co], size: 8 }, legendgroup: co,
    });
  });
  plot("ov-eq-overlay", eqTraces, {
    yaxis: { title: "IDR bn", zeroline: true },
    xaxis: { tickangle: -45, automargin: true },
    legend: { orientation: "h", y: -0.35 },
    margin: { l: 70, r: 20, t: 10, b: 130 }, height: 480, barmode: "group",
  });

  // 다년 평균 CFO/NP (annualYears)
  const eqAvg = companies.map(co => {
    const series = fin.filter(r => r.short === co && annualYears.includes(r.yr) && r.cfo != null && r.net_profit != null && r.net_profit > 0);
    if (series.length === 0) return null;
    const ratios = series.map(r => r.cfo / r.net_profit * 100);
    const m = ratios.reduce((s, v) => s + v, 0) / ratios.length;
    return { short: co, region: series[series.length - 1].region, avg_eq: m, n: series.length };
  }).filter(Boolean).sort((a, b) => b.avg_eq - a.avg_eq);

  plot("ov-eq-avg", [{
    x: eqAvg.map(r => Math.min(400, r.avg_eq)).reverse(), y: eqAvg.map(r => r.short).reverse(),
    type: "bar", orientation: "h",
    marker: { color: eqAvg.map(r => r.avg_eq >= 80 && r.avg_eq <= 150 ? "#2ca02c" : r.avg_eq >= 50 ? "#1f77b4" : r.avg_eq >= 0 ? "#ffbb78" : "#d62728").reverse() },
    text: eqAvg.map(r => r.avg_eq > 400 ? ">400%" : r.avg_eq.toFixed(0) + "%").reverse(), textposition: "outside",
    hovertemplate: "%{y}<br>Avg CFO/NP %{x:.1f}% (n=%{customdata})<extra></extra>",
    customdata: eqAvg.map(r => r.n).reverse(),
  }], { xaxis: { title: "다년 평균 CFO/NP (%) — 80-150% 우수" }, margin: { l: 220, r: 80, t: 10, b: 50 }, height: Math.max(360, eqAvg.length * 24 + 60) });

  // Divergence: CFO 합 − NP 합 (전 기간)
  const eqDiv = companies.map(co => {
    const series = fin.filter(r => r.short === co);
    const cfoSum = series.reduce((s, r) => s + (r.cfo || 0), 0);
    const npSum = series.reduce((s, r) => s + (r.net_profit || 0), 0);
    return { short: co, region: series[series.length - 1]?.region, div: cfoSum - npSum, cfoSum, npSum };
  }).sort((a, b) => Math.abs(b.div) - Math.abs(a.div));

  plot("ov-eq-div", [{
    x: eqDiv.map(r => r.div).reverse(), y: eqDiv.map(r => r.short).reverse(),
    type: "bar", orientation: "h",
    marker: { color: eqDiv.map(r => r.div >= 0 ? "#2ca02c" : "#d62728").reverse() },
    text: eqDiv.map(r => (r.div >= 0 ? "+" : "") + Math.round(r.div).toLocaleString()).reverse(), textposition: "outside",
    hovertemplate: "%{y}<br>CFO−NP %{x:,.0f} bn<br>CFO 합 %{customdata[0]:,.0f} bn / NP 합 %{customdata[1]:,.0f} bn<extra></extra>",
    customdata: eqDiv.map(r => [r.cfoSum, r.npSum]).reverse(),
  }], { xaxis: { title: "누적 CFO − NP (IDR bn) — 양수=CFO ≥ NP", zeroline: true }, margin: { l: 220, r: 80, t: 10, b: 50 }, height: Math.max(360, eqDiv.length * 24 + 60) });

  // ── ㉛ Asset Turnover Trend (annual years 전체)
  const atSeries = companies.map(co => {
    const series = fin.filter(r => r.short === co && annualYears.includes(r.yr) && r.dp_turnover != null).sort((a, b) => a.yr.localeCompare(b.yr));
    return { short: co, series, region: series[series.length - 1]?.region };
  }).filter(x => x.series.length > 0);

  // Top 8 시계열 (기준연도 dp_turnover 상위)
  const atLast = atSeries.map(s => ({ ...s, last: s.series[s.series.length - 1].dp_turnover }))
    .filter(s => s.last != null).sort((a, b) => b.last - a.last).slice(0, 8);
  plot("ov-at-top", atLast.map(s => ({
    x: s.series.map(r => r.yr), y: s.series.map(r => r.dp_turnover),
    name: s.short, type: "scatter", mode: "lines+markers",
    line: { color: colorMap[s.short], width: 2.5 }, marker: { color: colorMap[s.short], size: 8 },
  })), {
    yaxis: { title: "Asset Turnover (x)", zeroline: true },
    legend: { orientation: "h", y: -0.18 },
    margin: { l: 70, r: 20, t: 10, b: 60 }, height: 480,
  });

  // Improvement = latest - first
  const atImp = atSeries.map(s => {
    if (s.series.length < 2) return null;
    return { short: s.short, region: s.region, first: s.series[0].dp_turnover, last: s.series[s.series.length - 1].dp_turnover, delta: s.series[s.series.length - 1].dp_turnover - s.series[0].dp_turnover };
  }).filter(Boolean).sort((a, b) => b.delta - a.delta);

  plot("ov-at-improve", [{
    x: atImp.map(r => r.delta).reverse(), y: atImp.map(r => r.short).reverse(),
    type: "bar", orientation: "h",
    marker: { color: atImp.map(r => r.delta >= 0 ? "#2ca02c" : "#d62728").reverse() },
    text: atImp.map(r => (r.delta >= 0 ? "+" : "") + r.delta.toFixed(3) + "x").reverse(), textposition: "outside",
    hovertemplate: "%{y}<br>Δ %{x:+.3f}x (first→latest)<extra></extra>",
  }], { xaxis: { title: "Asset Turnover Δ (latest − first)", zeroline: true }, margin: { l: 220, r: 80, t: 10, b: 50 }, height: Math.max(360, atImp.length * 24 + 60) });

  // Slope chart: 두 점 (first, last) 라인
  plot("ov-at-slope", atImp.map(r => ({
    x: ["First", "Latest"], y: [r.first, r.last], name: r.short, type: "scatter",
    mode: "lines+markers", line: { color: r.delta >= 0 ? "#2ca02c" : "#d62728", width: 1.5 },
    marker: { size: 5 }, hovertemplate: r.short + "<br>%{x}: %{y:.3f}x<extra></extra>",
  })), {
    yaxis: { title: "Asset Turnover (x)" }, showlegend: false,
    margin: { l: 70, r: 20, t: 10, b: 50 }, height: 480,
  });

  // ── ㉙ Profitability Stability (전 기간 NP 변동성)
  const profitStab = companies.map(co => {
    const series = fin.filter(r => r.short === co && r.net_profit != null);
    if (series.length === 0) return null;
    const profitYears = series.filter(r => r.net_profit > 0).length;
    const lossYears = series.filter(r => r.net_profit <= 0).length;
    const nps = series.map(r => r.net_profit);
    const m = nps.reduce((s, v) => s + v, 0) / nps.length;
    const sd = nps.length > 1 ? Math.sqrt(nps.reduce((s, v) => s + (v - m) ** 2, 0) / (nps.length - 1)) : null;
    const cv = (sd != null && Math.abs(m) > 0.01) ? sd / Math.abs(m) : null;
    const profit_share = (profitYears + lossYears > 0) ? profitYears / (profitYears + lossYears) * 100 : null;
    return { short: co, region: series[series.length - 1].region, profitYears, lossYears, mean_np: m, cv, profit_share, revenue: series[series.length - 1].revenue };
  }).filter(Boolean);

  const pyRows = [...profitStab].sort((a, b) => b.profit_share - a.profit_share);
  plot("ov-profit-years", [
    { x: pyRows.map(r => r.short), y: pyRows.map(r => r.profitYears), type: "bar", name: "흑자 연수", marker: { color: "#2ca02c" } },
    { x: pyRows.map(r => r.short), y: pyRows.map(r => r.lossYears), type: "bar", name: "적자 연수", marker: { color: "#d62728" } },
  ], {
    barmode: "stack", yaxis: { title: "보고 연수" },
    xaxis: { tickangle: -45, automargin: true },
    legend: { orientation: "h", y: -0.35 },
    margin: { l: 70, r: 20, t: 10, b: 130 }, height: 480,
  });

  const cvRows = profitStab.filter(r => r.cv != null && r.cv < 50).sort((a, b) => b.cv - a.cv);
  plot("ov-np-cv", [{
    x: cvRows.map(r => r.cv).reverse(), y: cvRows.map(r => r.short).reverse(),
    type: "bar", orientation: "h",
    marker: { color: cvRows.map(r => r.cv > 3 ? "#d62728" : r.cv > 1.5 ? "#ffbb78" : r.cv > 0.5 ? "#1f77b4" : "#2ca02c").reverse() },
    text: cvRows.map(r => r.cv.toFixed(2)).reverse(), textposition: "outside",
    hovertemplate: "%{y}<br>CV %{x:.2f}<br>(낮을수록 안정)<extra></extra>",
  }], { xaxis: { title: "Net Profit 변동 계수 (CV) — 낮을수록 안정", range: [0, Math.max(...cvRows.map(r => r.cv)) * 1.2] }, margin: { l: 220, r: 80, t: 10, b: 50 }, height: Math.max(360, cvRows.length * 24 + 60) });

  // 흑자 지속률 × 평균 NP 4분면
  const psQuad = profitStab.filter(r => r.profit_share != null && r.mean_np != null);
  plot("ov-profit-quad", [{
    x: psQuad.map(r => r.profit_share), y: psQuad.map(r => r.mean_np),
    mode: "markers+text", type: "scatter",
    text: psQuad.map(r => r.short), textposition: "top center", textfont: { size: 9 },
    marker: {
      size: psQuad.map(r => Math.max(10, Math.min(48, Math.sqrt(Math.abs(r.revenue) || 100) / 4))),
      color: psQuad.map(r => REGION_COLOR[r.region] || "#7f7f7f"),
      opacity: 0.8, line: { color: "#fff", width: 1 },
    },
    hovertemplate: "%{text}<br>흑자율 %{x:.0f}%<br>평균 NP %{y:,.0f} bn<extra></extra>",
  }], {
    xaxis: { title: "흑자 지속률 (%)", range: [-5, 105] },
    yaxis: { title: "평균 Net Profit (IDR bn)", zeroline: true },
    margin: { l: 70, r: 20, t: 10, b: 50 }, height: 480, showlegend: false,
  });

  // FCF Conversion (FCF / Revenue %) — 전사 비교 (한 번만)
  const fcRowsConv = fin.filter(r => r.yr === ly && r.fcf != null && r.revenue).map(r => ({
    short: r.short, fcf_conv: r.fcf / r.revenue * 100, region: r.region,
  })).sort((a, b) => b.fcf_conv - a.fcf_conv);
  plot("ov-fcf-conv", [{
    x: fcRowsConv.map(r => r.fcf_conv).reverse(), y: fcRowsConv.map(r => r.short).reverse(),
    type: "bar", orientation: "h",
    marker: { color: fcRowsConv.map(r => r.fcf_conv >= 15 ? "#2ca02c" : r.fcf_conv >= 5 ? "#1f77b4" : r.fcf_conv >= 0 ? "#ffbb78" : "#d62728").reverse() },
    text: fcRowsConv.map(r => r.fcf_conv.toFixed(1) + "%").reverse(), textposition: "outside",
  }], { xaxis: { title: "FCF / Revenue (%)", zeroline: true }, margin: { l: 220, r: 80, t: 10, b: 50 }, height: Math.max(400, fcRowsConv.length * 22 + 60) });

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
