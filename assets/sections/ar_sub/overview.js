// Overview section: company identity card grid + Group Structure note.
import { state, ALL } from "../../data.js";
import { txt } from "./format.js";

const FIELDS = [
  { key: "company", label: "Company" },
  { key: "ticker", label: "Ticker" },
  { key: "exchange", label: "Exchange" },
  { key: "listed_status", label: "Listed Status" },
  { key: "hq", label: "HQ" },
  { key: "core_region", label: "Core Region" },
  { key: "primary_business", label: "Primary Business" },
  { key: "business_model", label: "Business Model" },
];

// 회사 메타 풍부 텍스트 노트 — AR source 단독 활용
const NOTE_FIELDS = [
  { key: "overall_comment", label: "Overall Comment" },
  { key: "key_red_flags", label: "Key Red Flags", warn: true },
  { key: "group_structure_note", label: "Group Structure" },
  { key: "subsidiaries_note", label: "Subsidiaries" },
  { key: "shareholder_structure_note", label: "Shareholder Structure" },
  { key: "acquisition_note", label: "Acquisition Note" },
];

export function renderOverview() {
  if (state.selectedCompany === ALL) {
    document.getElementById("overview-cards").innerHTML = "";
    document.getElementById("overview-detail").innerHTML = `
      <div class="detail-block">
        <div class="note na">Select a specific company in the sidebar to view its profile.</div>
      </div>`;
    return;
  }

  const co = state.companies.find((c) => c.company === state.selectedCompany);
  if (!co) {
    document.getElementById("overview-cards").innerHTML = "";
    document.getElementById("overview-detail").innerHTML = "";
    return;
  }

  document.getElementById("overview-cards").innerHTML = FIELDS.map(
    ({ key, label }) => `
      <div class="card">
        <div class="label">${label}</div>
        <div class="value">${txt(co[key])}</div>
      </div>`
  ).join("");

  // 6개 노트 블록 (있는 것만)
  const noteBlocks = NOTE_FIELDS.map(({ key, label, warn }) => {
    const note = co[key];
    if (!note || String(note).trim().length === 0) return "";
    const cls = warn ? 'note warn-note' : 'note';
    return `<div class="detail-block">
      <h3>${label}</h3>
      <div class="${cls}">${escapeHtml(String(note))}</div>
    </div>`;
  }).filter(Boolean).join("");

  document.getElementById("overview-detail").innerHTML = noteBlocks ||
    `<div class="detail-block"><div class="note na">N/A</div></div>`;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
