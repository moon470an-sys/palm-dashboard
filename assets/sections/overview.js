import { state, kpiHTML, fmtInt, fmtHa, plot, makeTable } from "../data.js";

export function renderOverview(root) {
  const meta = state.meta || {};
  const c = meta.counts || {};
  const cross = state.cross || [];

  // 3-way 매칭 분석
  const both3 = cross.filter(x => x.gapki && x.rspo).length;
  const ispoOnly = cross.filter(x => !x.gapki && !x.rspo).length;
  const ispoGapki = cross.filter(x => x.gapki && !x.rspo).length;
  const ispoRspo = cross.filter(x => !x.gapki && x.rspo).length;

  const totalIspoHa = cross.reduce((s, x) => s + (x.ispo_ha || 0), 0);
  const ispoBerlakuN = state.ispo.certificates.filter(c => c.status === 'berlaku').length;

  root.innerHTML = `
    <h2>🏠 종합 (Overview)</h2>
    <div class="kpis">
      ${kpiHTML("ISPO 인증서", fmtInt(c.ispo_certificates), `유효 ${ispoBerlakuN}`)}
      ${kpiHTML("ISPO 회사", fmtInt(c.ispo_companies), `인증 면적 ${fmtHa(totalIspoHa)}`, "blue")}
      ${kpiHTML("RSPO Indonesia", fmtInt(c.rspo_members_id), `글로벌 9,343 중`, "warn")}
      ${kpiHTML("GAPKI 회원사", fmtInt(c.gapki_members), `매칭 ${cross.filter(x => x.gapki).length}`, "blue")}
      ${kpiHTML("BDSP 시계열", fmtInt(c.bdsp_nasional + c.bdsp_provinsi + c.bdsp_kabupaten), "국가/주/군")}
      ${kpiHTML("Annual Report 회사", fmtInt(state.ar.companies.length), "IDX 상장")}
    </div>

    <div class="card">
      <h3>7계층 출처 매트릭스</h3>
      <table class="tier-table">
        <thead><tr><th>Tier</th><th>출처</th><th>설명</th><th>상태</th></tr></thead>
        <tbody>
          <tr><td><span class="tier-tag">A</span></td><td>SISI</td><td>Permentan 33/2025 신설예정</td><td>대기</td></tr>
          <tr><td><span class="tier-tag">A'</span></td><td>Ditjenbun PDF</td><td>분기별 4건</td><td>중단 (재게시 감시)</td></tr>
          <tr><td><span class="tier-tag">B</span></td><td>LS-ISPO 14곳</td><td>인증서 ${fmtInt(c.ispo_certificates)}</td><td>✅ 활성</td></tr>
          <tr><td><span class="tier-tag">C</span></td><td>산업 뉴스 10 도메인</td><td>RSS+search · evidence ${fmtInt(c.cross_matching)}</td><td>✅ 활성</td></tr>
          <tr><td><span class="tier-tag">D</span></td><td>IDX 8 상장사 IR</td><td>Wiki metadata 포함</td><td>✅ 7/8 접근</td></tr>
          <tr><td><span class="tier-tag">E</span></td><td>RSPO PRISMA API</td><td>9,343 글로벌 · Indonesia 2,026</td><td>✅ 자동</td></tr>
          <tr><td><span class="tier-tag">F</span></td><td>BDSP 통계</td><td>5,562 시계열 · 38주 + 7주 kab</td><td>✅ 자동</td></tr>
          <tr><td><span class="tier-tag">G</span></td><td>GAPKI 협회</td><td>714 회원사</td><td>✅ 자동</td></tr>
        </tbody>
      </table>
    </div>

    <div class="grid-2">
      <div class="card"><h3>ISPO ↔ RSPO ↔ GAPKI 4분면</h3><div id="ov-venn" class="plot"></div></div>
      <div class="card"><h3>회사 유형 (Jenis)</h3><div id="ov-jenis" class="plot"></div></div>
    </div>

    <div class="card">
      <h3>전체 회사 cross-reference (1,195 회사)</h3>
      <p class="notice">🏪 GAPKI, 🌐 RSPO 가입 여부 · ISPO 인증 면적 기준 정렬</p>
      <div id="ov-table"></div>
    </div>
  `;

  // Venn (3-way)
  plot("ov-venn", [{
    x: ["ISPO만", "ISPO+GAPKI", "ISPO+RSPO", "3-way"],
    y: [ispoOnly, ispoGapki, ispoRspo, both3],
    type: "bar",
    marker: { color: ["#9ca3af", "#ff7f0e", "#1f77b4", "#2ca02c"] },
    text: [ispoOnly, ispoGapki, ispoRspo, both3], textposition: "outside",
  }], { yaxis: { title: "회사 수" } });

  // jenis
  const jenisMap = {};
  cross.forEach(x => { jenisMap[x.jenis || "미지정"] = (jenisMap[x.jenis || "미지정"] || 0) + 1; });
  plot("ov-jenis", [{
    labels: Object.keys(jenisMap), values: Object.values(jenisMap),
    type: "pie", hole: 0.4,
    marker: { colors: ["#2ca02c", "#1f77b4", "#ff7f0e", "#9467bd", "#7f7f7f"] },
  }]);

  // table
  const rows = cross.map(x => ({
    회사: x.company, 유형: x.jenis || "", 인증서수: x.n_cert || 0,
    면적_ha: x.ispo_ha || 0,
    GAPKI: x.gapki ? "🏪" : "", RSPO: x.rspo ? `🌐 ${x.rspo_n}` : "",
  }));
  makeTable("ov-table", [
    { data: "회사", title: "회사" },
    { data: "유형", title: "유형" },
    { data: "인증서수", title: "인증서수" },
    { data: "면적_ha", title: "ISPO 면적 (ha)",
      render: (d) => Number(d).toLocaleString() },
    { data: "GAPKI", title: "GAPKI" },
    { data: "RSPO", title: "RSPO" },
  ], rows, { pageLength: 15, order: [[3, "desc"]] });
}
