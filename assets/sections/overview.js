// 종합 — Annual Report 34사 재무 한눈에 비교.
// IDR bn (10억 루피아) 단위, 기준연도 select 가능.
import { state, kpiHTML, fmtInt, plot, makeTable } from "../data.js";

const fmtBn = (n) => n == null ? "-" : `${Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 })} bn`;
const shortName = (s) => (s || "").replace(/^PT\s+/i, "").replace(/\s+Tbk\.?$/i, "").trim();
const num = (v) => (v == null || v === "" || isNaN(Number(v))) ? null : Number(v);

const PALETTE = ["#2ca02c","#1f77b4","#ff7f0e","#d62728","#9467bd","#8c564b","#e377c2","#7f7f7f","#bcbd22","#17becf",
                 "#aec7e8","#ffbb78","#98df8a","#ff9896","#c5b0d5","#c49c94","#f7b6d2","#c7c7c7","#dbdb8d","#9edae5",
                 "#1b9e77","#d95f02","#7570b3","#e7298a","#66a61e","#e6ab02","#a6761d","#666666","#fb9a99","#a6cee3",
                 "#b2df8a","#fdbf6f","#cab2d6","#ffff99"];

export function renderOverview(root) {
  const fin = (state.ar.financials || []).map(r => ({
    ...r, company: r.company, short: shortName(r.company),
    revenue: num(r.revenue_idr_bn), net_profit: num(r.net_profit_idr_bn),
    gross_profit: num(r.gross_profit_idr_bn), ebit: num(r.ebit_idr_bn),
    ebitda: num(r.ebitda_reported_idr_bn ?? r.ebitda_calculated_idr_bn),
    assets: num(r.total_assets_idr_bn), liab: num(r.total_liabilities_idr_bn),
    equity: num(r.total_equity_idr_bn), debt: num(r.gross_debt_idr_bn),
    cfo: num(r.cfo_idr_bn), capex: num(r.capex_idr_bn),
    mcap: num(r.market_cap_idr_bn), roe: num(r.roe_reported_pct),
    roa: num(r.roa_reported_pct), net_margin: num(r.net_margin_reported_pct),
    gross_margin: num(r.gross_margin_reported_pct),
    debt_eq: num(r.debt_per_equity_x), curr_ratio: num(r.current_ratio_x),
    yr: r.report_year,
  }));
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

    <h3 class="section-h">⑥ Heatmap & Ranking 테이블</h3>
    <div class="card"><h3>Heatmap: 회사 × 연도 × 매출 (IDR bn)</h3><div id="ov-heat" class="plot plot-tall"></div></div>
    <div class="card"><h3>종합 ranking — 기준연도 (모든 지표 동시)</h3><div id="ov-table"></div></div>
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

  // ── Heatmap: 회사 × 연도 × 매출
  const sortedYears = [...allYears];
  const heatCos = [...companies].sort((a, b) => {
    const ra = fin.find(r => r.short === a && r.yr === ly)?.revenue || 0;
    const rb = fin.find(r => r.short === b && r.yr === ly)?.revenue || 0;
    return rb - ra;
  });
  const z = heatCos.map(co => sortedYears.map(y => {
    const r = fin.find(x => x.short === co && x.yr === y);
    return r ? r.revenue : null;
  }));
  plot("ov-heat", [{
    z, x: sortedYears, y: heatCos, type: "heatmap", colorscale: "Greens",
    hovertemplate: "%{y}<br>%{x}: %{z:,.0f} bn<extra></extra>",
    colorbar: { title: "IDR bn" },
  }], {
    yaxis: { autorange: "reversed" }, margin: { l: 230, r: 40, t: 10, b: 40 }, height: 620,
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

    // ── 종합 ranking 테이블
    const tableRows = [...rows].sort((a, b) => (b.revenue || 0) - (a.revenue || 0)).map(r => ({
      회사: r.short,
      매출: r.revenue, 순이익: r.net_profit, EBITDA: r.ebitda,
      자산: r.assets, 부채: r.liab, 자본: r.equity, 시가총액: r.mcap,
      "순이익률(%)": r.net_margin, "ROE(%)": r.roe, "ROA(%)": r.roa, "D/E(x)": r.debt_eq,
    }));
    const numFmt = (d) => d == null ? "-" : Number(d).toLocaleString(undefined, { maximumFractionDigits: 0 });
    const pctFmt = (d) => d == null ? "-" : Number(d).toFixed(2);
    makeTable("ov-table", [
      { data: "회사", title: "회사" },
      { data: "매출", title: "매출 bn", render: numFmt },
      { data: "순이익", title: "순이익 bn", render: numFmt },
      { data: "EBITDA", title: "EBITDA bn", render: numFmt },
      { data: "자산", title: "자산 bn", render: numFmt },
      { data: "부채", title: "부채 bn", render: numFmt },
      { data: "자본", title: "자본 bn", render: numFmt },
      { data: "시가총액", title: "시총 bn", render: numFmt },
      { data: "순이익률(%)", title: "순이익률%", render: pctFmt },
      { data: "ROE(%)", title: "ROE%", render: pctFmt },
      { data: "ROA(%)", title: "ROA%", render: pctFmt },
      { data: "D/E(x)", title: "D/E x", render: pctFmt },
    ], tableRows, { pageLength: 25 });
  };

  yearSel.addEventListener("change", renderYearScoped);
  metricSel.addEventListener("change", renderYearScoped);
  renderYearScoped();
}
