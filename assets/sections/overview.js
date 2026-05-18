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
      ticker: cMeta.ticker || "", listed_status: cMeta.listed_status || "",
      ipo_year: (() => {
        const s = cMeta.listed_status || "";
        const m = s.match(/(?:since|IPO)\s+(?:\d+\s+\w+\s+)?(\d{4})/i) || s.match(/(\d{4})/);
        return m ? parseInt(m[1]) : null;
      })(),
      financial_risk_note: r.financial_risk_note || "", liquidity_note: r.liquidity_note || "",
      planted_ha: planted, ffb_t: ffb, cpo_t: cpo,
      area_sumatra: num(op.sumatra_area_ha) || 0, area_kalimantan: num(op.kalimantan_area_ha) || 0,
      area_sulawesi: num(op.sulawesi_area_ha) || 0, area_other: num(op.other_region_area_ha) || 0,
      mills_n: num(op.mills_count), mill_cap_tph: num(op.mill_capacity_tph),
      ffb_processed_t: num(op.ffb_processed_t), third_party_ffb_t: num(op.third_party_ffb_t),
      mature_ha: num(op.mature_area_ha), immature_ha: num(op.immature_area_ha),
      nucleus_ha: num(op.nucleus_area_ha), plasma_ha: num(op.plasma_area_ha),
      oer_pct: num(op.oer_reported_pct), cpo_price_kg: num(op.average_cpo_selling_price_local_per_kg),
      rev_per_ha: (revenue && planted) ? revenue * 1e9 / planted : null,  // IDR per ha
      cpo_per_ha: (cpo && planted) ? cpo / planted : null,  // ton/ha CPO
      ffb_per_ha: (ffb && planted) ? ffb / planted : null,
      revenue, net_profit: np,
      gross_profit: num(r.gross_profit_idr_bn), ebit: num(r.ebit_idr_bn),
      ebitda: num(r.ebitda_reported_idr_bn ?? r.ebitda_calculated_idr_bn) ?? num(r.ebit_idr_bn),
      assets: num(r.total_assets_idr_bn), liab: num(r.total_liabilities_idr_bn),
      equity: num(r.total_equity_idr_bn), debt: num(r.gross_debt_idr_bn),
      // EBITDA reported는 9/31뿐 — calculated 없으면 EBIT을 fallback (D&A 누락 시 EBITDA 과소평가)
      ebitda_src: num(r.ebitda_reported_idr_bn) != null ? "reported" : (num(r.ebitda_calculated_idr_bn) != null ? "calculated" : (num(r.ebit_idr_bn) != null ? "ebit_proxy" : null)),
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
      // Ratios: reported가 거의 비어있으므로 계산 fallback 항상 적용
      roe: num(r.roe_reported_pct) ?? (np != null && num(r.total_equity_idr_bn) && num(r.total_equity_idr_bn) > 0 ? np / num(r.total_equity_idr_bn) * 100 : null),
      roa: num(r.roa_reported_pct) ?? (np != null && num(r.total_assets_idr_bn) && num(r.total_assets_idr_bn) > 0 ? np / num(r.total_assets_idr_bn) * 100 : null),
      net_margin: num(r.net_margin_reported_pct) ?? (np != null && revenue ? np / revenue * 100 : null),
      gross_margin: num(r.gross_margin_reported_pct) ?? (num(r.gross_profit_idr_bn) != null && revenue ? num(r.gross_profit_idr_bn) / revenue * 100 : null),
      debt_eq: num(r.debt_per_equity_x) ?? (num(r.gross_debt_idr_bn) != null && num(r.total_equity_idr_bn) && num(r.total_equity_idr_bn) > 0 ? num(r.gross_debt_idr_bn) / num(r.total_equity_idr_bn) : null),
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
    // (Operating leverage proxy: EBITDA - EBIT ≈ D&A — derive 제거됨, 차트 미사용)
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
    // (Downstream Integration/Refined products — derive 제거됨, 4-9사만 보고하여 차트 미사용)
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
    // (Geographic HHI 제거됨 — 지역 mix는 ⑪ Operations stacked로 충분)
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

    <h2 class="group-h">📊 핵심 재무<span class="group-h-sub">매출 · 손익 · 자산/부채 · 현금흐름 (지표 31/31)</span></h2>

    <h3 class="section-h">① 회사별 랭킹 — 기준연도 (지표 select)</h3>
    <div class="card"><h3>전체 회사 막대 (정렬)</h3><div id="ov-rank" class="plot plot-tall"></div></div>

    <h3 class="section-h">② 시계열 — 모든 회사 한 차트</h3>
    <div class="grid-2">
      <div class="card"><h3>매출 시계열 (전사)</h3><div id="ov-rev-ts" class="plot plot-tall"></div></div>
      <div class="card"><h3>순이익 시계열 (전사)</h3><div id="ov-np-ts" class="plot plot-tall"></div></div>
    </div>

    <h3 class="section-h">③ 수익성·구조·산업 위계 (통합 매트릭스)</h3>
    <div class="grid-2">
      <div class="card"><h3>Bubble: 매출 × 순이익률 (크기=자산)</h3><div id="ov-bubble" class="plot plot-tall"></div></div>
      <div class="card"><h3>ROE vs ROA scatter</h3><div id="ov-roe-roa" class="plot plot-tall"></div></div>
    </div>
    <div class="card"><h3>Debt/Equity × 순이익률 — 레버리지 vs 수익성</h3><div id="ov-lev" class="plot plot-tall"></div></div>
    <div class="grid-2">
      <div class="card"><h3>총자산 Treemap (전사)</h3><div id="ov-tree-asset" class="plot plot-tall"></div></div>
      <div class="card"><h3>시가총액 Treemap</h3><div id="ov-tree-mcap" class="plot plot-tall"></div></div>
    </div>

    <h3 class="section-h">④ Cash Flow Deep Dive — 통합 (분해 · Waterfall · 효율 · Quality)</h3>
    <p class="notice">
      CFO 흐름 + 자본 사용 + 효율 매트릭스 + earnings quality 4축 통합. 회사 select로 waterfall 분석.
    </p>
    <div class="filter-bar">
      <label>Waterfall 회사:</label>
      <select id="ov-cf-co"></select>
      <span class="badge" id="ov-cf-info"></span>
    </div>
    <div class="grid-2">
      <div class="card"><h3>CFO 분해 100% (CapEx + Dividend + Retained)</h3><div id="ov-cf-alloc" class="plot plot-tall"></div></div>
      <div class="card"><h3>Cash Flow Waterfall (선택 회사)</h3><div id="ov-cf-waterfall" class="plot plot-tall"></div></div>
    </div>
    <div class="grid-2">
      <div class="card"><h3>FCF Margin × FCF Yield (효율, 크기=mcap)</h3><div id="ov-cf-fcf-scatter" class="plot plot-tall"></div></div>
      <div class="card"><h3>Earnings Quality: Top 8 회사 CFO(막대) vs NP(라인)</h3><div id="ov-cf-eq" class="plot plot-tall"></div></div>
    </div>

    <h3 class="section-h">⑤ Valuation & Returns — 통합 (Multiples · Dividend · Quality 매트릭스)</h3>
    <p class="notice">
      Multiple ranking + Quality 매트릭스 + 배당 분석 통합. Multiple/매트릭스 축은 select로 전환.
    </p>
    <div class="filter-bar">
      <label>Multiple ranking:</label>
      <select id="ov-val-metric">
        <option value="pe" selected>P/E (낮을수록 저평가)</option>
        <option value="pb">P/B</option>
        <option value="div_yield">Dividend Yield (높을수록 좋음)</option>
        <option value="earnings_yield">Earnings Yield (높을수록 좋음)</option>
      </select>
      <label>Quality 매트릭스 X축:</label>
      <select id="ov-val-axis">
        <option value="pe" selected>P/E</option>
        <option value="pb">P/B</option>
        <option value="div_yield">Dividend Yield</option>
      </select>
    </div>
    <div class="grid-2">
      <div class="card"><h3>Multiple ranking (선택)</h3><div id="ov-val-rank" class="plot plot-tall"></div></div>
      <div class="card"><h3>Quality × Multiple 매트릭스 (Hidden Gem 좌상단)</h3><div id="ov-val-quad" class="plot plot-tall"></div></div>
    </div>
    <div class="card"><h3>배당 분석 — Payout % / Div Total bn / FCF Coverage (3축 grouped)</h3><div id="ov-val-div" class="plot plot-tall"></div></div>

    <h2 class="group-h">🏭 산업 구조 & 다년 추세<span class="group-h-sub">권역·BM 분포 · 매출 집중도 · 다년 trend</span></h2>

    <h3 class="section-h">⑥ Industry Structure — 권역·Business Model·집중도</h3>
    <p class="notice">
      권역(Sumatra/Kalimantan/Java/etc) × Business Model(Upstream/Integrated/Downstream) × 매출 집중도.
    </p>
    <div class="grid-2">
      <div class="card"><h3>Region × Business Model — 회사 수 매트릭스 (stacked)</h3><div id="ov-ind-matrix" class="plot plot-tall"></div></div>
      <div class="card"><h3>Region·BM 평균 효율 (ROE / Margin / Quality)</h3><div id="ov-ind-eff" class="plot plot-tall"></div></div>
    </div>
    <div class="card"><h3>매출 집중도 — Cumulative Share Curve + Top5/10 reference</h3><div id="ov-ind-conc" class="plot plot-tall"></div></div>
    <div class="card"><h3>권역별 매출 시계열 (stacked area)</h3><div id="ov-ind-ts" class="plot plot-tall"></div></div>

    <h3 class="section-h">⑦ 성장률 (Growth) — YoY 매출·순이익 변화</h3>
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

    <h3 class="section-h">⑧ Multi-Year Trend Explorer — 8개 지표 통합</h3>
    <p class="notice">
      회사별 다년 시계열을 한 화면에서 비교: 지표 select로 Top 12 라인 + Δ ranking + CAGR ranking 동시 갱신. 기존 분산된 trend 차트를 모두 통합.
    </p>
    <div class="filter-bar">
      <label>지표:</label>
      <select id="ov-trend-metric">
        <option value="revenue" selected>매출 (Revenue, bn)</option>
        <option value="net_profit">순이익 (Net Profit, bn)</option>
        <option value="ebitda">EBITDA (bn)</option>
        <option value="m_ebitda">EBITDA Margin (%)</option>
        <option value="dp_turnover">Asset Turnover (x)</option>
        <option value="mcap">Market Cap (bn)</option>
        <option value="net_debt">Net Debt (bn)</option>
        <option value="nwc">Working Capital (bn)</option>
      </select>
      <span class="badge" id="ov-trend-info"></span>
    </div>
    <div class="card"><h3>Top 12 회사 시계열 (선택 지표)</h3><div id="ov-trend-line" class="plot plot-tall"></div></div>
    <div class="grid-2">
      <div class="card"><h3>Δ (latest − first) ranking</h3><div id="ov-trend-delta" class="plot plot-tall"></div></div>
      <div class="card"><h3>CAGR (%/yr) ranking</h3><div id="ov-trend-cagr" class="plot plot-tall"></div></div>
    </div>

    <h3 class="section-h">⑨ Balance Sheet Deep Dive — 통합 (자본구조 · 자산 · 부채 만기 · 유동성)</h3>
    <p class="notice">
      자본구조 + 자산 구성 + 부채 만기 + 유동성 ratio + Net Debt 분해 통합. 5개 차트로 BS 전체 한눈에.
    </p>
    <div class="grid-2">
      <div class="card"><h3>자본구조 — Equity / Short-term Liab / Long-term Liab stacked</h3><div id="ov-bs-cap" class="plot plot-tall"></div></div>
      <div class="card"><h3>자산 구성 — Cash / Current(non-cash) / Non-Current (100%)</h3><div id="ov-bs-asset" class="plot plot-tall"></div></div>
    </div>
    <div class="card"><h3>Net Debt vs Cash 양방향 (음수=Cash, 양수=Debt)</h3><div id="ov-bs-nd" class="plot plot-tall"></div></div>
    <div class="grid-2">
      <div class="card"><h3>Leverage & Liquidity 매트릭스 (CurR / ND-EB / D-A grouped)</h3><div id="ov-bs-ratio" class="plot plot-tall"></div></div>
      <div class="card"><h3>Cash Position 매트릭스 (Cash/Mcap × Cash Ratio)</h3><div id="ov-bs-cash" class="plot plot-tall"></div></div>
    </div>

    <h3 class="section-h">⑩ Per-Share & 주가 시계열 — EPS · NAV · DPS · 종가</h3>
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

    <h2 class="group-h">🌴 농장 · 생산 Capa · 효율<span class="group-h-sub">Planted ha · Mill 처리능력 · CPO 수율 · OER (24/31 보고)</span></h2>

    <h3 class="section-h">⑪ 농장 규모 · 생산 Capa · 효율</h3>
    <p class="notice">
      4축 운영 분석: Planted ha + 지역 mix + 나무 성숙도 + Mill 처리능력 + CPO/FFB 생산량 + 단위면적당 효율.
      ※ 정제(downstream)·수출비중·평균수령은 4-10사만 보고하여 제외.
    </p>
    <div class="card"><h3>회사별 Planted Area + 지역 mix (Sumatra/Kalimantan/기타 stacked, 큰 순)</h3><div id="ov-op-area" class="plot plot-tall"></div></div>
    <div class="grid-2">
      <div class="card"><h3>FFB 생산 (ton, 자체) ranking</h3><div id="ov-op-ffb" class="plot plot-tall"></div></div>
      <div class="card"><h3>CPO 생산 (ton) ranking — 정제 직전 단계</h3><div id="ov-op-cpo" class="plot plot-tall"></div></div>
    </div>
    <div class="grid-2">
      <div class="card"><h3>Tree Maturity & Plasma — 생산기 vs 미성숙, 외부 smallholder 비중</h3><div id="ov-op-tree" class="plot plot-tall"></div></div>
      <div class="card"><h3>생산 효율: CPO/Mature ha × OER % (크기=Mill capacity)</h3><div id="ov-op-prod" class="plot plot-tall"></div></div>
    </div>
    <div class="card"><h3>Mill 운영 Capa: 처리능력 tph × 자체 FFB (색=3rd party share)</h3><div id="ov-op-mill" class="plot plot-tall"></div></div>

    <h2 class="group-h">🏆 종합 평가 & 비교 도구<span class="group-h-sub">Quality/Risk · 회사 비교 · 분해 · 일관성</span></h2>

    <h3 class="section-h">⑫ Quality & Risk 종합 평가 (통합)</h3>
    <p class="notice">
      Quality Score (5축: ROE·CFO/NP·ND/EBITDA·Yield·Size, 각 0-20) + Risk Score (재무 위험 + 텍스트 hint). 4분면으로 회사 포지셔닝 + Top 8 radar + Red Flags 노트.
    </p>
    <div class="card"><h3>Quality × Risk 4분면 (이상=좌상단 고품질·저위험)</h3><div id="ov-qr-quad" class="plot plot-tall"></div></div>
    <div class="grid-2">
      <div class="card"><h3>회사별 Quality vs Risk 동시 ranking</h3><div id="ov-qr-bar" class="plot plot-tall"></div></div>
      <div class="card"><h3>Top 8 Quality 회사 5축 Radar</h3><div id="ov-radar" class="plot plot-tall"></div></div>
    </div>
    <div class="card">
      <h3>Red Flags 노트 (key_red_flags + 재무 risk note) — 검색·정렬</h3>
      <div id="ov-risk-table"></div>
    </div>

    <h3 class="section-h">⑬ Compare Tool — Peer 중앙값 + Percentile + 두 회사 비교 (통합)</h3>
    <p class="notice">
      회사 select → Peer 중앙값/Top quartile 비교 + 8지표 percentile bar. 회사 2 선택 시 두 회사 percentile overlay 비교.
    </p>
    <div class="filter-bar">
      <label>회사 A:</label>
      <select id="ov-cmp-co1"></select>
      <label>회사 B (overlay):</label>
      <select id="ov-cmp-co2"></select>
      <label>Peer 기준:</label>
      <select id="ov-cmp-peer">
        <option value="region" selected>같은 권역</option>
        <option value="all">전체 34사</option>
      </select>
      <span class="badge" id="ov-cmp-info"></span>
    </div>
    <div class="grid-2">
      <div class="card"><h3>A vs Peer median Δ% (양수=A 우수)</h3><div id="ov-cmp-delta" class="plot plot-tall"></div></div>
      <div class="card"><h3>A vs B Percentile overlay (0=낮음 100=최상)</h3><div id="ov-cmp-pct" class="plot plot-tall"></div></div>
    </div>

    <h3 class="section-h">⑭ DuPont 분해 — ROE = 마진 × 자산회전 × 레버리지</h3>
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

    <h3 class="section-h">⑮ Margin 분석 통합 (Cascade · Compression · Operating Leverage · Tax/Interest)</h3>
    <p class="notice">
      4단계 마진 분해 + 다년 압축 detector + Operating Leverage + EBIT→NP 전환율 통합. Cascade의 EBIT→Net 차이는 세금·이자 부담을 나타냄.
    </p>
    <div class="card"><h3>4-단계 마진 동시 비교 (Gross/EBITDA/EBIT/Net % grouped)</h3><div id="ov-mrg-cascade" class="plot plot-tall"></div></div>
    <div class="grid-2">
      <div class="card"><h3>Margin Compression: Gross Δ × Net Δ (좌하단=동시 압축)</h3><div id="ov-mrg-compress" class="plot plot-tall"></div></div>
      <div class="card"><h3>Operating Leverage: Revenue CAGR × EBITDA CAGR (대각선 위=positive)</h3><div id="ov-mrg-opl" class="plot plot-tall"></div></div>
    </div>
    <div class="card"><h3>EBIT vs NP scatter (y=x 라인 가까이=세금/이자 부담 작음)</h3><div id="ov-mrg-ebit-np" class="plot plot-tall"></div></div>

    <h3 class="section-h">⑯ Consistency 분석 — 3yr 평균 + 전기간 안정성 통합</h3>
    <p class="notice">
      최근 3년 평균 (Smoother ROE/Margin) + 전 기간 흑자 지속률·NP 변동 계수 결합. "꾸준히 우량" 회사 식별.
    </p>
    <div class="grid-2">
      <div class="card"><h3>3yr 평균 ROE vs 변동성(StdDev) — Consistency Map</h3><div id="ov-consistency" class="plot plot-tall"></div></div>
      <div class="card"><h3>흑자 지속률 vs 평균 Net Profit (전 기간)</h3><div id="ov-profit-quad" class="plot plot-tall"></div></div>
    </div>
    <div class="card"><h3>흑자/적자 연수 + Net Profit CV (회사별 통합)</h3><div id="ov-cons-bar" class="plot plot-tall"></div></div>

    <h3 class="section-h">⑰ Quarterly Snapshot — 2026 Q1 가장 최신 데이터</h3>
    <p class="notice">
      2026 Q1 보고된 회사 단일 분기 매출/순이익. Annualized = Q1 × 4 (단순 추정, seasonality 미반영). 2025 full-year와 비교.
    </p>
    <div class="grid-2">
      <div class="card"><h3>2026 Q1 매출 ranking</h3><div id="ov-q1-rev" class="plot plot-tall"></div></div>
      <div class="card"><h3>2026 Q1 순이익 ranking (음수 포함)</h3><div id="ov-q1-np" class="plot plot-tall"></div></div>
    </div>
    <div class="card"><h3>2026 Q1 Annualized (×4) vs 2025 Full-Year — 가속/감속</h3><div id="ov-q1-annualized" class="plot plot-tall"></div></div>


    <h3 class="section-h">⑱ Best in Class Awards — 카테고리별 1위 회사</h3>
    <p class="notice">
      8개 핵심 카테고리에서 기준연도 1위 회사 + Top 3 시각 카드. 각 카테고리별 강자 한눈에.
    </p>
    <div class="card"><h3>Award Cards</h3><div id="ov-awards" class="awards"></div></div>


    <h3 class="section-h">⑲ 종합 Ranking 테이블</h3>
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
    // 농장·생산 KPI (4축: 농장·Capa·효율)
    const sumPlanted = rows.reduce((s, r) => s + (r.planted_ha || 0), 0);
    const sumCpo = rows.reduce((s, r) => s + (r.cpo_t || 0), 0);
    const sumFfb = rows.reduce((s, r) => s + (r.ffb_t || 0), 0);
    const sumMills = rows.reduce((s, r) => s + (r.mills_n || 0), 0);
    const sumMillCap = rows.reduce((s, r) => s + (r.mill_cap_tph || 0), 0);
    const plantedN = rows.filter(r => r.planted_ha > 0).length;
    const cpoN = rows.filter(r => r.cpo_t > 0).length;
    kpiBox.innerHTML = [
      // 재무 KPI
      kpiHTML("회사 수", `${rows.length}/${companies.length}`),
      kpiHTML(`${yr} 매출 합`, fmtBn(sumRev), "IDR bn"),
      kpiHTML(`${yr} 순이익 합`, fmtBn(sumNp), `흑자 ${profitable}사`, sumNp >= 0 ? "blue" : "error"),
      kpiHTML(`${yr} 총자산 합`, fmtBn(sumAsset)),
      kpiHTML(`${yr} 시가총액 합`, fmtBn(sumMcap), `${rows.filter(r => r.mcap != null).length}사`, "warn"),
      // 농장 KPI
      kpiHTML("🌴 Planted ha 합", sumPlanted > 0 ? `${(sumPlanted/1000).toFixed(0)}k ha` : "n/a", `${plantedN}사 보고`),
      kpiHTML("🛢 CPO 생산 합", sumCpo > 0 ? `${(sumCpo/1000).toFixed(0)}k ton` : "n/a", `${cpoN}사 보고`),
      kpiHTML("🌾 FFB 생산 합", sumFfb > 0 ? `${(sumFfb/1000).toFixed(0)}k ton` : "n/a"),
      kpiHTML("🏭 Mills 합", sumMills > 0 ? `${sumMills}` : "n/a", sumMillCap > 0 ? `처리 ${sumMillCap.toFixed(0)} tph` : ""),
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

    // ── ⑥ Cash Flow Deep Dive (통합)
    // 1. CFO 분해 100% (CapEx + Div + Retained)
    const cfaRows = rows.filter(r => r.cap_capex_share != null).sort((a, b) => (b.cfo || 0) - (a.cfo || 0));
    plot("ov-cf-alloc", [
      { x: cfaRows.map(r => r.short), y: cfaRows.map(r => r.cap_capex_share), type: "bar", name: "CapEx", marker: { color: "#ff7f0e" } },
      { x: cfaRows.map(r => r.short), y: cfaRows.map(r => r.cap_div_share), type: "bar", name: "Dividend", marker: { color: "#1f77b4" } },
      { x: cfaRows.map(r => r.short), y: cfaRows.map(r => Math.max(0, r.cap_retained_share)), type: "bar", name: "Retained (≥0)", marker: { color: "#2ca02c" } },
    ], {
      barmode: "stack", yaxis: { title: "% of CFO" },
      xaxis: { tickangle: -45, automargin: true },
      legend: { orientation: "h", y: -0.35 },
      margin: { l: 60, r: 20, t: 10, b: 130 }, height: 480,
    });

    // 2. Cash Flow Waterfall (회사 select — 동적, renderYearScoped 외부에서 처리)

    // 3. FCF margin × FCF yield scatter (살림)
    const fsRows = rows.filter(r => r.fcf_margin != null && r.fcf_yield != null);
    plot("ov-cf-fcf-scatter", [{
      x: fsRows.map(r => r.fcf_margin), y: fsRows.map(r => r.fcf_yield),
      mode: "markers+text", type: "scatter",
      text: fsRows.map(r => r.short), textposition: "top center", textfont: { size: 9 },
      marker: {
        size: fsRows.map(r => Math.max(10, Math.min(50, Math.sqrt(r.mcap || 100) / 4))),
        color: fsRows.map(r => REGION_COLOR[r.region] || colorMap[r.short]), opacity: 0.75, line: { color: "#fff", width: 1 },
      },
      hovertemplate: "%{text}<br>FCF margin %{x:.2f}%<br>FCF yield %{y:.2f}%<extra></extra>",
    }], {
      xaxis: { title: "FCF / Revenue (%)", zeroline: true },
      yaxis: { title: "FCF / Market Cap (%) — Yield", zeroline: true },
      margin: { l: 60, r: 20, t: 10, b: 50 }, height: 480, showlegend: false,
    });

    // 4. Earnings Quality overlay: Top 8 NP companies — CFO bar + NP line (기준연도)
    const top8NPLy = [...rows].filter(r => r.net_profit != null).sort((a, b) => b.net_profit - a.net_profit).slice(0, 8);
    plot("ov-cf-eq", [
      { x: top8NPLy.map(r => r.short), y: top8NPLy.map(r => r.cfo), type: "bar", name: "CFO", marker: { color: "#2ca02c" } },
      { x: top8NPLy.map(r => r.short), y: top8NPLy.map(r => r.net_profit), type: "scatter", mode: "lines+markers", name: "Net Profit", line: { color: "#d62728", width: 2.5 }, marker: { color: "#d62728", size: 8 } },
    ], {
      yaxis: { title: "IDR bn", zeroline: true },
      xaxis: { tickangle: -45, automargin: true },
      legend: { orientation: "h", y: -0.3 },
      margin: { l: 70, r: 20, t: 10, b: 130 }, height: 480,
    });

    // ── ⑦ Valuation & Returns (통합)
    const VAL_META = {
      pe: { label: "P/E (x)", filter: (r) => r.pe > 0 && r.pe < 200, asc: true, fmt: (v) => v.toFixed(2) + "x" },
      pb: { label: "P/B (x)", filter: (r) => r.pb > 0 && r.pb < 50, asc: true, fmt: (v) => v.toFixed(2) + "x" },
      div_yield: { label: "Dividend Yield (%)", filter: (r) => r.div_yield > 0, asc: false, fmt: (v) => v.toFixed(2) + "%" },
      earnings_yield: { label: "Earnings Yield (%)", filter: (r) => r.earnings_yield != null, asc: false, fmt: (v) => v.toFixed(2) + "%" },
    };
    const valSel = document.getElementById("ov-val-metric");
    const valAxis = document.getElementById("ov-val-axis");

    const renderValRank = () => {
      const m = valSel.value;
      const meta = VAL_META[m];
      const rs = rows.filter(r => r[m] != null && meta.filter(r)).sort((a, b) => meta.asc ? a[m] - b[m] : b[m] - a[m]);
      plot("ov-val-rank", [{
        x: rs.map(r => r[m]).reverse(), y: rs.map(r => r.short).reverse(),
        type: "bar", orientation: "h",
        marker: { color: rs.map(r => r[m] >= 0 ? "#1f77b4" : "#d62728").reverse() },
        text: rs.map(r => meta.fmt(r[m])).reverse(), textposition: "outside",
      }], { xaxis: { title: meta.label, zeroline: true }, margin: { l: 220, r: 80, t: 10, b: 50 }, height: Math.max(360, rs.length * 22 + 60) });
    };

    const renderValQuad = () => {
      const m = valAxis.value;
      const meta = VAL_META[m];
      const rs = rows.filter(r => r.quality_score != null && r[m] != null && meta.filter(r) && r[m] < 100);
      plot("ov-val-quad", [{
        x: rs.map(r => r[m]), y: rs.map(r => r.quality_score),
        mode: "markers+text", type: "scatter",
        text: rs.map(r => r.short), textposition: "top center", textfont: { size: 9 },
        marker: {
          size: rs.map(r => Math.max(10, Math.min(50, Math.sqrt(r.mcap || 100) / 4))),
          color: rs.map(r => ({ A: "#2ca02c", B: "#1f77b4", C: "#ffbb78", D: "#d62728" }[r.quality_band] || "#7f7f7f")),
          opacity: 0.8, line: { color: "#fff", width: 1 },
        },
        hovertemplate: "%{text}<br>" + meta.label + " %{x}<br>Quality %{y:.1f}<extra></extra>",
      }], {
        xaxis: { title: meta.label + (meta.asc ? " (낮을수록 저평가)" : " (높을수록 좋음)") },
        yaxis: { title: "Quality Score" },
        margin: { l: 60, r: 20, t: 10, b: 50 }, height: 520, showlegend: false,
      });
    };

    // Dividend 3축 통합 차트: Payout / Div Total / FCF Coverage 동시
    const divRs = rows.filter(r => r.div_total_bn != null && r.div_total_bn > 0)
      .sort((a, b) => b.div_total_bn - a.div_total_bn);
    plot("ov-val-div", [
      { x: divRs.map(r => r.short), y: divRs.map(r => r.div_total_bn), type: "bar", name: "Div Total (bn)", marker: { color: "#1f77b4" }, yaxis: "y" },
      { x: divRs.map(r => r.short), y: divRs.map(r => r.payout_ratio), type: "scatter", mode: "lines+markers", name: "Payout %", line: { color: "#2ca02c", width: 2 }, marker: { size: 8 }, yaxis: "y2" },
      { x: divRs.map(r => r.short), y: divRs.map(r => r.fcf_div_coverage), type: "scatter", mode: "lines+markers", name: "FCF/Div (x)", line: { color: "#ff7f0e", width: 2, dash: "dot" }, marker: { size: 8 }, yaxis: "y3" },
    ], {
      yaxis: { title: "Div Total (IDR bn)" },
      yaxis2: { title: "Payout %", overlaying: "y", side: "right", position: 1 },
      yaxis3: { title: "FCF/Div (x)", overlaying: "y", side: "right", position: 0.92, anchor: "free" },
      xaxis: { tickangle: -45, automargin: true, domain: [0, 0.88] },
      legend: { orientation: "h", y: -0.35 },
      margin: { l: 70, r: 100, t: 10, b: 130 }, height: 480,
    });

    valSel.addEventListener("change", renderValRank);
    valAxis.addEventListener("change", renderValQuad);
    renderValRank();
    renderValQuad();

    // ── ⑧ Industry Structure 통합 (Region + BM + Concentration + IPO Vintage)
    const REGIONS = ["Sumatra", "Kalimantan", "Java", "Sulawesi", "Papua", "Diversified", "Other"];
    const BM_LIST_LOCAL = ["Upstream", "Integrated", "Downstream", "Other"];
    const BM_COLOR_LOCAL = { Upstream: "#2ca02c", Integrated: "#1f77b4", Downstream: "#ff7f0e", Other: "#7f7f7f" };

    // 1. Region × BM 매트릭스 (회사 수 stacked)
    const crMatrix = {};
    REGIONS.forEach(rg => { crMatrix[rg] = {}; BM_LIST_LOCAL.forEach(b => { crMatrix[rg][b] = 0; }); });
    rows.forEach(r => { (crMatrix[r.region] = crMatrix[r.region] || {})[r.bm_class] = (crMatrix[r.region]?.[r.bm_class] || 0) + 1; });
    const regionsActive = REGIONS.filter(rg => Object.values(crMatrix[rg] || {}).some(v => v > 0));
    plot("ov-ind-matrix", BM_LIST_LOCAL.map(b => ({
      x: regionsActive, y: regionsActive.map(rg => crMatrix[rg][b] || 0),
      type: "bar", name: b, marker: { color: BM_COLOR_LOCAL[b] },
    })), { barmode: "stack", yaxis: { title: "회사 수" }, legend: { orientation: "h", y: -0.18 }, margin: { l: 70, r: 20, t: 10, b: 60 }, height: 480 });

    // 2. Region/BM 평균 효율 (Region + BM 모두 grouped)
    const groupLabel = (g) => g;
    const regionAvgRoe = REGIONS.map(rg => { const rs = rows.filter(r => r.region === rg && r.roe != null); return rs.length ? rs.reduce((s, r) => s + r.roe, 0) / rs.length : null; });
    const regionAvgMrg = REGIONS.map(rg => { const rs = rows.filter(r => r.region === rg && r.net_margin != null); return rs.length ? rs.reduce((s, r) => s + r.net_margin, 0) / rs.length : null; });
    const regionAvgQ = REGIONS.map(rg => { const rs = rows.filter(r => r.region === rg && r.quality_score != null); return rs.length ? rs.reduce((s, r) => s + r.quality_score, 0) / rs.length : null; });
    plot("ov-ind-eff", [
      { x: REGIONS, y: regionAvgRoe, type: "bar", name: "평균 ROE %", marker: { color: "#1f77b4" } },
      { x: REGIONS, y: regionAvgMrg, type: "bar", name: "평균 Net Margin %", marker: { color: "#2ca02c" } },
      { x: REGIONS, y: regionAvgQ, type: "bar", name: "평균 Quality", marker: { color: "#ff7f0e" } },
    ], { barmode: "group", yaxis: { title: "값 (% 또는 score)", zeroline: true }, legend: { orientation: "h", y: -0.18 }, margin: { l: 70, r: 20, t: 10, b: 60 }, height: 480 });

    // 3. Cumulative Revenue Concentration Curve
    const concRows = rows.filter(r => r.revenue > 0).sort((a, b) => b.revenue - a.revenue);
    const totalRev = concRows.reduce((s, r) => s + r.revenue, 0);
    let cum = 0;
    const cumPoints = concRows.map((r, i) => { cum += r.revenue; return { idx: i + 1, short: r.short, cumPct: cum / totalRev * 100 }; });
    plot("ov-ind-conc", [{
      x: cumPoints.map(p => p.idx), y: cumPoints.map(p => p.cumPct),
      type: "scatter", mode: "lines+markers", line: { color: "#1f77b4", width: 3 }, marker: { color: "#1f77b4", size: 6 },
      text: cumPoints.map(p => p.short), hovertemplate: "#%{x}: %{text}<br>누적 %{y:.1f}%<extra></extra>",
    }], {
      xaxis: { title: "회사 순위 (매출 큰 순)" }, yaxis: { title: "누적 매출 점유 (%)", range: [0, 105] },
      margin: { l: 70, r: 20, t: 10, b: 50 }, height: 480, showlegend: false,
      shapes: [
        { type: "line", x0: 5, y0: 0, x1: 5, y1: 105, line: { color: "#d62728", dash: "dash", width: 1 } },
        { type: "line", x0: 10, y0: 0, x1: 10, y1: 105, line: { color: "#ff7f0e", dash: "dash", width: 1 } },
      ],
    });

    // 4. 권역별 매출 시계열
    const regionTsTraces = REGIONS.map(rg => {
      const y = allYears.map(yr => fin.filter(r => r.region === rg && r.yr === yr).reduce((s, r) => s + (r.revenue || 0), 0));
      return { x: allYears, y, name: rg, type: "scatter", mode: "lines", stackgroup: "rev", line: { color: REGION_COLOR[rg], width: 0 }, fillcolor: REGION_COLOR[rg] };
    }).filter(t => t.y.some(v => v > 0));
    plot("ov-ind-ts", regionTsTraces, { yaxis: { title: "매출 합 (IDR bn)" }, legend: { orientation: "h", y: -0.18 }, margin: { l: 70, r: 20, t: 10, b: 50 }, height: 480 });

    // ── ⑪ Balance Sheet Deep Dive (통합)
    // 1. 자본구조 stacked: Equity / Short-term Liab / Long-term Liab
    const bcRows = rows.filter(r => r.equity != null && r.ctl_bn != null && r.ltl != null).sort((a, b) => (b.assets || 0) - (a.assets || 0));
    plot("ov-bs-cap", [
      { x: bcRows.map(r => r.short), y: bcRows.map(r => r.equity), type: "bar", name: "Equity", marker: { color: "#2ca02c" } },
      { x: bcRows.map(r => r.short), y: bcRows.map(r => r.ltl), type: "bar", name: "Long-term Liab", marker: { color: "#1f77b4" } },
      { x: bcRows.map(r => r.short), y: bcRows.map(r => r.ctl_bn), type: "bar", name: "Short-term Liab", marker: { color: "#d62728" } },
    ], { barmode: "stack", yaxis: { title: "IDR bn" }, xaxis: { tickangle: -45, automargin: true }, legend: { orientation: "h", y: -0.35 }, margin: { l: 70, r: 20, t: 10, b: 130 }, height: 480 });

    // 2. 자산 구성 100% stacked
    const baRows = rows.filter(r => r.ca_share != null && r.nca_share != null).sort((a, b) => (b.assets || 0) - (a.assets || 0));
    plot("ov-bs-asset", [
      { x: baRows.map(r => r.short), y: baRows.map(r => r.cash_share || 0), type: "bar", name: "Cash", marker: { color: "#2ca02c" } },
      { x: baRows.map(r => r.short), y: baRows.map(r => (r.ca_share || 0) - (r.cash_share || 0)), type: "bar", name: "Current (non-cash)", marker: { color: "#1f77b4" } },
      { x: baRows.map(r => r.short), y: baRows.map(r => r.nca_share || 0), type: "bar", name: "Non-Current", marker: { color: "#9467bd" } },
    ], { barmode: "stack", yaxis: { title: "% of Total Assets", range: [0, 105] }, xaxis: { tickangle: -45, automargin: true }, legend: { orientation: "h", y: -0.35 }, margin: { l: 70, r: 20, t: 10, b: 130 }, height: 480 });

    // 3. Net Debt vs Cash 양방향
    const ndDecomp = rows.filter(r => r.debt != null && r.cash != null).sort((a, b) => (b.debt - b.cash) - (a.debt - a.cash));
    plot("ov-bs-nd", [
      { x: ndDecomp.map(r => r.debt), y: ndDecomp.map(r => r.short), type: "bar", orientation: "h", name: "Gross Debt (+)", marker: { color: "#d62728" } },
      { x: ndDecomp.map(r => -r.cash), y: ndDecomp.map(r => r.short), type: "bar", orientation: "h", name: "Cash (−)", marker: { color: "#2ca02c" } },
    ], { barmode: "relative", xaxis: { title: "IDR bn (음수=Cash, 양수=Debt)", zeroline: true }, legend: { orientation: "h", y: -0.1 }, margin: { l: 220, r: 40, t: 10, b: 50 }, height: Math.max(400, ndDecomp.length * 22 + 60) });

    // 4. Leverage & Liquidity grouped (CurR, ND/EB, D/A 100% 정규화 표시)
    const lrRows = rows.filter(r => r.curr_ratio != null && r.nd_ebitda != null && r.debt_assets != null).sort((a, b) => b.curr_ratio - a.curr_ratio);
    plot("ov-bs-ratio", [
      { x: lrRows.map(r => r.short), y: lrRows.map(r => r.curr_ratio), type: "bar", name: "Current Ratio (x)", marker: { color: "#2ca02c" } },
      { x: lrRows.map(r => r.short), y: lrRows.map(r => r.nd_ebitda), type: "bar", name: "ND/EBITDA (x)", marker: { color: "#d62728" } },
      { x: lrRows.map(r => r.short), y: lrRows.map(r => r.debt_assets / 100), type: "bar", name: "Debt/Assets (% ÷ 100)", marker: { color: "#1f77b4" } },
    ], { barmode: "group", yaxis: { title: "값 (x or normalized)", zeroline: true }, xaxis: { tickangle: -45, automargin: true }, legend: { orientation: "h", y: -0.35 }, margin: { l: 70, r: 20, t: 10, b: 130 }, height: 480 });

    // 5. Cash Position 매트릭스: Cash/Mcap × Cash Ratio
    const cpRows = rows.filter(r => r.cash_to_mcap != null && r.cash_ratio != null);
    plot("ov-bs-cash", [{
      x: cpRows.map(r => Math.min(200, r.cash_to_mcap)), y: cpRows.map(r => Math.min(10, r.cash_ratio)),
      mode: "markers+text", type: "scatter",
      text: cpRows.map(r => r.short), textposition: "top center", textfont: { size: 9 },
      marker: {
        size: cpRows.map(r => Math.max(10, Math.min(48, Math.sqrt(r.cash || 100) / 4))),
        color: cpRows.map(r => REGION_COLOR[r.region] || "#7f7f7f"),
        opacity: 0.8, line: { color: "#fff", width: 1 },
      },
      hovertemplate: "%{text}<br>Cash/Mcap %{x:.1f}%<br>Cash Ratio %{y:.2f}x<extra></extra>",
    }], { xaxis: { title: "Cash / Market Cap (%)" }, yaxis: { title: "Cash / Current Liab (x)" }, margin: { l: 70, r: 20, t: 10, b: 50 }, height: 480, showlegend: false });

    // ── ⑬ Operations Deep Dive (통합)
    // 1. Planted Area + 지역 mix (회사별 stacked, planted_ha 큰 순)
    const opAreaRows = rows.filter(r => r.planted_ha > 0).sort((a, b) => b.planted_ha - a.planted_ha);
    plot("ov-op-area", [
      { x: opAreaRows.map(r => r.short), y: opAreaRows.map(r => r.area_sumatra), type: "bar", name: "Sumatra", marker: { color: "#2ca02c" } },
      { x: opAreaRows.map(r => r.short), y: opAreaRows.map(r => r.area_kalimantan), type: "bar", name: "Kalimantan", marker: { color: "#ff7f0e" } },
      { x: opAreaRows.map(r => r.short), y: opAreaRows.map(r => r.area_sulawesi), type: "bar", name: "Sulawesi", marker: { color: "#9467bd" } },
      { x: opAreaRows.map(r => r.short), y: opAreaRows.map(r => r.area_other), type: "bar", name: "Other/미보고", marker: { color: "#7f7f7f" } },
    ], { barmode: "stack", yaxis: { title: "Planted Area (ha)" }, xaxis: { tickangle: -45, automargin: true }, legend: { orientation: "h", y: -0.35 }, margin: { l: 70, r: 20, t: 10, b: 130 }, height: 480 });

    // 1b. FFB 생산 (자체) ranking
    const ffbRows = rows.filter(r => r.ffb_t > 0).sort((a, b) => b.ffb_t - a.ffb_t);
    plot("ov-op-ffb", [{
      x: ffbRows.map(r => r.ffb_t).reverse(), y: ffbRows.map(r => r.short).reverse(),
      type: "bar", orientation: "h",
      marker: { color: ffbRows.map(r => REGION_COLOR[r.region] || "#7f7f7f").reverse() },
      text: ffbRows.map(r => Math.round(r.ffb_t).toLocaleString()).reverse(), textposition: "outside",
      hovertemplate: "%{y}<br>FFB %{x:,.0f} ton<extra></extra>",
    }], { xaxis: { title: "FFB Production (ton)" }, margin: { l: 220, r: 80, t: 10, b: 40 }, height: Math.max(360, ffbRows.length * 22 + 60) });

    // 1c. CPO 생산 ranking
    const cpoRows = rows.filter(r => r.cpo_t > 0).sort((a, b) => b.cpo_t - a.cpo_t);
    plot("ov-op-cpo", [{
      x: cpoRows.map(r => r.cpo_t).reverse(), y: cpoRows.map(r => r.short).reverse(),
      type: "bar", orientation: "h",
      marker: { color: cpoRows.map(r => r.cpo_t).reverse(), colorscale: "YlOrRd" },
      text: cpoRows.map(r => Math.round(r.cpo_t).toLocaleString()).reverse(), textposition: "outside",
      hovertemplate: "%{y}<br>CPO %{x:,.0f} ton<extra></extra>",
    }], { xaxis: { title: "CPO Production (ton)" }, margin: { l: 220, r: 80, t: 10, b: 40 }, height: Math.max(360, cpoRows.length * 22 + 60) });

    // 2. Tree Maturity & Plasma (Mature/Immature/Plasma 3-metric grouped)
    const trRows = rows.filter(r => r.mature_share != null || r.plasma_share != null).sort((a, b) => (b.mature_share || 0) - (a.mature_share || 0));
    plot("ov-op-tree", [
      { x: trRows.map(r => r.short), y: trRows.map(r => r.mature_share), type: "bar", name: "Mature %", marker: { color: "#2ca02c" } },
      { x: trRows.map(r => r.short), y: trRows.map(r => r.immature_share), type: "bar", name: "Immature %", marker: { color: "#ffbb78" } },
      { x: trRows.map(r => r.short), y: trRows.map(r => r.plasma_share), type: "bar", name: "Plasma %", marker: { color: "#1f77b4" } },
    ], { barmode: "group", yaxis: { title: "%", range: [0, 105] }, xaxis: { tickangle: -45, automargin: true }, legend: { orientation: "h", y: -0.35 }, margin: { l: 60, r: 20, t: 10, b: 130 }, height: 480 });

    // 4. 생산 효율: CPO/Mature ha × OER % (size=mill cap)
    const peScatter = rows.filter(r => r.cpo_per_mature_ha != null && r.oer_pct != null && r.oer_pct > 0);
    const oerN = (v) => v > 1 ? v : v * 100;
    plot("ov-op-prod", [{
      x: peScatter.map(r => r.cpo_per_mature_ha), y: peScatter.map(r => oerN(r.oer_pct)),
      mode: "markers+text", type: "scatter",
      text: peScatter.map(r => r.short), textposition: "top center", textfont: { size: 9 },
      marker: {
        size: peScatter.map(r => Math.max(10, Math.min(48, Math.sqrt(r.mill_cap_tph || 50) * 2))),
        color: peScatter.map(r => REGION_COLOR[r.region] || "#7f7f7f"),
        opacity: 0.8, line: { color: "#fff", width: 1 },
      },
      hovertemplate: "%{text}<br>CPO/Mature ha %{x:.2f} t/ha<br>OER %{y:.2f}%<extra></extra>",
    }], { xaxis: { title: "CPO / Mature ha (ton/ha)" }, yaxis: { title: "OER (%)" }, margin: { l: 70, r: 20, t: 10, b: 50 }, height: 480, showlegend: false });

    // 5. Mill 운영: Capacity tph × 자체 FFB (색=3rd party share)
    const millScatter = rows.filter(r => r.mill_cap_tph != null && r.ffb_t > 0);
    plot("ov-op-mill", [{
      x: millScatter.map(r => r.mill_cap_tph), y: millScatter.map(r => r.ffb_t),
      mode: "markers+text", type: "scatter",
      text: millScatter.map(r => r.short), textposition: "top center", textfont: { size: 9 },
      marker: {
        size: millScatter.map(r => Math.max(10, Math.min(48, Math.sqrt(r.planted_ha || 100) / 30))),
        color: millScatter.map(r => r.third_party_share || 0),
        colorscale: "RdYlGn_r", showscale: true, colorbar: { title: "3rd party %" },
        opacity: 0.85, line: { color: "#fff", width: 1 },
      },
      hovertemplate: "%{text}<br>Mill cap %{x} tph<br>자체 FFB %{y:,.0f} ton<br>3rd party %{marker.color:.1f}%<extra></extra>",
    }], { xaxis: { title: "Mill Capacity (tph)", type: "log" }, yaxis: { title: "Own FFB Production (ton)", type: "log" }, margin: { l: 70, r: 50, t: 10, b: 50 }, height: 480, showlegend: false });

    // ── ⑭ Quality & Risk 종합 (통합)
    const qRows = [...rows].sort((a, b) => b.quality_score - a.quality_score);
    const QBAND_COLOR = (b) => ({ A: "#2ca02c", B: "#1f77b4", C: "#ffbb78", D: "#d62728" }[b] || "#7f7f7f");
    const RISK_COLOR = (s) => s >= 60 ? "#d62728" : s >= 30 ? "#ffbb78" : "#2ca02c";

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
      margin: { l: 60, r: 20, t: 10, b: 50 }, height: 520, showlegend: false,
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

    // Quality + Risk 동시 ranking (회사별 양방향 grouped bar)
    plot("ov-qr-bar", [
      { x: qRows.map(r => r.short), y: qRows.map(r => r.quality_score), type: "bar", name: "Quality", marker: { color: qRows.map(r => QBAND_COLOR(r.quality_band)) } },
      { x: qRows.map(r => r.short), y: qRows.map(r => -(r.risk_score || 0)), type: "bar", name: "Risk (음수 표기)", marker: { color: qRows.map(r => RISK_COLOR(r.risk_score || 0)) } },
    ], {
      barmode: "relative", yaxis: { title: "Score (Quality ↑ / Risk ↓)", range: [-110, 110], zeroline: true },
      xaxis: { tickangle: -45, automargin: true },
      legend: { orientation: "h", y: -0.35 },
      margin: { l: 60, r: 20, t: 10, b: 130 }, height: 520,
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

    // Red Flags 노트 테이블 (기존 ⑫에서 이동)
    const riskTbl = [...rows].filter(r => r.risk_score != null).sort((a, b) => b.risk_score - a.risk_score).map(r => ({
      회사: r.short, 권역: r.region,
      Risk: r.risk_score, Band: r.risk_band, Quality: r.quality_score,
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
      { data: "Quality", title: "Quality", render: (d) => d == null ? "-" : Number(d).toFixed(0) },
      { data: "매출", title: "매출 bn", render: (d) => d == null ? "-" : Number(d).toLocaleString(undefined, { maximumFractionDigits: 0 }) },
      { data: "순이익", title: "순이익 bn", render: (d) => d == null ? "-" : Number(d).toLocaleString(undefined, { maximumFractionDigits: 0 }) },
      { data: "ND/EB", title: "ND/EB", render: (d) => d == null ? "-" : Number(d).toFixed(2) },
      { data: "CurR", title: "CurR", render: (d) => d == null ? "-" : Number(d).toFixed(2) },
      { data: "red_flags", title: "Key Red Flags (요약)" },
      { data: "재무_risk_note", title: "재무 risk note" },
    ], riskTbl, { pageLength: 20, order: [[2, "desc"]] });

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

    // ── ㊽ Best in Class Awards
    const AWARDS = [
      { key: "revenue", label: "매출 (Revenue)", icon: "💰", fmt: (v) => `${Math.round(v).toLocaleString()} bn`, higher: true },
      { key: "net_profit", label: "순이익 (NP)", icon: "📈", fmt: (v) => `${Math.round(v).toLocaleString()} bn`, higher: true },
      { key: "roe", label: "ROE", icon: "🎯", fmt: (v) => v.toFixed(2) + "%", higher: true },
      { key: "net_margin", label: "Net Margin", icon: "✨", fmt: (v) => v.toFixed(2) + "%", higher: true },
      { key: "quality_score", label: "Quality Score", icon: "🏆", fmt: (v) => v.toFixed(1), higher: true },
      { key: "fcf", label: "FCF", icon: "💵", fmt: (v) => `${Math.round(v).toLocaleString()} bn`, higher: true },
      { key: "div_yield", label: "Div Yield", icon: "🎁", fmt: (v) => v.toFixed(2) + "%", higher: true },
      { key: "pe", label: "P/E (저평가)", icon: "💎", fmt: (v) => v.toFixed(2) + "x", higher: false, filter: (r) => r.pe > 0 && r.pe < 100 },
    ];
    const awardsHTML = AWARDS.map(award => {
      let pool = rows.filter(r => r[award.key] != null);
      if (award.filter) pool = pool.filter(award.filter);
      pool.sort((a, b) => award.higher ? b[award.key] - a[award.key] : a[award.key] - b[award.key]);
      const top3 = pool.slice(0, 3);
      return `
        <div class="award-card">
          <div class="award-head"><span class="award-icon">${award.icon}</span><span class="award-label">${award.label}</span></div>
          ${top3.length === 0 ? `<div class="award-empty">데이터 없음</div>` :
            top3.map((r, i) => `
              <div class="award-row award-rank-${i+1}">
                <div class="award-medal">${i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</div>
                <div class="award-co">${r.short}<div class="award-region">${r.region}</div></div>
                <div class="award-val">${award.fmt(r[award.key])}</div>
              </div>
            `).join("")}
        </div>
      `;
    }).join("");
    document.getElementById("ov-awards").innerHTML = awardsHTML;

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

    // ── ⑱ Margin 분석 통합 (Cascade + Compression + Operating Leverage)
    // 1. 4단계 마진 cascade
    const mcRows = rows.filter(r => r.m_net != null).sort((a, b) => b.m_net - a.m_net);
    plot("ov-mrg-cascade", [
      { x: mcRows.map(r => r.short), y: mcRows.map(r => r.m_gross), type: "bar", name: "Gross %", marker: { color: "#2ca02c" } },
      { x: mcRows.map(r => r.short), y: mcRows.map(r => r.m_ebitda), type: "bar", name: "EBITDA %", marker: { color: "#1f77b4" } },
      { x: mcRows.map(r => r.short), y: mcRows.map(r => r.m_ebit), type: "bar", name: "EBIT %", marker: { color: "#ff7f0e" } },
      { x: mcRows.map(r => r.short), y: mcRows.map(r => r.m_net), type: "bar", name: "Net %", marker: { color: "#d62728" } },
    ], { barmode: "group", yaxis: { title: "Margin (%)", zeroline: true }, xaxis: { tickangle: -45, automargin: true }, legend: { orientation: "h", y: -0.3 }, margin: { l: 70, r: 20, t: 10, b: 130 }, height: 480 });

    // 2. Margin Compression Detector: Gross Δ × Net Δ
    const mdRows = companies.map(co => {
      const s = fin.filter(r => r.short === co && annualYears.includes(r.yr) && r.m_gross != null && r.m_net != null).sort((a, b) => a.yr.localeCompare(b.yr));
      if (s.length < 2) return null;
      return {
        short: co, region: s[s.length - 1].region,
        gm_delta: s[s.length - 1].m_gross - s[0].m_gross,
        nm_delta: s[s.length - 1].m_net - s[0].m_net,
        revenue: s[s.length - 1].revenue,
      };
    }).filter(Boolean);
    plot("ov-mrg-compress", [{
      x: mdRows.map(r => r.gm_delta), y: mdRows.map(r => r.nm_delta),
      mode: "markers+text", type: "scatter",
      text: mdRows.map(r => r.short), textposition: "top center", textfont: { size: 9 },
      marker: {
        size: mdRows.map(r => Math.max(10, Math.min(48, Math.sqrt(Math.abs(r.revenue) || 100) / 4))),
        color: mdRows.map(r => (r.gm_delta < 0 && r.nm_delta < 0) ? "#d62728" : (r.gm_delta >= 0 && r.nm_delta >= 0) ? "#2ca02c" : "#ffbb78"),
        opacity: 0.8, line: { color: "#fff", width: 1 },
      },
      hovertemplate: "%{text}<br>Gross Δ %{x:+.2f}pp<br>Net Δ %{y:+.2f}pp<extra></extra>",
    }], { xaxis: { title: "Gross Margin Δ (pp)", zeroline: true }, yaxis: { title: "Net Margin Δ (pp)", zeroline: true }, margin: { l: 70, r: 20, t: 10, b: 50 }, height: 480, showlegend: false });

    // 3. Operating Leverage: Revenue CAGR × EBITDA CAGR
    const opLev = companies.map(co => {
      const s = fin.filter(r => r.short === co && annualYears.includes(r.yr) && r.revenue > 0 && r.ebitda != null && r.ebitda > 0).sort((a, b) => a.yr.localeCompare(b.yr));
      if (s.length < 2) return null;
      const years = s.length - 1;
      const revCagr = (Math.pow(s[s.length-1].revenue / s[0].revenue, 1/years) - 1) * 100;
      const ebCagr = (Math.pow(s[s.length-1].ebitda / s[0].ebitda, 1/years) - 1) * 100;
      return { short: co, region: s[s.length-1].region, revCagr, ebCagr, revenue: s[s.length-1].revenue };
    }).filter(Boolean).filter(r => isFinite(r.revCagr) && isFinite(r.ebCagr));
    const opMax = Math.max(...opLev.map(r => Math.max(Math.abs(r.revCagr), Math.abs(r.ebCagr))));
    plot("ov-mrg-opl", [{
      x: opLev.map(r => r.revCagr), y: opLev.map(r => r.ebCagr),
      mode: "markers+text", type: "scatter",
      text: opLev.map(r => r.short), textposition: "top center", textfont: { size: 9 },
      marker: {
        size: opLev.map(r => Math.max(10, Math.min(48, Math.sqrt(Math.abs(r.revenue) || 100) / 4))),
        color: opLev.map(r => (r.ebCagr - r.revCagr) >= 0 ? "#2ca02c" : "#d62728"),
        opacity: 0.8, line: { color: "#fff", width: 1 },
      },
      hovertemplate: "%{text}<br>Rev CAGR %{x:+.1f}%<br>EBITDA CAGR %{y:+.1f}%<extra></extra>",
    }], {
      xaxis: { title: "Revenue CAGR (%/yr)", zeroline: true }, yaxis: { title: "EBITDA CAGR (%/yr)", zeroline: true },
      margin: { l: 70, r: 20, t: 10, b: 50 }, height: 480, showlegend: false,
      shapes: [{ type: "line", x0: -opMax, y0: -opMax, x1: opMax, y1: opMax, line: { color: "#ccc", dash: "dot", width: 1 } }],
    });

    // 4. EBIT vs NP scatter (Tax/Interest 부담 시각화 — y=x 라인 가까이=부담 작음)
    const enRows = rows.filter(r => r.ebit != null && r.net_profit != null);
    const enMax = Math.max(...enRows.map(r => Math.max(Math.abs(r.ebit), Math.abs(r.net_profit))));
    plot("ov-mrg-ebit-np", [{
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
      shapes: [{ type: "line", x0: -enMax, y0: -enMax, x1: enMax, y1: enMax, line: { color: "#ccc", dash: "dot", width: 1 } }],
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

  // ── ⑥ Cash Flow Waterfall (통합 섹션의 인터랙티브 차트)
  const wfSel = document.getElementById("ov-cf-co");
  const wfInfo = document.getElementById("ov-cf-info");
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
    const divTotal = (r.div_total != null && r.shares_outstanding_mn != null) ? r.div_total * r.shares_outstanding_mn / 1000 : 0;
    const measure = ["absolute", "relative", "relative", "relative", "relative", "relative", "total"];
    const x = ["Revenue", "→ EBITDA", "→ CFO", "− CapEx", "= FCF", "− 배당", "Retained"];
    const y = [rev, ebitda - rev, cfo - ebitda, -capex, 0, -divTotal, 0];
    plot("ov-cf-waterfall", [{
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


  // ── ⑩ Multi-Year Trend Explorer (통합)
  const TREND_META = {
    revenue:     { label: "매출 (bn)", unit: "IDR bn", fmt: (v) => Math.round(v).toLocaleString(), bnLike: true },
    net_profit:  { label: "순이익 (bn)", unit: "IDR bn", fmt: (v) => Math.round(v).toLocaleString(), bnLike: true },
    ebitda:      { label: "EBITDA (bn)", unit: "IDR bn", fmt: (v) => Math.round(v).toLocaleString(), bnLike: true },
    m_ebitda:    { label: "EBITDA Margin (%)", unit: "%", fmt: (v) => v.toFixed(2) + "%", bnLike: false },
    dp_turnover: { label: "Asset Turnover (x)", unit: "x", fmt: (v) => v.toFixed(3) + "x", bnLike: false },
    mcap:        { label: "Market Cap (bn)", unit: "IDR bn", fmt: (v) => Math.round(v).toLocaleString(), bnLike: true },
    net_debt:    { label: "Net Debt (bn)", unit: "IDR bn", fmt: (v) => Math.round(v).toLocaleString(), bnLike: true },
    nwc:         { label: "Working Capital (bn)", unit: "IDR bn", fmt: (v) => Math.round(v).toLocaleString(), bnLike: true },
  };
  const trendSel = document.getElementById("ov-trend-metric");
  const trendInfo = document.getElementById("ov-trend-info");

  const renderTrend = () => {
    const m = trendSel.value;
    const meta = TREND_META[m];
    const series = companies.map(co => {
      const s = fin.filter(r => r.short === co && annualYears.includes(r.yr) && r[m] != null && (meta.bnLike ? true : isFinite(r[m]))).sort((a, b) => a.yr.localeCompare(b.yr));
      return { short: co, region: s[s.length - 1]?.region, s };
    }).filter(r => r.s.length > 0);

    trendInfo.textContent = `${meta.label} · ${series.length}사 · ${annualYears[0]}–${annualYears[annualYears.length-1]}`;

    // Top 12 (latest abs value 기준)
    const top12 = [...series].map(r => ({ ...r, last: r.s[r.s.length - 1][m] }))
      .filter(r => r.last != null).sort((a, b) => Math.abs(b.last) - Math.abs(a.last)).slice(0, 12);
    plot("ov-trend-line", top12.map(s => ({
      x: s.s.map(r => r.yr), y: s.s.map(r => r[m]),
      name: s.short, type: "scatter", mode: "lines+markers",
      line: { color: colorMap[s.short], width: 2 }, marker: { color: colorMap[s.short], size: 6 },
    })), {
      yaxis: { title: meta.unit, zeroline: true },
      legend: { orientation: "h", y: -0.18, font: { size: 9 } },
      margin: { l: 80, r: 20, t: 10, b: 80 }, height: 480,
    });

    // Δ (latest − first)
    const delta = series.filter(r => r.s.length >= 2).map(r => {
      const first = r.s[0][m], last = r.s[r.s.length - 1][m];
      return { short: r.short, region: r.region, first, last, delta: last - first };
    }).sort((a, b) => b.delta - a.delta);
    plot("ov-trend-delta", [{
      x: delta.map(r => r.delta).reverse(), y: delta.map(r => r.short).reverse(),
      type: "bar", orientation: "h",
      marker: { color: delta.map(r => r.delta >= 0 ? "#2ca02c" : "#d62728").reverse() },
      text: delta.map(r => (r.delta >= 0 ? "+" : "") + (meta.bnLike ? Math.round(r.delta).toLocaleString() : r.delta.toFixed(2))).reverse(),
      textposition: "outside",
      hovertemplate: "%{y}<br>Δ %{x:+,.2f}<br>%{customdata[0]} → %{customdata[1]}<extra></extra>",
      customdata: delta.map(r => [meta.fmt(r.first), meta.fmt(r.last)]).reverse(),
    }], { xaxis: { title: `Δ (latest − first) ${meta.unit}`, zeroline: true }, margin: { l: 200, r: 80, t: 10, b: 50 }, height: Math.max(360, delta.length * 22 + 60) });

    // CAGR (bnLike + 양수) 또는 단순 Δpp (margin, ratio)
    let cagrArr;
    if (meta.bnLike) {
      cagrArr = series.filter(r => r.s.length >= 2 && r.s[0][m] > 0 && r.s[r.s.length-1][m] > 0).map(r => {
        const years = r.s.length - 1;
        const c = (Math.pow(r.s[r.s.length-1][m] / r.s[0][m], 1/years) - 1) * 100;
        return { short: r.short, region: r.region, cagr: c };
      }).filter(r => isFinite(r.cagr)).sort((a, b) => b.cagr - a.cagr);
    } else {
      // margin/ratio: annualized 변화율 또는 pp/yr
      cagrArr = series.filter(r => r.s.length >= 2).map(r => {
        const years = r.s.length - 1;
        const c = (r.s[r.s.length-1][m] - r.s[0][m]) / years;  // pp/yr or x/yr
        return { short: r.short, region: r.region, cagr: c };
      }).sort((a, b) => b.cagr - a.cagr);
    }
    plot("ov-trend-cagr", [{
      x: cagrArr.map(r => r.cagr).reverse(), y: cagrArr.map(r => r.short).reverse(),
      type: "bar", orientation: "h",
      marker: { color: cagrArr.map(r => r.cagr >= (meta.bnLike ? 10 : 0.5) ? "#2ca02c" : r.cagr >= 0 ? "#1f77b4" : r.cagr >= (meta.bnLike ? -10 : -0.5) ? "#ffbb78" : "#d62728").reverse() },
      text: cagrArr.map(r => (r.cagr >= 0 ? "+" : "") + r.cagr.toFixed(meta.bnLike ? 1 : 3) + (meta.bnLike ? "%" : "")).reverse(),
      textposition: "outside",
    }], { xaxis: { title: meta.bnLike ? "CAGR (%/yr)" : "연 평균 변화 (단위/yr)", zeroline: true }, margin: { l: 200, r: 80, t: 10, b: 50 }, height: Math.max(360, cagrArr.length * 22 + 60) });
  };
  trendSel.addEventListener("change", renderTrend);
  renderTrend();

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

  // ㉙ 통합 bar: 흑자/적자 연수 (좌축) + Net Profit CV (우축 라인)
  const pyRows = [...profitStab].filter(r => r.cv != null && r.cv < 50).sort((a, b) => b.profit_share - a.profit_share);
  plot("ov-cons-bar", [
    { x: pyRows.map(r => r.short), y: pyRows.map(r => r.profitYears), type: "bar", name: "흑자 연수", marker: { color: "#2ca02c" }, yaxis: "y" },
    { x: pyRows.map(r => r.short), y: pyRows.map(r => r.lossYears), type: "bar", name: "적자 연수", marker: { color: "#d62728" }, yaxis: "y" },
    { x: pyRows.map(r => r.short), y: pyRows.map(r => r.cv), type: "scatter", mode: "lines+markers", name: "NP CV (변동)", line: { color: "#1f77b4", width: 2 }, marker: { size: 8 }, yaxis: "y2" },
  ], {
    barmode: "stack",
    yaxis: { title: "흑자/적자 연수" },
    yaxis2: { title: "NP CV (낮을수록 안정)", overlaying: "y", side: "right" },
    xaxis: { tickangle: -45, automargin: true },
    legend: { orientation: "h", y: -0.35 },
    margin: { l: 60, r: 60, t: 10, b: 130 }, height: 480,
  });

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

  // ── ⑮ Compare Tool (Peer + Percentile 통합)
  const cmpSel1 = document.getElementById("ov-cmp-co1");
  const cmpSel2 = document.getElementById("ov-cmp-co2");
  const cmpPeer = document.getElementById("ov-cmp-peer");
  const cmpInfo = document.getElementById("ov-cmp-info");
  cmpSel1.innerHTML = companies.map((c, i) => `<option value="${c}" ${i === 0 ? "selected" : ""}>${c}</option>`).join("");
  cmpSel2.innerHTML = companies.map((c, i) => `<option value="${c}" ${i === 1 ? "selected" : ""}>${c}</option>`).join("");

  const CMP_METRICS = [
    { key: "revenue", label: "Revenue (bn)", lower: false },
    { key: "net_margin", label: "Net Margin %", lower: false },
    { key: "roe", label: "ROE %", lower: false },
    { key: "fcf_margin", label: "FCF Margin %", lower: false },
    { key: "quality_score", label: "Quality Score", lower: false },
    { key: "div_yield", label: "Div Yield %", lower: false },
    { key: "nd_ebitda", label: "ND/EBITDA x", lower: true },
    { key: "cfo", label: "CFO (bn)", lower: false },
  ];

  const median = (arr) => {
    const a = arr.filter(v => v != null && !isNaN(v)).sort((x, y) => x - y);
    if (a.length === 0) return null;
    const m = Math.floor(a.length / 2);
    return a.length % 2 ? a[m] : (a[m-1] + a[m]) / 2;
  };
  const pctRank = (val, arr) => {
    const sorted = arr.filter(v => v != null && !isNaN(v)).sort((a, b) => a - b);
    if (sorted.length === 0 || val == null) return null;
    return sorted.filter(v => v < val).length / sorted.length * 100;
  };

  const renderCmp = () => {
    const co1 = cmpSel1.value, co2 = cmpSel2.value;
    const target = fin.find(r => r.short === co1 && r.yr === ly);
    const target2 = fin.find(r => r.short === co2 && r.yr === ly);
    if (!target) return;
    const peerPool = cmpPeer.value === "region"
      ? fin.filter(r => r.yr === ly && r.region === target.region && r.short !== co1)
      : fin.filter(r => r.yr === ly && r.short !== co1);
    cmpInfo.textContent = `A=${co1} (${target.region}) · B=${co2} · Peer ${peerPool.length}사 · ${ly}`;

    // Delta vs peer median (양수=좋음, lower-better는 부호 반전)
    const deltas = CMP_METRICS.map(m => {
      const med = median(peerPool.map(r => r[m.key]));
      const v = target[m.key];
      if (v == null || med == null || med === 0) return { label: m.label, delta: null };
      const delta = m.lower ? (med - v) / Math.abs(med) * 100 : (v - med) / Math.abs(med) * 100;
      return { label: m.label, delta };
    });
    plot("ov-cmp-delta", [{
      x: deltas.map(d => d.delta).reverse(), y: deltas.map(d => d.label).reverse(),
      type: "bar", orientation: "h",
      marker: { color: deltas.map(d => d.delta == null ? "#999" : d.delta >= 0 ? "#2ca02c" : "#d62728").reverse() },
      text: deltas.map(d => d.delta == null ? "n/a" : (d.delta >= 0 ? "+" : "") + d.delta.toFixed(0) + "%").reverse(),
      textposition: "outside",
    }], { xaxis: { title: `${co1} vs peer median (%) — 양수=좋음`, zeroline: true }, margin: { l: 160, r: 80, t: 10, b: 50 }, height: 420 });

    // Percentile overlay (A vs B)
    const lyRowsAll = fin.filter(r => r.yr === ly);
    const pctA = CMP_METRICS.map(m => pctRank(target[m.key], lyRowsAll.map(x => x[m.key])));
    const pctB = target2 ? CMP_METRICS.map(m => pctRank(target2[m.key], lyRowsAll.map(x => x[m.key]))) : CMP_METRICS.map(() => null);
    plot("ov-cmp-pct", [
      { x: CMP_METRICS.map(m => m.label), y: pctA, type: "bar", name: co1, marker: { color: "#1f77b4" } },
      { x: CMP_METRICS.map(m => m.label), y: pctB, type: "bar", name: co2, marker: { color: "#ff7f0e" } },
    ], { barmode: "group", yaxis: { title: "Percentile (0-100)", range: [0, 110] }, xaxis: { tickangle: -20, automargin: true }, legend: { orientation: "h", y: -0.2 }, margin: { l: 60, r: 20, t: 10, b: 90 }, height: 420 });
  };
  cmpSel1.addEventListener("change", renderCmp);
  cmpSel2.addEventListener("change", renderCmp);
  cmpPeer.addEventListener("change", renderCmp);
  renderCmp();

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
