// RSPO — Indonesia 2,026 + 글로벌 9,343 (PRISMA API 단독)
import { state, kpiHTML, fmtInt, plot, makeTable } from "../data.js";

export function renderRspo(root) {
  const idMembers = state.rspo.members; // Indonesia
  const global = state.rspo.global;

  const active = idMembers.filter(m => m.license_status === 'ACTIVE').length;
  const expired = idMembers.filter(m => m.license_status === 'EXPIRED').length;
  const suspended = idMembers.filter(m => m.license_status === 'SUSPENDED').length;
  const terminated = idMembers.filter(m => m.license_status === 'TERMINATED').length;
  const pcArea = idMembers.filter(m => m.category === 'pc').reduce((s, m) => s + (m.area_ha || 0), 0);
  const cspoTotal = idMembers.reduce((s, m) => s + (m.cspo_volume_ton || 0), 0);

  // 만료 분석
  const today = new Date();
  const in90 = new Date(today.getTime() + 90 * 86400000).toISOString().slice(0, 10);
  const in365 = new Date(today.getTime() + 365 * 86400000).toISOString().slice(0, 10);
  const todayStr = today.toISOString().slice(0, 10);
  const exp90 = idMembers.filter(m => m.end_date && m.end_date.slice(0,10) <= in90 && m.end_date.slice(0,10) > todayStr).length;
  const exp365 = idMembers.filter(m => m.end_date && m.end_date.slice(0,10) <= in365 && m.end_date.slice(0,10) > todayStr).length;

  // 글로벌 country 합계
  const countryMap = {};
  global.forEach(g => { countryMap[g.country] = (countryMap[g.country] || 0) + g.n; });
  const idGlobal = countryMap["ID"] || 0;
  const globalTotal = Object.values(countryMap).reduce((s, n) => s + n, 0);

  root.innerHTML = `
    <h2>🌐 RSPO (Roundtable on Sustainable Palm Oil)</h2>
    <p class="notice">출처: PRISMA REST API (api-platform.cert-and-license.prismabyrspo.org) · 글로벌 ${fmtInt(globalTotal)} · Indonesia ${fmtInt(idMembers.length)}</p>

    <div class="kpis">
      ${kpiHTML("Indonesia RSPO 회원", fmtInt(idMembers.length), `Active ${active} · Expired ${expired}`, "blue")}
      ${kpiHTML("PC 면적 (P&C, 145사 보고)", `${(pcArea/1e6).toFixed(2)}M ha`, `${fmtInt(pcArea)} ha`)}
      ${kpiHTML("CSPO Volume (1496사)", `${(cspoTotal/1e6).toFixed(2)}M ton/yr`, "Certified Sustainable Palm Oil")}
      ${kpiHTML("90일 내 만료", fmtInt(exp90), "갱신 임박", "warn")}
      ${kpiHTML("1년 내 만료", fmtInt(exp365), "갱신 계획 필요", "warn")}
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
      <label>상태:</label>
      <select id="rspo-status">
        <option value="">전체</option>
        <option value="ACTIVE">ACTIVE</option>
        <option value="EXPIRED">EXPIRED</option>
        <option value="SUSPENDED">SUSPENDED</option>
      </select>
      <label>국가:</label>
      <select id="rspo-country"><option value="ID">Indonesia (default)</option></select>
      <span class="badge" id="rspo-count">${fmtInt(idMembers.length)}</span>
    </div>

    <div class="grid-2">
      <div class="card"><h3>카테고리별 (PC / ISH / Trader / Distributor)</h3><div id="rspo-cat-pie" class="plot"></div></div>
      <div class="card"><h3>License Status 분포 (Active vs Expired 등)</h3><div id="rspo-status" class="plot"></div></div>
    </div>
    <div class="grid-2">
      <div class="card"><h3>인증기관 (Certification Body) Top 10</h3><div id="rspo-cb" class="plot"></div></div>
      <div class="card"><h3>CSPO Volume Top 10 회사 (ton/yr)</h3><div id="rspo-cspo-top" class="plot"></div></div>
    </div>
    <div class="grid-2">
      <div class="card"><h3>국가별 Top 15 (글로벌, ID=빨강)</h3><div id="rspo-country-bar" class="plot"></div></div>
      <div class="card"><h3>PC 면적 국가별 Top 15 (글로벌)</h3><div id="rspo-pc-area" class="plot"></div></div>
    </div>
    <div class="card"><h3>만료 임박 (90일·1년 내 + 이미 만료) — Active 회원 갱신 추적</h3><div id="rspo-expiry" class="plot plot-tall"></div></div>

    <div class="card">
      <h3>Indonesia RSPO 회원 목록 (필터 검색)</h3>
      <div id="rspo-table"></div>
    </div>
  `;

  // category pie
  const catMap = {};
  idMembers.forEach(m => { catMap[m.category] = (catMap[m.category] || 0) + 1; });
  plot("rspo-cat-pie", [{
    labels: Object.keys(catMap), values: Object.values(catMap), type: "pie", hole: 0.4,
  }]);

  // status pie (new)
  const statusMap = { ACTIVE: active, EXPIRED: expired, SUSPENDED: suspended, TERMINATED: terminated };
  plot("rspo-status", [{
    labels: Object.keys(statusMap), values: Object.values(statusMap), type: "pie", hole: 0.4,
    marker: { colors: ["#2ca02c", "#ffbb78", "#d62728", "#8c564b"] },
  }]);

  // CSPO Top 10 (new — 1496사 데이터 활용)
  const cspoTop = [...idMembers].filter(m => m.cspo_volume_ton > 0).sort((a, b) => b.cspo_volume_ton - a.cspo_volume_ton).slice(0, 10);
  plot("rspo-cspo-top", [{
    x: cspoTop.map(m => m.cspo_volume_ton).reverse(),
    y: cspoTop.map(m => (m.member_name || "").substring(0, 40)).reverse(),
    type: "bar", orientation: "h",
    marker: { color: cspoTop.map(m => m.cspo_volume_ton).reverse(), colorscale: "Greens" },
    text: cspoTop.map(m => Math.round(m.cspo_volume_ton).toLocaleString()).reverse(),
    textposition: "outside",
  }], { yaxis: { autorange: "reversed" }, xaxis: { title: "CSPO Volume (ton/yr)" } });

  // certification body top 10
  const cbMap = {};
  idMembers.forEach(m => { if (m.certification_body) cbMap[m.certification_body] = (cbMap[m.certification_body] || 0) + 1; });
  const cbTop = Object.entries(cbMap).sort((a, b) => b[1] - a[1]).slice(0, 10);
  plot("rspo-cb", [{
    x: cbTop.map(c => c[1]), y: cbTop.map(c => c[0].substring(0, 35)),
    type: "bar", orientation: "h", marker: { color: "#1f77b4" },
    text: cbTop.map(c => c[1]), textposition: "outside",
  }], { yaxis: { autorange: "reversed" } });

  // global country bar
  const countrySorted = Object.entries(countryMap).sort((a, b) => b[1] - a[1]).slice(0, 15);
  plot("rspo-country-bar", [{
    x: countrySorted.map(c => c[1]), y: countrySorted.map(c => c[0]),
    type: "bar", orientation: "h",
    marker: { color: countrySorted.map(c => c[0] === "ID" ? "#d62728" : "#1f77b4") },
    text: countrySorted.map(c => c[1]), textposition: "outside",
  }], { yaxis: { autorange: "reversed" } });

  // PC area by country
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
  }], { yaxis: { autorange: "reversed" }, xaxis: { title: "Area (ha)" } });

  // expiry bucket (new): 과거 만료 / 90일 내 / 365일 내 / 365일+ / no date
  const buckets = { "이미 만료": 0, "90일 내 만료": 0, "90~365일": 0, "1년+ 후 만료": 0 };
  idMembers.forEach(m => {
    if (!m.end_date) return;
    const ed = m.end_date.slice(0, 10);
    if (ed <= todayStr) buckets["이미 만료"]++;
    else if (ed <= in90) buckets["90일 내 만료"]++;
    else if (ed <= in365) buckets["90~365일"]++;
    else buckets["1년+ 후 만료"]++;
  });
  // 카테고리별 만료 (PC vs ISH 등)
  const cats = ["pc", "ish", "trader", "distributor"];
  const expiryByCat = {};
  cats.forEach(c => { expiryByCat[c] = { "이미 만료": 0, "90일 내": 0, "90~365일": 0, "1년+": 0 }; });
  idMembers.forEach(m => {
    if (!m.end_date || !cats.includes(m.category)) return;
    const ed = m.end_date.slice(0, 10);
    const cat = m.category;
    if (ed <= todayStr) expiryByCat[cat]["이미 만료"]++;
    else if (ed <= in90) expiryByCat[cat]["90일 내"]++;
    else if (ed <= in365) expiryByCat[cat]["90~365일"]++;
    else expiryByCat[cat]["1년+"]++;
  });
  const expiryLabels = ["이미 만료", "90일 내", "90~365일", "1년+"];
  plot("rspo-expiry", expiryLabels.map((lbl, i) => ({
    x: cats, y: cats.map(c => expiryByCat[c][lbl]),
    type: "bar", name: lbl,
    marker: { color: ["#d62728", "#ff7f0e", "#ffbb78", "#2ca02c"][i] },
  })), {
    barmode: "stack",
    yaxis: { title: "회원 수" },
    legend: { orientation: "h", y: -0.18 },
    margin: { l: 60, r: 20, t: 10, b: 60 }, height: 480,
  });

  // table
  const rows = idMembers.map(m => ({
    category: m.category, member: m.member_name?.substring(0, 60),
    parent: m.parent_entity_name?.substring(0, 40) || "",
    cb: m.certification_body?.substring(0, 30) || "",
    cert_no: m.current_cert_number || "",
    area: Math.round(m.area_ha || 0),
    cspo: Math.round(m.cspo_volume_ton || 0),
    end_date: m.end_date?.slice(0, 10) || "",
    status: m.license_status || "",
  }));
  makeTable("rspo-table", [
    { data: "category", title: "분류" }, { data: "member", title: "회원" },
    { data: "parent", title: "Parent" }, { data: "cb", title: "인증기관" },
    { data: "cert_no", title: "Cert No" },
    { data: "area", title: "면적(ha)", render: (d) => Number(d).toLocaleString() },
    { data: "cspo", title: "CSPO(ton/yr)", render: (d) => Number(d).toLocaleString() },
    { data: "end_date", title: "만료" }, { data: "status", title: "상태" },
  ], rows, { pageLength: 15, order: [[5, "desc"]] });
}
