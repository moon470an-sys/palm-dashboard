// BDSP — Nasional/Provinsi/Kabupaten 시계열 (3 지표: luas / produksi / produktivitas)
// Luas 일변도였던 차트를 다지표 + 권역(region) + 효율성 + 분포 + 출처 비교로 확장.
import { state, kpiHTML, fmtInt, plot, makeTable } from "../data.js";

const INDI = {
  luas_areal:    { label: "면적(Luas)",    unit: "ha",    color: "#2ca02c", short: "Luas",    big: (v) => `${(v/1e6).toFixed(2)}M ha` },
  produksi:      { label: "생산(Produksi)", unit: "ton",   color: "#d62728", short: "Produksi", big: (v) => `${(v/1e6).toFixed(2)}M ton` },
  produktivitas: { label: "생산성(Yield)",  unit: "kg/ha", color: "#1f77b4", short: "Yield",   big: (v) => `${(v/1000).toFixed(2)} t/ha` },
};

const REGION = {
  Sumatera:   ["ACEH", "SUMATERA UTARA", "SUMATERA BARAT", "RIAU", "JAMBI", "SUMATERA SELATAN", "BENGKULU", "LAMPUNG", "KEPULAUAN BANGKA BELITUNG", "KEPULAUAN RIAU"],
  Kalimantan: ["KALIMANTAN BARAT", "KALIMANTAN TENGAH", "KALIMANTAN SELATAN", "KALIMANTAN TIMUR", "KALIMANTAN UTARA"],
  Sulawesi:   ["SULAWESI BARAT", "SULAWESI SELATAN", "SULAWESI TENGAH", "SULAWESI TENGGARA", "GORONTALO"],
  Papua:      ["PAPUA", "PAPUA BARAT", "PAPUA BARAT DAYA", "PAPUA SELATAN", "PAPUA TENGAH"],
  Jawa:       ["JAWA BARAT", "BANTEN"],
  Maluku:     ["MALUKU", "MALUKU UTARA"],
};
const REGION_COLOR = { Sumatera: "#2ca02c", Kalimantan: "#ff7f0e", Sulawesi: "#1f77b4", Papua: "#9467bd", Jawa: "#d62728", Maluku: "#8c564b", "기타": "#7f7f7f" };
const regionOf = (p) => {
  for (const [r, list] of Object.entries(REGION)) if (list.includes(p)) return r;
  return "기타";
};

const cagr = (v0, v1, years) => (years > 0 && v0 > 0 && v1 > 0) ? (Math.pow(v1 / v0, 1 / years) - 1) * 100 : null;

