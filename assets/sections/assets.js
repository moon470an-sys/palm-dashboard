// Asset Detail section: plantation operations table + Mill/Refinery pivot.
import { state, ALL } from "../data.js";
import { txt, fmtNumber } from "../format.js";

const ASSET_TYPES = ["Mill", "Kernel Crushing", "CPO Refinery", "PKO Refinery", "NPK Plant"];

// Plantation Operations columns: [json_key, header label, fmt fn]
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

  // ---- Plantation Operations table ----
  const totalCols = PLANTATION_COLS.length + 1; // +1 for Company column
  document.getElementById("asset-table").innerHTML = `
    <div class="table-wrap" style="max-height: 460px; overflow: auto;">
      <table class="data">
        <thead>
          <tr>
            <th>Company</th>
            ${PLANTATION_COLS.map(([, label]) => `<th class="numeric">${label}</th>`).join("")}
          </tr>
        </thead>
        <tbody>
          ${
            ops.map((r) => `
              <tr>
                <td>${escapeHtml(txt(r.company))}</td>
                ${PLANTATION_COLS.map(([key, , fmt]) => `<td class="numeric">${fmt(r[key])}</td>`).join("")}
              </tr>
            `).join("") ||
            `<tr><td colspan="${totalCols}" class="muted-text">No data for ${year}</td></tr>`
          }
        </tbody>
      </table>
    </div>
  `;

  // ---- Asset pivot (Mill / Refinery / etc) ----
  const byCo = new Map();
  state.assets
    .filter((r) => r.report_year === year && (r.asset_count || 0) > 0)
    .filter((r) => !filterByCompany || r.company === company)
    .forEach((r) => {
      if (!byCo.has(r.company)) byCo.set(r.company, {});
      byCo.get(r.company)[r.asset_type] = {
        count: r.asset_count,
        capacity: r.capacity,
        unit: r.capacity_unit,
      };
    });

  const sortedCos = Array.from(byCo.entries()).sort((a, b) =>
    a[0].localeCompare(b[0])
  );

  const pivotRows = sortedCos.map(([co, data]) => `
    <tr>
      <td>${escapeHtml(co)}</td>
      ${ASSET_TYPES.map((t) => {
        const d = data[t];
        if (!d) return `<td class="numeric muted-text">N/A</td>`;
        const cap = d.capacity ? `<br/><span class="muted-text" style="font-size: 11px;">${fmtNumber(d.capacity)} ${d.unit || ""}</span>` : "";
        return `<td class="numeric">${fmtNumber(d.count)}${cap}</td>`;
      }).join("")}
    </tr>
  `).join("");

  document.getElementById("asset-pivot").innerHTML = `
    <div class="table-wrap" style="max-height: 460px; overflow: auto;">
      <table class="data">
        <thead>
          <tr>
            <th>Company</th>
            ${ASSET_TYPES.map((t) => `<th class="numeric">${t}</th>`).join("")}
          </tr>
        </thead>
        <tbody>${pivotRows || `<tr><td colspan="${ASSET_TYPES.length + 1}" class="muted-text">No data</td></tr>`}</tbody>
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
