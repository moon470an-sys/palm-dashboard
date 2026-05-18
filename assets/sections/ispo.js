// ISPO — 1,378 인증서 + 1,195 회사 + 41 LS + 24 분기 + 지도
import { state, kpiHTML, fmtInt, fmtHa, plot, makeTable } from "../data.js";

export function renderIspo(root) {
  const cert = state.ispo.certificates;
  const co = state.ispo.companies;
  const ls = state.ispo.ls;
  const q = state.ispo.quarterly;
  const coords = state.prov_coords;

  const berlaku = cert.filter(c => c.status === 'berlaku');
  const totalHa = berlaku.reduce((s, c) => s + (c.luas_lahan_ha || 0), 0);
  const today = new Date().toISOString().slice(0, 10);
  const exp90 = berlaku.filter(c => c.tanggal_berakhir && c.tanggal_berakhir <= addDays(today, 90)).length;
  const exp365 = berlaku.filter(c => c.tanggal_berakhir && c.tanggal_berakhir <= addDays(today, 365) && c.tanggal_berakhir > today).length;
  // 농장 생산 Capa (사용자 4축 일치): TBS·CPO 생산능력 + PKS 처리능력
  const totalTbs = berlaku.reduce((s, c) => s + (c.volume_tbs_ton_per_tahun || 0), 0);
  const totalCpo = berlaku.reduce((s, c) => s + (c.volume_cpo_ton_per_tahun || 0), 0);
  const totalPks = berlaku.reduce((s, c) => s + (c.kapasitas_pks_ton_per_jam || 0), 0);

  root.innerHTML = `
    <h2>📜 ISPO (Indonesian Sustainable Palm Oil)</h2>
    <p class="notice">출처: Ditjenbun 분기 PDF 4건 + LS-ISPO 14곳 공시 · ${fmtInt(cert.length)} 인증서 · ${fmtInt(co.length)} 회사 · ${ls.length} 인증기관</p>

    <div class="kpis">
      ${kpiHTML("인증서 총수", fmtInt(cert.length), `유효 ${berlaku.length}`, "blue")}
      ${kpiHTML("회사", fmtInt(co.length))}
      ${kpiHTML("총 인증 면적", fmtHa(totalHa))}
      ${kpiHTML("총 CPO 생산 Capa", `${(totalCpo/1e6).toFixed(2)}M ton/yr`, "유효 인증 합계")}
      ${kpiHTML("총 PKS 처리능력", `${fmtInt(Math.round(totalPks))} tph`, "Mill capacity")}
      ${kpiHTML("90일내 만료", fmtInt(exp90), "갱신 필요", "warn")}
      ${kpiHTML("1년내 만료", fmtInt(exp365), "갱신 계획", "warn")}
      ${kpiHTML("인증기관 (LS)", fmtInt(ls.length))}
    </div>

    <div class="grid-3">
      <div class="card"><h3>상태별 분포</h3><div id="ispo-status" class="plot"></div></div>
      <div class="card"><h3>유형(Jenis) 분포</h3><div id="ispo-jenis" class="plot"></div></div>
      <div class="card"><h3>인증기관 Top 10</h3><div id="ispo-ls" class="plot"></div></div>
    </div>

    <div class="grid-2">
      <div class="card"><h3>주(Provinsi)별 인증 면적 Top 15</h3><div id="ispo-prov" class="plot"></div></div>
      <div class="card"><h3>분기별 ISPO 구현률 (Kepmentan 833/2019)</h3><div id="ispo-quarterly" class="plot"></div></div>
    </div>

    <div class="grid-2">
      <div class="card"><h3>주별 CPO 생산 Capa Top 15 (ton/yr, 유효 인증)</h3><div id="ispo-cpo-prov" class="plot"></div></div>
      <div class="card"><h3>주별 PKS 처리능력 Top 15 (tph)</h3><div id="ispo-pks-prov" class="plot"></div></div>
    </div>

    <div class="card">
      <h3>지도 — 주별 인증 면적 (berlaku)</h3>
      <div id="ispo-map" class="map"></div>
    </div>

    <div class="card">
      <h3>인증서 검색 + 필터</h3>
      <p class="notice">상태/주/인증기관 헤더 클릭 또는 검색창 입력</p>
      <div id="ispo-table"></div>
    </div>

    <div class="card">
      <h3>회사 leaderboard (인증 면적 기준)</h3>
      <div id="ispo-co-table"></div>
    </div>
  `;

  // status
  const statusMap = {};
  cert.forEach(c => { statusMap[c.status || "unknown"] = (statusMap[c.status || "unknown"] || 0) + 1; });
  plot("ispo-status", [{
    labels: Object.keys(statusMap), values: Object.values(statusMap), type: "pie", hole: 0.4,
    marker: { colors: ["#2ca02c", "#ff7f0e", "#d62728", "#9467bd", "#7f7f7f"] },
  }]);

  // jenis
  const jenisMap = {};
  cert.forEach(c => { const j = c.jenis || "미지정"; jenisMap[j] = (jenisMap[j] || 0) + 1; });
  plot("ispo-jenis", [{
    labels: Object.keys(jenisMap), values: Object.values(jenisMap), type: "pie", hole: 0.4,
  }]);

  // LS top 10 (인증서 수 + 총 인증 면적 dual axis)
  const lsTop = [...ls].sort((a, b) => (b.n_cert||0) - (a.n_cert||0)).slice(0, 10);
  plot("ispo-ls", [
    { x: lsTop.map(l => l.n_cert), y: lsTop.map(l => (l.short_code || l.name || "").substring(0, 28)),
      type: "bar", orientation: "h", name: "인증서 수", marker: { color: "#1f77b4" },
      text: lsTop.map(l => l.n_cert), textposition: "outside", xaxis: "x" },
    { x: lsTop.map(l => l.total_ha), y: lsTop.map(l => (l.short_code || l.name || "").substring(0, 28)),
      type: "scatter", mode: "markers", name: "총 면적(ha)", marker: { color: "#d62728", size: 14, symbol: "diamond" },
      hovertemplate: "%{y}<br>면적: %{x:,.0f} ha<extra></extra>", xaxis: "x2" },
  ], {
    yaxis: { autorange: "reversed" },
    xaxis: { title: "인증서 수", side: "bottom" },
    xaxis2: { title: "총 인증 면적 (ha)", overlaying: "x", side: "top" },
    legend: { orientation: "h", y: -0.18 }, margin: { l: 180, r: 20, t: 40, b: 50 },
  });

  // prov top 15
  const provMap = {};
  berlaku.forEach(c => { if (c.provinsi) { provMap[c.provinsi] = (provMap[c.provinsi] || 0) + (c.luas_lahan_ha || 0); } });
  const provSorted = Object.entries(provMap).sort((a, b) => b[1] - a[1]).slice(0, 15);
  plot("ispo-prov", [{
    x: provSorted.map(p => p[1]), y: provSorted.map(p => p[0]),
    type: "bar", orientation: "h",
    marker: { color: provSorted.map(p => p[1]), colorscale: "Greens" },
    text: provSorted.map(p => Math.round(p[1]).toLocaleString()), textposition: "outside",
  }], { yaxis: { autorange: "reversed" }, xaxis: { title: "면적 (ha)" } });

  // 주별 CPO 생산 Capa (유효 인증)
  const cpoProvMap = {};
  berlaku.forEach(c => { if (c.provinsi && c.volume_cpo_ton_per_tahun) cpoProvMap[c.provinsi] = (cpoProvMap[c.provinsi] || 0) + c.volume_cpo_ton_per_tahun; });
  const cpoProvSorted = Object.entries(cpoProvMap).sort((a, b) => b[1] - a[1]).slice(0, 15);
  plot("ispo-cpo-prov", [{
    x: cpoProvSorted.map(p => p[1]), y: cpoProvSorted.map(p => p[0]),
    type: "bar", orientation: "h",
    marker: { color: cpoProvSorted.map(p => p[1]), colorscale: "YlOrRd" },
    text: cpoProvSorted.map(p => Math.round(p[1]).toLocaleString()), textposition: "outside",
  }], { yaxis: { autorange: "reversed" }, xaxis: { title: "CPO Capa (ton/yr)" } });

  // 주별 PKS 처리능력
  const pksProvMap = {};
  berlaku.forEach(c => { if (c.provinsi && c.kapasitas_pks_ton_per_jam) pksProvMap[c.provinsi] = (pksProvMap[c.provinsi] || 0) + c.kapasitas_pks_ton_per_jam; });
  const pksProvSorted = Object.entries(pksProvMap).sort((a, b) => b[1] - a[1]).slice(0, 15);
  plot("ispo-pks-prov", [{
    x: pksProvSorted.map(p => p[1]), y: pksProvSorted.map(p => p[0]),
    type: "bar", orientation: "h",
    marker: { color: pksProvSorted.map(p => p[1]), colorscale: "Blues" },
    text: pksProvSorted.map(p => Math.round(p[1]).toLocaleString()), textposition: "outside",
  }], { yaxis: { autorange: "reversed" }, xaxis: { title: "Mill capacity (tph)" } });

  // quarterly trend (total scope)
  const qTotal = q.filter(x => x.scope === "total");
  const snaps = [...new Set(qTotal.map(x => x.snapshot))];
  const byJenis = {};
  qTotal.forEach(x => {
    byJenis[x.jenis_pelaku_usaha] = byJenis[x.jenis_pelaku_usaha] || {};
    byJenis[x.jenis_pelaku_usaha][x.snapshot] = x.luas_ha;
  });
  plot("ispo-quarterly", Object.entries(byJenis).map(([j, m]) => ({
    x: snaps, y: snaps.map(s => m[s] || 0), type: "bar", name: j,
  })), { barmode: "stack", yaxis: { title: "면적 (ha)" }, legend: { orientation: "h", y: -0.2 } });

  // map (Leaflet)
  setTimeout(() => {
    const map = L.map("ispo-map").setView([-2, 118], 5);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      { attribution: "&copy; OSM" }).addTo(map);
    Object.entries(provMap).forEach(([p, ha]) => {
      const c = coords[p] || coords[p.replace("DKI ", "")] ||
                coords[p.replace("DI ", "")] ||
                coords[Object.keys(coords).find(k => k.toLowerCase().includes(p.toLowerCase().substring(0, 8)))];
      if (c) {
        const radius = Math.sqrt(ha) / 20 + 8;
        L.circleMarker(c, {
          radius, color: "#2ca02c", fillColor: "#2ca02c", fillOpacity: 0.5, weight: 1.5,
        }).bindTooltip(`<b>${p}</b><br>${Math.round(ha).toLocaleString()} ha`).addTo(map);
      }
    });
  }, 200);

  // table
  const rows = cert.map(c => ({
    인증번호: c.nomor_sertifikat, 회사: c.company || "-", 유형: c.jenis || "",
    LS: c.ls_short || c.ls_name?.substring(0, 25) || "",
    주: c.provinsi || "", 군: c.kabupaten || "",
    면적: Math.round(c.luas_lahan_ha || 0),
    CPO: Math.round(c.volume_cpo_ton_per_tahun || 0),
    TBS: Math.round(c.volume_tbs_ton_per_tahun || 0),
    PKS: c.kapasitas_pks_ton_per_jam ? Math.round(c.kapasitas_pks_ton_per_jam * 100) / 100 : 0,
    발급: c.tanggal_terbit || "", 만료: c.tanggal_berakhir || "",
    상태: c.status || "",
  }));
  makeTable("ispo-table", [
    { data: "인증번호", title: "인증번호" }, { data: "회사", title: "회사" },
    { data: "유형", title: "유형" }, { data: "LS", title: "인증기관" },
    { data: "주", title: "주" }, { data: "군", title: "군" },
    { data: "면적", title: "면적(ha)", render: (d) => Number(d).toLocaleString() },
    { data: "CPO", title: "CPO(t/yr)", render: (d) => d ? Number(d).toLocaleString() : "-" },
    { data: "TBS", title: "TBS(t/yr)", render: (d) => d ? Number(d).toLocaleString() : "-" },
    { data: "PKS", title: "PKS(tph)", render: (d) => d ? Number(d).toLocaleString() : "-" },
    { data: "발급", title: "발급" }, { data: "만료", title: "만료" }, { data: "상태", title: "상태" },
  ], rows, { pageLength: 15, order: [[11, "asc"]] });

  // company leaderboard
  makeTable("ispo-co-table", [
    { data: "name_display", title: "회사" },
    { data: "jenis_pelaku_usaha", title: "유형" },
    { data: "n_cert", title: "인증서" },
    { data: "n_berlaku", title: "유효" },
    { data: "total_ha", title: "총면적(ha)", render: (d) => Number(d).toLocaleString() },
  ], co.slice(0, 200), { order: [[4, "desc"]], pageLength: 20 });
}

function addDays(iso, n) {
  const d = new Date(iso); d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}