export function renderBdsp(root) {
  const nat = state.bdsp.nasional;     // {indikator, tahun, nilai, satuan, sumber}
  const prov = state.bdsp.provinsi;
  const kab = state.bdsp.kabupaten;

  // 최신/최초 연도 (nasional 기준, sumber 무관하게 가장 최신)
  const ly = Math.max(...nat.map(n => n.tahun));
  const fy = Math.min(...nat.map(n => n.tahun));

  // nat 최신 값 (bdsp_html 우선, 없으면 bdsp_bps)
  const natValue = (indi, year) => {
    const candidates = nat.filter(n => n.indikator === indi && n.tahun === year);
    return (candidates.find(c => c.sumber === "bdsp_html") || candidates[0])?.nilai || 0;
  };
  const latest = { luas_areal: natValue("luas_areal", ly), produksi: natValue("produksi", ly), produktivitas: natValue("produktivitas", ly) };
  const first = { luas_areal: natValue("luas_areal", fy), produksi: natValue("produksi", fy), produktivitas: natValue("produktivitas", fy) };
  const years_span = ly - fy;
  const cagrs = {
    luas_areal: cagr(first.luas_areal, latest.luas_areal, years_span),
    produksi: cagr(first.produksi, latest.produksi, years_span),
    produktivitas: cagr(first.produktivitas, latest.produktivitas, years_span),
  };

  // Top 주/군 (최신 luas)
  const provLatestLuas = prov.filter(p => p.indikator === "luas_areal" && p.tahun === ly);
  const topProv = [...provLatestLuas].sort((a, b) => b.nilai - a.nilai)[0];
  const kabLatestLuas = kab.filter(k => k.indikator === "luas_areal" && k.tahun === ly);
  const topKab = [...kabLatestLuas].sort((a, b) => b.nilai - a.nilai)[0];

  root.innerHTML = `
    <h2>📈 BDSP (Basis Data Statistik Pertanian)</h2>
    <p class="notice">
      출처: bdsp2.pertanian.go.id/bdsp (Pusdatin Kementan, 자동 Playwright 수집)
      · 기간 ${fy}–${ly} · 지표 3종(면적·생산·생산성) × 국가/주(29)/군(104) 다층
    </p>

    <div class="kpis">
      ${kpiHTML(`면적 ${ly}`, INDI.luas_areal.big(latest.luas_areal), `CAGR ${cagrs.luas_areal?.toFixed(2)}%/yr`, "")}
      ${kpiHTML(`생산 ${ly}`, INDI.produksi.big(latest.produksi), `CAGR ${cagrs.produksi?.toFixed(2)}%/yr`, "blue")}
      ${kpiHTML(`생산성 ${ly}`, INDI.produktivitas.big(latest.produktivitas), `CAGR ${cagrs.produktivitas?.toFixed(2)}%/yr`, "warn")}
      ${kpiHTML("최대 면적 주", topProv?.prov_name || "-", topProv ? `${(topProv.nilai/1e6).toFixed(2)}M ha` : "")}
      ${kpiHTML("최대 면적 군", topKab?.kab_name || "-", topKab ? `${(topKab.nilai/1e3).toFixed(0)}k ha · ${topKab.prov_name}` : "")}
      ${kpiHTML("주(Provinsi)", fmtInt(new Set(prov.map(p => p.prov_name)).size))}
      ${kpiHTML("군(Kabupaten)", fmtInt(new Set(kab.map(k => k.prov_name + "/" + k.kab_name)).size))}
    </div>

    <h3 class="section-h">① 국가 시계열 — 3 지표 small multiples</h3>
    <div class="grid-3">
      <div class="card"><h3>면적 (ha)</h3><div id="bdsp-nat-luas" class="plot"></div></div>
      <div class="card"><h3>생산 (ton)</h3><div id="bdsp-nat-prod" class="plot"></div></div>
      <div class="card"><h3>생산성 (kg/ha)</h3><div id="bdsp-nat-yield" class="plot"></div></div>
    </div>

    <div class="grid-2">
      <div class="card"><h3>YoY 성장률 — 3 지표 비교 (%)</h3><div id="bdsp-yoy" class="plot"></div></div>
      <div class="card"><h3>출처 비교 (bdsp_html vs bdsp_bps · 면적 기준)</h3><div id="bdsp-source" class="plot"></div></div>
    </div>

    <h3 class="section-h">② 권역 분석 — Sumatera / Kalimantan / Sulawesi / Papua / Jawa / Maluku</h3>
    <div class="grid-2">
      <div class="card"><h3>권역별 면적 stacked area</h3><div id="bdsp-region-stack" class="plot"></div></div>
      <div class="card"><h3>권역별 점유율 (100% stack)</h3><div id="bdsp-region-share" class="plot"></div></div>
    </div>

    <h3 class="section-h">③ 주(Provinsi)/군(Kabupaten) — 지표 선택</h3>
    <div class="filter-bar">
      <label>지표:</label>
      <select id="bdsp-indi">
        <option value="luas_areal" selected>면적 (luas_areal)</option>
        <option value="produksi">생산 (produksi)</option>
        <option value="produktivitas">생산성 (produktivitas)</option>
      </select>
      <label>기준연도:</label>
      <select id="bdsp-year"></select>
      <span class="badge">행: ${fmtInt(nat.length + prov.length + kab.length)}</span>
    </div>

    <div class="grid-2">
      <div class="card"><h3>Top 8 주 시계열</h3><div id="bdsp-prov" class="plot plot-tall"></div></div>
      <div class="card"><h3>Heatmap 주 × 연도</h3><div id="bdsp-heatmap" class="plot plot-tall"></div></div>
    </div>

    <div class="grid-2">
      <div class="card"><h3>Top 20 군(Kabupaten) — 기준연도</h3><div id="bdsp-kab" class="plot plot-tall"></div></div>
      <div class="card"><h3>효율성 scatter (면적 × 생산, 색=권역, 크기=Yield)</h3><div id="bdsp-scatter" class="plot plot-tall"></div></div>
    </div>

    <h3 class="section-h">④ 분포 · 계층 분석</h3>
    <div class="grid-2">
      <div class="card"><h3>Yield 분포 boxplot (주들의 연도별 분포)</h3><div id="bdsp-yieldbox" class="plot plot-tall"></div></div>
      <div class="card"><h3>Treemap: 권역 → 주 → 군 (면적, 기준연도)</h3><div id="bdsp-treemap" class="plot plot-tall"></div></div>
    </div>

    <div class="grid-2">
      <div class="card"><h3>BDSP raw (nasional + provinsi)</h3><div id="bdsp-table"></div></div>
      <div class="card"><h3>BDSP raw (kabupaten)</h3><div id="bdsp-kab-table"></div></div>
    </div>
  `;

  // ── ① 국가 시계열 3-up
  ["luas_areal", "produksi", "produktivitas"].forEach((indi, idx) => {
    const elId = ["bdsp-nat-luas", "bdsp-nat-prod", "bdsp-nat-yield"][idx];
    const html = nat.filter(n => n.indikator === indi && n.sumber === "bdsp_html").sort((a, b) => a.tahun - b.tahun);
    const bps = nat.filter(n => n.indikator === indi && n.sumber === "bdsp_bps").sort((a, b) => a.tahun - b.tahun);
    plot(elId, [
      { x: html.map(n => n.tahun), y: html.map(n => n.nilai), type: "bar", name: "bdsp_html", marker: { color: INDI[indi].color } },
      { x: bps.map(n => n.tahun), y: bps.map(n => n.nilai), type: "scatter", mode: "lines+markers", name: "bdsp_bps", line: { color: "#666", width: 2, dash: "dot" } },
    ], { yaxis: { title: INDI[indi].unit }, legend: { orientation: "h", y: -0.2 }, margin: { t: 10, b: 60, l: 60, r: 20 } });
  });

  // ── YoY 3 지표 grouped bar
  const yoyTraces = ["luas_areal", "produksi", "produktivitas"].map(indi => {
    const series = nat.filter(n => n.indikator === indi && n.sumber === "bdsp_html").sort((a, b) => a.tahun - b.tahun);
    const yoy = [];
    for (let i = 1; i < series.length; i++) {
      yoy.push({ year: series[i].tahun, pct: (series[i].nilai / series[i-1].nilai - 1) * 100 });
    }
    return { x: yoy.map(y => y.year), y: yoy.map(y => Number(y.pct.toFixed(2))), type: "bar", name: INDI[indi].short, marker: { color: INDI[indi].color } };
  });
  plot("bdsp-yoy", yoyTraces, { barmode: "group", yaxis: { title: "전년 대비 (%)", zeroline: true }, legend: { orientation: "h", y: -0.2 } });

  // ── 출처 비교 (luas)
  const srcHtml = nat.filter(n => n.indikator === "luas_areal" && n.sumber === "bdsp_html").sort((a, b) => a.tahun - b.tahun);
  const srcBps = nat.filter(n => n.indikator === "luas_areal" && n.sumber === "bdsp_bps").sort((a, b) => a.tahun - b.tahun);
  plot("bdsp-source", [
    { x: srcHtml.map(n => n.tahun), y: srcHtml.map(n => n.nilai), name: "bdsp_html", mode: "lines+markers", line: { color: "#2ca02c", width: 3 } },
    { x: srcBps.map(n => n.tahun), y: srcBps.map(n => n.nilai), name: "bdsp_bps",  mode: "lines+markers", line: { color: "#666", width: 2, dash: "dot" } },
  ], { yaxis: { title: "면적 (ha)" }, legend: { orientation: "h", y: -0.2 } });

  // ── 권역 stacked area & 점유율
  const provLuas = prov.filter(p => p.indikator === "luas_areal");
  const allYears = [...new Set(provLuas.map(p => p.tahun))].sort();
  const regionList = ["Sumatera", "Kalimantan", "Sulawesi", "Papua", "Jawa", "Maluku", "기타"];
  const regionByYear = {}; // region -> year -> sum
  regionList.forEach(r => { regionByYear[r] = {}; allYears.forEach(y => { regionByYear[r][y] = 0; }); });
  provLuas.forEach(p => { regionByYear[regionOf(p.prov_name)][p.tahun] += p.nilai; });

  const stackTraces = regionList.map(r => ({
    x: allYears, y: allYears.map(y => regionByYear[r][y]),
    name: r, type: "scatter", mode: "lines", stackgroup: "abs",
    line: { color: REGION_COLOR[r], width: 0 }, fillcolor: REGION_COLOR[r],
  })).filter(t => t.y.some(v => v > 0));
  plot("bdsp-region-stack", stackTraces, { yaxis: { title: "면적 (ha)" }, legend: { orientation: "h", y: -0.2 } });

  // 100% share
  const shareTraces = regionList.map(r => ({
    x: allYears, y: allYears.map(y => {
      const tot = regionList.reduce((s, rr) => s + regionByYear[rr][y], 0);
      return tot > 0 ? regionByYear[r][y] / tot * 100 : 0;
    }),
    name: r, type: "scatter", mode: "lines", stackgroup: "pct", groupnorm: "percent",
    line: { color: REGION_COLOR[r], width: 0 }, fillcolor: REGION_COLOR[r],
  })).filter(t => t.y.some(v => v > 0));
  plot("bdsp-region-share", shareTraces, { yaxis: { title: "점유율 (%)", range: [0, 100] }, legend: { orientation: "h", y: -0.2 } });

  // ── ③ year/indi select
  const yearSel = document.getElementById("bdsp-year");
  yearSel.innerHTML = allYears.map(y => `<option value="${y}" ${y === ly ? "selected" : ""}>${y}</option>`).join("");
  const indiSel = document.getElementById("bdsp-indi");

  const renderProvCharts = () => {
    const indi = indiSel.value;
    const yr = Number(yearSel.value);
    const info = INDI[indi];
    const provData = prov.filter(p => p.indikator === indi);

    // Top 8 prov 시계열 (yr 기준 정렬)
    const latestMap = {};
    provData.filter(p => p.tahun === yr).forEach(p => { latestMap[p.prov_name] = p.nilai; });
    const top8 = Object.entries(latestMap).sort((a, b) => b[1] - a[1]).slice(0, 8).map(p => p[0]);
    const provTraces = top8.map(p => {
      const series = provData.filter(x => x.prov_name === p).sort((a, b) => a.tahun - b.tahun);
      return { x: series.map(s => s.tahun), y: series.map(s => s.nilai), name: p, type: "scatter", mode: "lines+markers" };
    });
    plot("bdsp-prov", provTraces, { yaxis: { title: info.unit }, legend: { orientation: "h", y: -0.18 } });

    // Heatmap
    const sortedProvs = Object.entries(latestMap).sort((a, b) => b[1] - a[1]).map(p => p[0]);
    const z = sortedProvs.map(p => allYears.map(y => {
      const v = provData.find(x => x.prov_name === p && x.tahun === y);
      return v ? v.nilai : null;
    }));
    plot("bdsp-heatmap", [{
      z, x: allYears, y: sortedProvs, type: "heatmap", colorscale: "Viridis",
      colorbar: { title: info.unit },
    }], { yaxis: { autorange: "reversed" }, margin: { l: 170, r: 40, t: 10, b: 40 }, height: 480 });

    // Top 20 kab
    const kabRows = kab.filter(k => k.indikator === indi && k.tahun === yr)
      .sort((a, b) => b.nilai - a.nilai).slice(0, 20);
    plot("bdsp-kab", [{
      x: kabRows.map(k => k.nilai),
      y: kabRows.map(k => `${k.kab_name} (${(k.prov_name || "").substring(0, 10)})`),
      type: "bar", orientation: "h",
      marker: { color: kabRows.map(k => k.nilai), colorscale: "Greens" },
      text: kabRows.map(k => Math.round(k.nilai).toLocaleString()), textposition: "outside",
    }], { yaxis: { autorange: "reversed" }, xaxis: { title: info.unit }, margin: { l: 220, r: 60, t: 10, b: 40 }, height: 480 });

    // Scatter: 주별 (luas × produksi), 크기=yield, color=region
    const provLuasYr = prov.filter(p => p.indikator === "luas_areal" && p.tahun === yr);
    const provProdYr = Object.fromEntries(prov.filter(p => p.indikator === "produksi" && p.tahun === yr).map(p => [p.prov_name, p.nilai]));
    const provYieldYr = Object.fromEntries(prov.filter(p => p.indikator === "produktivitas" && p.tahun === yr).map(p => [p.prov_name, p.nilai]));
    const scatterByRegion = {};
    regionList.forEach(r => { scatterByRegion[r] = { x: [], y: [], size: [], text: [] }; });
    provLuasYr.forEach(p => {
      const r = regionOf(p.prov_name);
      const prod = provProdYr[p.prov_name] || 0;
      const yld = provYieldYr[p.prov_name] || 0;
      scatterByRegion[r].x.push(p.nilai);
      scatterByRegion[r].y.push(prod);
      scatterByRegion[r].size.push(Math.max(8, Math.min(48, yld / 100)));
      scatterByRegion[r].text.push(`${p.prov_name}<br>면적 ${(p.nilai/1e3).toFixed(0)}k ha<br>생산 ${(prod/1e3).toFixed(0)}k ton<br>생산성 ${(yld/1000).toFixed(2)} t/ha`);
    });
    const scTraces = regionList.filter(r => scatterByRegion[r].x.length).map(r => ({
      x: scatterByRegion[r].x, y: scatterByRegion[r].y,
      mode: "markers", type: "scatter", name: r,
      marker: { size: scatterByRegion[r].size, color: REGION_COLOR[r], opacity: 0.75, line: { color: "#fff", width: 1 } },
      text: scatterByRegion[r].text, hoverinfo: "text",
    }));
    plot("bdsp-scatter", scTraces, {
      xaxis: { title: "면적 (ha)", type: "log" },
      yaxis: { title: "생산 (ton)", type: "log" },
      legend: { orientation: "h", y: -0.15 }, margin: { l: 70, r: 30, t: 10, b: 50 }, height: 480,
    });
  };

  indiSel.addEventListener("change", renderProvCharts);
  yearSel.addEventListener("change", renderProvCharts);
  renderProvCharts();

  // ── ④ Yield boxplot per year
  const yieldByYear = {};
  prov.filter(p => p.indikator === "produktivitas").forEach(p => {
    (yieldByYear[p.tahun] = yieldByYear[p.tahun] || []).push(p.nilai);
  });
  const boxTraces = Object.keys(yieldByYear).sort().map(y => ({
    y: yieldByYear[y], name: String(y), type: "box", boxpoints: "outliers",
    marker: { color: "#1f77b4" }, line: { color: "#1f77b4" },
  }));
  plot("bdsp-yieldbox", boxTraces, {
    yaxis: { title: "생산성 (kg/ha)" }, xaxis: { title: "연도" },
    showlegend: false, margin: { l: 70, r: 30, t: 10, b: 50 }, height: 480,
  });

  // Treemap (기준연도 = ly, 면적)
  const renderTreemap = () => {
    const yr = Number(yearSel.value);
    const kabYr = kab.filter(k => k.indikator === "luas_areal" && k.tahun === yr && k.nilai > 0);
    const labels = ["Indonesia"], parents = [""], values = [0];
    const provSums = {};
    const regionSums = {};
    kabYr.forEach(k => {
      const r = regionOf(k.prov_name);
      provSums[k.prov_name] = (provSums[k.prov_name] || 0) + k.nilai;
      regionSums[r] = (regionSums[r] || 0) + k.nilai;
    });
    Object.entries(regionSums).forEach(([r, v]) => { labels.push(r); parents.push("Indonesia"); values.push(v); });
    Object.entries(provSums).forEach(([p, v]) => { labels.push(p); parents.push(regionOf(p)); values.push(v); });
    kabYr.forEach(k => { labels.push(`${k.kab_name}`); parents.push(k.prov_name); values.push(k.nilai); });
    plot("bdsp-treemap", [{
      type: "treemap", labels, parents, values, branchvalues: "total",
      textinfo: "label+value", hovertemplate: "%{label}<br>%{value:,.0f} ha<extra></extra>",
      marker: { colorscale: "Greens" },
    }], { margin: { t: 10, l: 0, r: 0, b: 0 }, height: 520 });
  };
  yearSel.addEventListener("change", renderTreemap);
  renderTreemap();

  // ── raw tables
  makeTable("bdsp-table", [
    { data: "level", title: "level" }, { data: "indikator", title: "지표" },
    { data: "prov_name", title: "주" }, { data: "tahun", title: "연도" },
    { data: "nilai", title: "값", render: (d) => Number(d).toLocaleString() },
    { data: "satuan", title: "단위" }, { data: "sumber", title: "출처" },
  ], [
    ...nat.map(n => ({ ...n, level: "nasional", prov_name: "-" })),
    ...prov.map(p => ({ ...p, level: "provinsi", sumber: p.sumber || "kementan" })),
  ], { pageLength: 15 });

  makeTable("bdsp-kab-table", [
    { data: "indikator", title: "지표" }, { data: "prov_name", title: "주" },
    { data: "kab_name", title: "군" }, { data: "tahun", title: "연도" },
    { data: "nilai", title: "값", render: (d) => Number(d).toLocaleString() },
  ], kab, { pageLength: 15 });
}
