// GAPKI — 714 회원사 + ISPO 매칭
import { state, kpiHTML, fmtInt, plot, makeTable } from "../data.js";

export function renderGapki(root) {
  const data = state.gapki;
  const matched = data.filter(g => g.ispo_company_id != null);
  const unmatched = data.filter(g => g.ispo_company_id == null);

  root.innerHTML = `
    <h2>🏪 GAPKI (Gabungan Pengusaha Kelapa Sawit Indonesia)</h2>
    <p class="notice">출처: gapki.id/member-gapki/ · ${fmtInt(data.length)} 회원사 · ISPO 매칭 ${matched.length} (${(matched.length/data.length*100).toFixed(1)}%)</p>

    <div class="kpis">
      ${kpiHTML("회원사 총", fmtInt(data.length))}
      ${kpiHTML("ISPO 매칭", fmtInt(matched.length), `${(matched.length/data.length*100).toFixed(1)}%`, "blue")}
      ${kpiHTML("ISPO 미매칭", fmtInt(unmatched.length), "잠재 추적 대상", "warn")}
      ${kpiHTML("Exact match", fmtInt(matched.filter(m => m.match_method === 'exact_norm').length))}
      ${kpiHTML("Fuzzy match (≥88)", fmtInt(matched.filter(m => m.match_method === 'fuzzy').length))}
    </div>

    <div class="grid-2">
      <div class="card"><h3>매칭 방법 분포</h3><div id="gapki-method" class="plot"></div></div>
      <div class="card"><h3>Fuzzy match score 분포</h3><div id="gapki-score" class="plot"></div></div>
    </div>

    <div class="card">
      <h3>GAPKI 회원사 + ISPO 매칭 (전체 검색 필터)</h3>
      <div id="gapki-table"></div>
    </div>

    <div class="card">
      <h3>ISPO 미매칭 GAPKI 회원사 (RSPO/ISPO 가입 권유 가능 대상)</h3>
      <div id="gapki-unmatched-table"></div>
    </div>
  `;

  // method pie
  const methodMap = { exact_norm: 0, fuzzy: 0, none: unmatched.length };
  matched.forEach(m => { methodMap[m.match_method] = (methodMap[m.match_method] || 0) + 1; });
  plot("gapki-method", [{
    labels: Object.keys(methodMap), values: Object.values(methodMap), type: "pie", hole: 0.4,
    marker: { colors: ["#2ca02c", "#ff7f0e", "#9ca3af"] },
  }]);

  // score histogram
  const scores = matched.filter(m => m.match_method === "fuzzy").map(m => m.match_score);
  plot("gapki-score", [{
    x: scores, type: "histogram", nbinsx: 10, marker: { color: "#1f77b4" },
  }], { xaxis: { title: "match score (88-100)" }, yaxis: { title: "건수" } });

  // tables
  makeTable("gapki-table", [
    { data: "member_name", title: "GAPKI 회원사" },
    { data: "ispo_match", title: "ISPO 회사 (매칭)" },
    { data: "match_score", title: "score", render: (d) => d ? Number(d).toFixed(1) : "-" },
    { data: "match_method", title: "방법" },
  ], data, { pageLength: 20 });

  makeTable("gapki-unmatched-table", [
    { data: "member_name", title: "GAPKI 회원사 (ISPO 미매칭)" },
  ], unmatched, { pageLength: 20 });
}
