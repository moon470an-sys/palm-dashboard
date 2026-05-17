// BDSP — 국가/주/군 시계열
import { state, kpiHTML, fmtInt, plot, makeTable } from "../data.js";

export function renderBdsp(root) {
  const nat = state.bdsp.nasional;     // {indikator, tahun, nilai, satuan, sumber}
  const prov = state.bdsp.provinsi;
  const kab = state.bdsp.kabupaten;

  const ly = Math.max(...nat.filter(n => n.sumber === 'bdsp_html').map(n => n.tahun));
  const latestLuas = nat.find(n => n.tahun === ly && n.indikator === "luas_areal" && n.sumber === 'bdsp_html')?.nilai || 0;
  const latestProd = nat.find(n => n.tahun === ly && n.indikator === "produksi" && n.sumber === 'bdsp_html')?.nilai || 0;
  const latestYield = nat.find(n => n.tahun === ly && n.indikator === "produktivitas" && n.sumber === 'bdsp_html')?.nilai || 0;

  root.innerHTML = `
    <h2>📈 BDSP (Basis Data Statistik Pertanian)</h2>
    <p class="notice">출처: bdsp2.pertanian.go.id/bdsp (Pusdatin Kementan) · 자동 Playwright 수집 · raw × 0.01 정규화</p>

    <div class="kpis">
      ${kpiHTML(`Luas Areal ${ly}`, `${(latestLuas/1e6).toFixed(2)}M ha`, `${fmtInt(latestLuas)} ha`)}
      ${kpiHTML(`Produksi ${ly}`, `${(latestProd/1e6).toFixed(2)}M ton`, `CPO`)}
      ${kpiHTML(`Produktivitas ${ly}`, `${(latestYield/1000).toFixed(2)} t/ha`, `${fmtInt(latestYield)} kg/ha`, "blue")}
      ${kpiHTML("Provinsi 데이터", fmtInt([...new Set(prov.map(p => p.prov_name))].length), "주", "warn")}
      ${kpiHTML("Kabupaten 데이터", fmtInt([...new Set(kab.map(k => k.prov_name + '/' + k.kab_name))].length), "군")}
    </div>

    <div class="grid-2">
      <div class="card"><h3>국가 단위 시계열 (Nasional · Kementan)</h3><div id="bdsp-nat" class="plot"></div></div>
      <div class="card"><h3>YoY 성장률 (luas_areal %)</h3><div id="bdsp-yoy" class="plot"></div></div>
    </div>

    <div class="card">
      <h3>주(Provinsi) 비교 — 상위 8개주 (luas_areal 시계열)</h3>
      <div id="bdsp-prov" class="plot plot-tall"></div>
    </div>

    <div class="card">
      <h3>Heatmap: 주 × 연도 (luas_areal)</h3>
      <div id="bdsp-heatmap" class="plot plot-tall"></div>
    </div>

    <div class="card">
      <h3>Top 20 kabupaten — luas_areal 최신 연도</h3>
      <div id="bdsp-kab" class="plot plot-tall"></div>
    </div>

    <div class="filter-bar">
      <label>지표:</label>
      <select id="bdsp-indi">
        <option value="luas_areal" selected>luas_areal</option>
        <option value="produksi">produksi</option>
        <option value="produktivitas">produktivitas</option>
      </select>
      <label>연도:</label>
      <select id="bdsp-year"></select>
      <span class="badge">행: ${fmtInt(nat.length + prov.length + kab.length)}</span>
    </div>

    <div class="grid-2">
      <div class="card"><h3>BDSP raw 데이터 (nasional + provinsi)</h3><div id="bdsp-table"></div></div>
      <div class="card"><h3>BDSP raw 데이터 (kabupaten)</h3><div id="bdsp-kab-table"></div></div>
    </div>
  `;

  // nasional 시계열
  const natLuas = nat.filter(n => n.indikator === "luas_areal" && n.sumber === 'bdsp_html').sort((a, b) => a.tahun - b.tahun);
  const natProd = nat.filter(n => n.indikator === "produksi" && n.sumber === 'bdsp_html').sort((a, b) => a.tahun - b.tahun);
  plot("bdsp-nat", [
    { x: natLuas.map(n => n.tahun), y: natLuas.map(n => n.nilai), type: "bar", name: "Luas Areal (ha)", marker: { color: "#2ca02c" } },
    { x: natProd.map(n => n.tahun), y: natProd.map(n => n.nilai), type: "scatter", mode: "lines+markers", name: "Produksi (ton)", line: { color: "#d62728", width: 3 }, yaxis: "y2" },
  ], { yaxis: { title: "Luas Areal (ha)" }, yaxis2: { title: "Produksi (ton)", overlaying: "y", side: "right" }, legend: { orientation: "h", y: -0.2 } });

  // YoY
  const yoy = [];
  for (let i = 1; i < natLuas.length; i++) {
    yoy.push({ year: natLuas[i].tahun, pct: (natLuas[i].nilai / natLuas[i-1].nilai - 1) * 100 });
  }
  plot("bdsp-yoy", [{
    x: yoy.map(y => y.year), y: yoy.map(y => y.pct.toFixed(2)),
    type: "bar", marker: { color: yoy.map(y => y.pct >= 0 ? "#2ca02c" : "#d62728") },
  }], { yaxis: { title: "전년 대비 (%)" } });

  // provinsi top 8 시계열
  const provIndi = prov.filter(p => p.indikator === "luas_areal");
  const provLatest = {};
  provIndi.filter(p => p.tahun === ly).forEach(p => { provLatest[p.prov_name] = p.nilai; });
  const top8 = Object.entries(provLatest).sort((a, b) => b[1] - a[1]).slice(0, 8).map(p => p[0]);
  const traces = top8.map(p => {
    const series = provIndi.filter(x => x.prov_name === p).sort((a, b) => a.tahun - b.tahun);
    return { x: series.map(s => s.tahun), y: series.map(s => s.nilai), name: p, type: "scatter", mode: "lines+markers" };
  });
  plot("bdsp-prov", traces, { yaxis: { title: "Luas Areal (ha)" }, legend: { orientation: "h", y: -0.15 } });

  // Heatmap (prov × year)
  const years = [...new Set(provIndi.map(p => p.tahun))].sort();
  const provs = Object.entries(provLatest).sort((a, b) => b[1] - a[1]).map(p => p[0]).slice(0, 25);
  const z = provs.map(p => years.map(y => {
    const v = provIndi.find(x => x.prov_name === p && x.tahun === y);
    return v ? v.nilai : null;
  }));
  plot("bdsp-heatmap", [{
    z, x: years, y: provs, type: "heatmap", colorscale: "Viridis",
    colorbar: { title: "ha" },
  }], { yaxis: { autorange: "reversed" }, height: 480 });

  // top 20 kab
  const kabLatest = kab.filter(k => k.indikator === "luas_areal" && k.tahun === ly)
    .sort((a, b) => b.nilai - a.nilai).slice(0, 20);
  plot("bdsp-kab", [{
    x: kabLatest.map(k => k.nilai),
    y: kabLatest.map(k => `${k.kab_name} (${k.prov_name?.substring(0, 8)})`),
    type: "bar", orientation: "h",
    marker: { color: kabLatest.map(k => k.nilai), colorscale: "Greens" },
    text: kabLatest.map(k => Math.round(k.nilai).toLocaleString()), textposition: "outside",
  }], { yaxis: { autorange: "reversed" }, height: 480 });

  // year select
  const allYears = [...new Set([...nat.map(n => n.tahun), ...prov.map(p => p.tahun)])].sort();
  document.getElementById("bdsp-year").innerHTML = allYears.map(y =>
    `<option value="${y}" ${y === ly ? "selected" : ""}>${y}</option>`).join("");

  // raw tables
  makeTable("bdsp-table", [
    { data: "level", title: "level" }, { data: "indikator", title: "지표" },
    { data: "prov_name", title: "주" }, { data: "tahun", title: "연도" },
    { data: "nilai", title: "값", render: (d) => Number(d).toLocaleString() },
    { data: "satuan", title: "단위" }, { data: "sumber", title: "출처" },
  ], [
    ...nat.map(n => ({ ...n, level: "nasional", prov_name: "-" })),
    ...prov.map(p => ({ ...p, level: "provinsi", sumber: "kementan" })),
  ], { pageLength: 15 });

  makeTable("bdsp-kab-table", [
    { data: "indikator", title: "지표" }, { data: "prov_name", title: "주" },
    { data: "kab_name", title: "군" }, { data: "tahun", title: "연도" },
    { data: "nilai", title: "값", render: (d) => Number(d).toLocaleString() },
  ], kab, { pageLength: 15 });
}
