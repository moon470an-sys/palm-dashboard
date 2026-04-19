// Asset Detail section: plantation operations table + Mill/Refinery pivot.
import { state, ALL } from "../data.js";
import { txt, fmtNumber } from "../format.js";

// Operating Assets columns: count on top, capacity below as small subtext.
const OPERATING_ASSET_COLS = [
  { countLabel: "Mills Count (#)", capLabel: "Mill Capacity (tph)", countKey: "mills_count", capKey: "mill_capacity_tph", unit: "tph" },
  { countLabel: "Kernel Crushing Count (#)", capLabel: "Kernel Crushing Capacity (tph)", countKey: "kernel_crushing_count", capKey: "kernel_crushing_capacity_tph", unit: "tph" },
  { countLabel: "CPO Refinery Count (#)", capLabel: "CPO Refinery Capacity (tpa)", countKey: "cpo_refinery_count", capKey: "cpo_refinery_capacity_tpa", unit: "tpa" },
  { countLabel: "PKO Refinery Count (#)", capLabel: "PKO Refinery Capacity (tpa)", countKey: "pko_refinery_count", capKey: "pko_refinery_capacity_tpa", unit: "tpa" },
  { countLabel: "NPK Plant Count (#)", capLabel: null, countKey: "npk_plant_count", capKey: null, unit: null },
];

// Plantation Asset columns: [json_key, header label, fmt fn]
const PLANTATION_COLS = [
  ["planted_area_total_ha", "Planted Area Total (ha)", fmtNumber],
  ["nucleus_area_ha", "Nucleus Area (ha)", fmtNumber],
  ["plasma_area_ha", "Plasma Area (ha)", fmtNumber],
  ["mature_area_ha", "Mature Area (ha)", fmtNumber],
  ["immature_area_ha", "Immature Area (ha)", fmtNumber],
  ["productive_age_area_ha", "Productive Age Area (ha)", fmtNumber],
  ["old_age_area_ha", "Old Age Area (ha)", fmtNumber],
  ["average_tree_age_years", "Average Tree Age (years)", (v) => fmtNumber(v, { decimals: 1 })],
  ["replanting_area_ha", "Replanting Area (ha)", fmtNumber],
  ["sumatra_area_ha", "Sumatra Area (ha)", fmtNumber],
  ["kalimantan_area_ha", "Kalimantan Area (ha)", fmtNumber],
  ["sulawesi_area_ha", "Sulawesi Area (ha)", fmtNumber],
  ["other_region_area_ha", "Other Region Area (ha)", fmtNumber],
];

export function renderAssets() {
  const year = state.selectedYear;
  const company = state.selectedCompany;
  const filterByCompany = company !== ALL;

  const ops = state.operations
    .filter((r) => r.report_year === year)
    .filter((r) => !filterByCompany || r.company === company)
    .sort((a, b) => (b.planted_area_total_ha || 0) - (a.planted_area_total_ha || 0));

  document.getElementById("asset-meta").textContent = filterByCompany
    ? `Year ${year} · ${company}`
    : `Year ${year} · ${ops.length} companies`;

  // ---- Plantation Asset table ----
  const totalCols = PLANTATION_COLS.length + 1; // +1 for Company column
  document.getElementById("asset-table").innerHTML = `
    <div class="table-wrap" style="max-height: 460px; overflow: auto;">
      <table class="data">
        <thead>
          <tr>
            <th class="col-company">Company</th>
            ${PLANTATION_COLS.map(([, label]) => `<th class="numeric">${label}</th>`).join("")}
          </tr>
        </thead>
        <tbody>
          ${
            ops.map((r) => `
              <tr>
                <td class="col-company">${escapeHtml(txt(r.company))}</td>
                ${PLANTATION_COLS.map(([key, , fmt]) => `<td class="numeric">${fmt(r[key])}</td>`).join("")}
              </tr>
            `).join("") ||
            `<tr><td colspan="${totalCols}" class="muted-text">No data for ${year}</td></tr>`
          }
        </tbody>
      </table>
    </div>
  `;

  // ---- Operating Assets table (count on top / capacity below) ----
  const opsForAssets = [...ops].sort((a, b) => a.company.localeCompare(b.company));
  const opTotalCols = OPERATING_ASSET_COLS.length + 1;

  const headerCells = OPERATING_ASSET_COLS.map((c) => `
    <th class="numeric">
      <div>${c.countLabel}</div>
      ${c.capLabel ? `<div class="th-sub">${c.capLabel}</div>` : ""}
    </th>
  `).join("");

  const bodyRows = opsForAssets.map((r) => `
    <tr>
      <td>${escapeHtml(txt(r.company))}</td>
      ${OPERATING_ASSET_COLS.map((c) => {
        const count = r[c.countKey];
        const capValue = c.capKey ? r[c.capKey] : null;
        const capLine = c.capKey
          ? `<div class="cell-sub">${capValue == null || Number.isNaN(capValue) ? "N/A" : `${fmtNumber(capValue)} ${c.unit}`}</div>`
          : "";
        return `<td class="numeric"><div>${fmtNumber(count)}</div>${capLine}</td>`;
      }).join("")}
    </tr>
  `).join("");

  document.getElementById("asset-pivot").innerHTML = `
    <div class="table-wrap" style="max-height: 460px; overflow: auto;">
      <table class="data">
        <thead><tr><th>Company</th>${headerCells}</tr></thead>
        <tbody>${bodyRows || `<tr><td colspan="${opTotalCols}" class="muted-text">No data for ${year}</td></tr>`}</tbody>
      </table>
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
