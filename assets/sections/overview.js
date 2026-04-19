// Overview section: company identity card grid + Group Structure note.
import { state, ALL } from "../data.js";
import { txt } from "../format.js";

const FIELDS = [
  { key: "company", label: "Company" },
  { key: "ticker", label: "Ticker" },
  { key: "hq", label: "HQ" },
  { key: "core_region", label: "Core Region" },
  { key: "primary_business", label: "Primary Business" },
  { key: "business_model", label: "Business Model" },
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

  const note = co.group_structure_note;
  const noteHtml = note
    ? `<div class="note">${escapeHtml(note)}</div>`
    : `<div class="note na">N/A</div>`;

  document.getElementById("overview-detail").innerHTML = `
    <div class="detail-block">
      <h3>Group Structure</h3>
      ${noteHtml}
    </div>
  `;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
