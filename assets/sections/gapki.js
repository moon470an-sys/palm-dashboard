// GAPKI — 회원사 명단 (gapki.id/member-gapki/) 단독 데이터.
// 출처에 없는 ISPO cross-reference는 사용하지 않음.
import { state, kpiHTML, fmtInt, plot, makeTable } from "../data.js";

const normRegion = (s) => (s || "").trim() ? s.trim().replace(/^aceh$/i, "Aceh") : "(미상)";

export function renderGapki(root) {
  const rows = state.gapki || [];
  const uniqueNames = new Set(rows.map(r => r.member_name));
  const branchRows = rows.filter(r => normRegion(r.branch).toLowerCase() !== "pusat");
  const pusatRows = rows.filter(r => normRegion(r.branch).toLowerCase() === "pusat");
  const withPhone = rows.filter(r => r.phone && !/^0$/.test(r.phone.trim())).length;
  const withAddr = rows.filter(r => r.address && r.address.length > 3).length;

  // 회사별 지점 수
  const branchCount = new Map();
  rows.forEach(r => {
    branchCount.set(r.member_name, (branchCount.get(r.member_name) || 0) + 1);
  });
  const multiBranch = [...branchCount.entries()].filter(([, n]) => n > 1);
  const topMulti = [...branchCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 30);

  // 지역(주) 분포 — Pusat 제외 (지방 거점만)
  const regionCount = new Map();
  branchRows.forEach(r => {
    const k = normRegion(r.branch);
    regionCount.set(k, (regionCount.get(k) || 0) + 1);
  });
  const regionSorted = [...regionCount.entries()].sort((a, b) => b[1] - a[1]);

  root.innerHTML = `
    <h2>🏪 GAPKI (Gabungan Pengusaha Kelapa Sawit Indonesia)</h2>
    <p class="notice">
      출처: <a href="https://gapki.id/member-gapki/" target="_blank" rel="noopener">gapki.id/member-gapki/</a>
      · 등록 row ${fmtInt(rows.length)} · 회원사 ${fmtInt(uniqueNames.size)} · 지방 거점 ${fmtInt(branchRows.length)}건
    </p>

    <div class="kpis">
      ${kpiHTML("등록 row", fmtInt(rows.length), "본사 + 지방 거점")}
      ${kpiHTML("회원사(고유)", fmtInt(uniqueNames.size), "", "blue")}
      ${kpiHTML("본사 (Pusat)", fmtInt(pusatRows.length))}
      ${kpiHTML("지방 거점", fmtInt(branchRows.length), `${regionCount.size}개 지역`)}
      ${kpiHTML("다지점 회사", fmtInt(multiBranch.length), "본사+지방 ≥ 2", "warn")}
      ${kpiHTML("주소 보유 row", fmtInt(withAddr), `${(withAddr/rows.length*100).toFixed(1)}%`)}
      ${kpiHTML("전화 보유 row", fmtInt(withPhone), `${(withPhone/rows.length*100).toFixed(1)}%`)}
    </div>

    <div class="grid-2">
      <div class="card"><h3>지역별 거점 분포 (Pusat 제외)</h3><div id="gapki-region" class="plot"></div></div>
      <div class="card"><h3>회사별 지점 수 Top 30 (본사+지방)</h3><div id="gapki-topbranch" class="plot"></div></div>
    </div>

    <div class="card">
      <h3>회원사 전체 명단 (검색·정렬)</h3>
      <div id="gapki-table"></div>
    </div>

    <div class="card">
      <h3>다지점 회원사 — 지점 수 ≥ 2</h3>
      <div id="gapki-multi-table"></div>
    </div>
  `;

  // 지역별 거점 (가로 막대, 큰 값 위에)
  plot("gapki-region", [{
    type: "bar",
    orientation: "h",
    y: regionSorted.map(([k]) => k).reverse(),
    x: regionSorted.map(([, v]) => v).reverse(),
    text: regionSorted.map(([, v]) => v).reverse(),
    textposition: "outside",
    marker: { color: "#1f77b4" },
  }], {
    height: Math.max(320, regionSorted.length * 22 + 60),
    xaxis: { title: "거점 수" },
    margin: { l: 130, r: 50, t: 20, b: 40 },
  });

  // 회사별 지점 수 Top 30
  plot("gapki-topbranch", [{
    type: "bar",
    orientation: "h",
    y: topMulti.map(([k]) => k).reverse(),
    x: topMulti.map(([, v]) => v).reverse(),
    text: topMulti.map(([, v]) => v).reverse(),
    textposition: "outside",
    marker: { color: "#ff7f0e" },
  }], {
    height: 30 * 22 + 80,
    xaxis: { title: "row 수 (본사+지방)" },
    margin: { l: 240, r: 50, t: 20, b: 40 },
  });

  // 전체 명단
  makeTable("gapki-table", [
    { data: "no", title: "#" },
    { data: "member_name", title: "회사" },
    { data: "branch", title: "지점/지역", render: (d) => d || "-" },
    { data: "address", title: "주소", render: (d) => d || "-" },
    { data: "phone", title: "전화", render: (d) => d || "-" },
  ], rows, { pageLength: 20, order: [[0, "asc"]] });

  // 다지점 회사
  const multiRows = multiBranch
    .map(([name, n]) => {
      const items = rows.filter(r => r.member_name === name);
      const regions = [...new Set(items.map(r => normRegion(r.branch)))].sort().join(", ");
      return { member_name: name, branch_count: n, regions };
    })
    .sort((a, b) => b.branch_count - a.branch_count);

  makeTable("gapki-multi-table", [
    { data: "member_name", title: "회사" },
    { data: "branch_count", title: "지점 수" },
    { data: "regions", title: "포함 지역" },
  ], multiRows, { pageLength: 20, order: [[1, "desc"]] });
}
