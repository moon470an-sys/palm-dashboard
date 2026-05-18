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
    return {
      ...r, company: r.company, short: shortName(r.company),
      hq: cMeta.hq || "", core_region: cMeta.core_region || "", region: classifyRegion(cMeta.core_region),
      business_model: cMeta.business_model || "", primary_business: cMeta.primary_business || "",
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
  // net_debt/EBITDA leverage (derive after fin is built)
  fin.forEach(r => {
    r.nd_ebitda = (r.net_debt != null && r.ebitda && r.ebitda > 0) ? r.net_debt / r.ebitda : null;
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

    <h3 class="section-h">⑪ 종합 Ranking 테이블</h3>
    <div class="card"><h3>종합 ranking — 기준연도 (모든 지표 + 권역)</h3><div id="ov-table"></div></div>
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

    // ── 종합 ranking 테이블
    const tableRows = [...rows].sort((a, b) => (b.revenue || 0) - (a.revenue || 0)).map(r => ({
      회사: r.short, 권역: r.region,
      매출: r.revenue, 순이익: r.net_profit, EBITDA: r.ebitda,
      자산: r.assets, 부채: r.liab, 자본: r.equity, 시가총액: r.mcap,
      CFO: r.cfo, CapEx: r.capex, FCF: r.fcf,
      "P/E": r.pe, "P/B": r.pb, "DivY%": r.div_yield,
      "순이익률(%)": r.net_margin, "ROE(%)": r.roe, "ROA(%)": r.roa,
      "D/E(x)": r.debt_eq, "CurR": r.curr_ratio, "ND/EB": r.nd_ebitda,
    }));
    const numFmt = (d) => d == null ? "-" : Number(d).toLocaleString(undefined, { maximumFractionDigits: 0 });
    const pctFmt = (d) => d == null ? "-" : Number(d).toFixed(2);
    makeTable("ov-table", [
      { data: "회사", title: "회사" },
      { data: "권역", title: "권역" },
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
}
