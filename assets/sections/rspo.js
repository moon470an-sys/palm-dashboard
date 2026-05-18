// RSPO — Indonesia + 글로벌 (PRISMA API 단독)
// 회사·생산량 중심. 만료/갱신 관련 KPI·차트·테이블은 노출하지 않음.
import { state, kpiHTML, fmtInt, plot, makeTable } from "../data.js";

export function renderRspo(root) {
  const idMembers = state.rspo.members; // Indonesia
  const global = state.rspo.global;

  // 회사·생산 핵심 집계
  const pcWithArea = idMembers.filter(m => m.category === 'pc' && m.area_ha);
  const pcArea = pcWithArea.reduce((s, m) => s + (m.area_ha || 0), 0);
  const cspoCompanies = idMembers.filter(m => m.cspo_volume_ton);
  const cspoTotal = cspoCompanies.reduce((s, m) => s + (m.cspo_volume_ton || 0), 0);

  // 글로벌 country 합계
  const countryMap = {};
  global.forEach(g => { countryMap[g.country] = (countryMap[g.country] || 0) + g.n; });
  const idGlobal = countryMap["ID"] || 0;
  const globalTotal = Object.values(countryMap).reduce((s, n) => s + n, 0);

  root.innerHTML = `
    <h2>🌐 RSPO (Roundtable on Sustainable Palm Oil)</h2>
    <p class="notice">출처: <a href="https://rspo.org/" target="_blank" rel="noopener">RSPO</a> PRISMA REST API (<a href="https://api-platform.cert-and-license.prismabyrspo.org/" target="_blank" rel="noopener">api-platform.cert-and-license.prismabyrspo.org</a>) · 글로벌 ${fmtInt(globalTotal)} · Indonesia ${fmtInt(idMembers.length)} · <b>회사·생산량 중심 구성</b></p>

    <div class="kpis">
      ${kpiHTML("Indonesia RSPO 회원", fmtInt(idMembers.length), `PC ${idMembers.filter(m=>m.category==='pc').length} · ISH ${idMembers.filter(m=>m.category==='ish').length} · Trader ${idMembers.filter(m=>m.category==='trader').length}`, "blue")}
      ${kpiHTML(`PC 면적 (P&C, ${pcWithArea.length}사 보고)`, `${(pcArea/1e6).toFixed(2)}M ha`, `${fmtInt(pcArea)} ha`)}
      ${kpiHTML(`CSPO Volume (${cspoCompanies.length}사)`, `${(cspoTotal/1e6).toFixed(2)}M ton/yr`, "Certified Sustainable Palm Oil")}
      ${kpiHTML("Indonesia 점유 (글로벌)", `${(idGlobal/globalTotal*100).toFixed(1)}%`, `${fmtInt(idGlobal)} / ${fmtInt(globalTotal)}`)}
    </div>

    <div class="filter-bar">
      <label>카테고리:</label>
      <select id="rspo-cat">
        <option value="">전체</option>
        <option value="pc">PC (Growers)</option>
        <option value="ish">ISH (Smallholders)</option>
        <option value="trader">Trader</option>
        <option value="distributor">Distributor</option>
      </select>
      <span class="badge" id="rspo-count">${fmtInt(idMembers.length)}</span>
    </div>

    <div class="grid-2">
      <div class="card"><h3>카테고리별 (PC / ISH / Trader / Distributor)</h3><div id="rspo-cat-pie" class="plot"></div></div>
      <div class="card"><h3>CSPO Volume Top 10 회사 (ton/yr)</h3><div id="rspo-cspo-top" class="plot"></div></div>
    </div>
    <div class="grid-2">
      <div class="card"><h3>인증기관 (Certification Body) Top 10</h3><div id="rspo-cb" class="plot"></div></div>
      <div class="card"><h3>PC 면적 Top 10 회사 (ha)</h3><div id="rspo-pc-area-co" class="plot"></div></div>
    </div>
    <div class="grid-2">
      <div class="card"><h3>국가별 Top 15 (글로벌, ID=빨강)</h3><div id="rspo-country-bar" class="plot"></div></div>
      <div class="card"><h3>PC 면적 국가별 Top 15 (글로벌)</h3><div id="rspo-pc-area" class="plot"></div></div>
    </div>

    <div class="grid-2">
      <div class="card"><h3>Parent Entity Top 15 — 모회사별 자회사 수 (그룹 영향력)</h3><div id="rspo-parent-n" class="plot plot-tall"></div></div>
      <div class="card"><h3>Parent Entity Top 15 — 모회사별 CSPO 합산 (ton/yr)</h3><div id="rspo-parent-cspo" class="plot plot-tall"></div></div>
    </div>

    <div class="card">
      <h3>Indonesia RSPO 회원 목록 (회사·면적·CSPO 중심)</h3>
      <div id="rspo-table"></div>
    </div>
  `;

  // category pie
  const catMap = {};
  idMembers.forEach(m => { catMap[m.category] = (catMap[m.category] || 0) + 1; });
  plot("rspo-cat-pie", [{
    labels: Object.keys(catMap), values: Object.values(catMap), type: "pie", hole: 0.4,
  }]);

  // CSPO Top 10
  const cspoTop = [...idMembers].filter(m => m.cspo_volume_ton > 0).sort((a, b) => b.cspo_volume_ton - a.cspo_volume_ton).slice(0, 10);
  plot("rspo-cspo-top", [{
    x: cspoTop.map(m => m.cspo_volume_ton).reverse(),
    y: cspoTop.map(m => (m.member_name || "").substring(0, 40)).reverse(),
    type: "bar", orientation: "h",
    marker: { color: cspoTop.map(m => m.cspo_volume_ton).reverse(), colorscale: "Greens" },
    text: cspoTop.map(m => Math.round(m.cspo_volume_ton).toLocaleString()).reverse(),
    textposition: "outside",
  }], { yaxis: { autorange: "reversed" }, xaxis: { title: "CSPO Volume (ton/yr)" }, margin: { l: 240, r: 80, t: 10, b: 40 } });

  // certification body top 10
  const cbMap = {};
  idMembers.forEach(m => { if (m.certification_body) cbMap[m.certification_body] = (cbMap[m.certification_body] || 0) + 1; });
  const cbTop = Object.entries(cbMap).sort((a, b) => b[1] - a[1]).slice(0, 10);
  plot("rspo-cb", [{
    x: cbTop.map(c => c[1]), y: cbTop.map(c => c[0].substring(0, 35)),
    type: "bar", orientation: "h", marker: { color: "#1f77b4" },
    text: cbTop.map(c => c[1]), textposition: "outside",
  }], { yaxis: { autorange: "reversed" }, margin: { l: 220, r: 60, t: 10, b: 40 } });

  // PC 면적 Top 10 회사 (Indonesia 내)
  const pcCoTop = [...pcWithArea].sort((a, b) => b.area_ha - a.area_ha).slice(0, 10);
  plot("rspo-pc-area-co", [{
    x: pcCoTop.map(m => m.area_ha).reverse(),
    y: pcCoTop.map(m => (m.member_name || "").substring(0, 40)).reverse(),
    type: "bar", orientation: "h",
    marker: { color: pcCoTop.map(m => m.area_ha).reverse(), colorscale: "Blues" },
    text: pcCoTop.map(m => Math.round(m.area_ha).toLocaleString()).reverse(),
    textposition: "outside",
  }], { yaxis: { autorange: "reversed" }, xaxis: { title: "PC 면적 (ha)" }, margin: { l: 240, r: 80, t: 10, b: 40 } });

  // global country bar
  const countrySorted = Object.entries(countryMap).sort((a, b) => b[1] - a[1]).slice(0, 15);
  plot("rspo-country-bar", [{
    x: countrySorted.map(c => c[1]), y: countrySorted.map(c => c[0]),
    type: "bar", orientation: "h",
    marker: { color: countrySorted.map(c => c[0] === "ID" ? "#d62728" : "#1f77b4") },
    text: countrySorted.map(c => c[1]), textposition: "outside",
  }], { yaxis: { autorange: "reversed" }, margin: { l: 80, r: 50, t: 10, b: 40 } });

  // PC area by country (글로벌)
  const pcAreaCountry = {};
  global.filter(g => g.category === 'pc').forEach(g => {
    pcAreaCountry[g.country] = (pcAreaCountry[g.country] || 0) + (g.area || 0);
  });
  const pcSorted = Object.entries(pcAreaCountry).filter(([_, v]) => v > 0).sort((a, b) => b[1] - a[1]).slice(0, 15);
  plot("rspo-pc-area", [{
    x: pcSorted.map(c => c[1]), y: pcSorted.map(c => c[0]),
    type: "bar", orientation: "h",
    marker: { color: pcSorted.map(c => c[0] === "ID" ? "#d62728" : "#2ca02c") },
    text: pcSorted.map(c => Math.round(c[1]).toLocaleString()), textposition: "outside",
  }], { yaxis: { autorange: "reversed" }, xaxis: { title: "Area (ha)" }, margin: { l: 80, r: 100, t: 10, b: 40 } });

  // Parent Entity 그룹 분석 (Top 15)
  const parentMap = {};
  idMembers.forEach(m => {
    const p = m.parent_entity_name || "Independent";
    if (!parentMap[p]) parentMap[p] = { n: 0, cspo: 0, area: 0 };
    parentMap[p].n++;
    parentMap[p].cspo += m.cspo_volume_ton || 0;
    parentMap[p].area += m.area_ha || 0;
  });
  const parentTopN = Object.entries(parentMap).sort((a, b) => b[1].n - a[1].n).slice(0, 15);
  plot("rspo-parent-n", [{
    x: parentTopN.map(p => p[1].n).reverse(),
    y: parentTopN.map(p => p[0].length > 35 ? p[0].substring(0, 35) + "…" : p[0]).reverse(),
    type: "bar", orientation: "h",
    marker: { color: parentTopN.map(p => p[1].n).reverse(), colorscale: "Blues" },
    text: parentTopN.map(p => p[1].n).reverse(), textposition: "outside",
  }], { yaxis: { autorange: "reversed" }, xaxis: { title: "자회사 수" }, margin: { l: 240, r: 60, t: 10, b: 40 } });

  const parentTopCspo = Object.entries(parentMap).filter(([_, v]) => v.cspo > 0).sort((a, b) => b[1].cspo - a[1].cspo).slice(0, 15);
  plot("rspo-parent-cspo", [{
    x: parentTopCspo.map(p => p[1].cspo).reverse(),
    y: parentTopCspo.map(p => p[0].length > 35 ? p[0].substring(0, 35) + "…" : p[0]).reverse(),
    type: "bar", orientation: "h",
    marker: { color: parentTopCspo.map(p => p[1].cspo).reverse(), colorscale: "Greens" },
    text: parentTopCspo.map(p => `${(p[1].cspo/1000).toFixed(0)}k`).reverse(), textposition: "outside",
  }], { yaxis: { autorange: "reversed" }, xaxis: { title: "CSPO Volume 합산 (ton/yr)" }, margin: { l: 240, r: 80, t: 10, b: 40 } });

  // 메인 테이블 — 회사·면적·CSPO 중심 (만료/상태 컬럼 제외)
  const rows = idMembers.map(m => ({
    category: m.category, member: m.member_name?.substring(0, 60),
    parent: m.parent_entity_name?.substring(0, 40) || "",
    cb: m.certification_body?.substring(0, 30) || "",
    cert_no: m.current_cert_number || "",
    area: Math.round(m.area_ha || 0),
    cspo: Math.round(m.cspo_volume_ton || 0),
  }));
  makeTable("rspo-table", [
    { data: "category", title: "분류" }, { data: "member", title: "회원" },
    { data: "parent", title: "Parent" }, { data: "cb", title: "인증기관" },
    { data: "cert_no", title: "Cert No" },
    { data: "area", title: "면적(ha)", render: (d) => Number(d).toLocaleString() },
    { data: "cspo", title: "CSPO(ton/yr)", render: (d) => Number(d).toLocaleString() },
  ], rows, { pageLength: 15, order: [[6, "desc"]] });
}
