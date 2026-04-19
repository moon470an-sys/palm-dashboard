// Asset Detail section: companies operations table + Mill/Refinery pivot.
import { state, ALL } from "../data.js";
import { txt, fmtNumber, fmtPct } from "../format.js";

const ASSET_TYPES = ["Mill", "Kernel Crushing", "CPO Refinery", "PKO Refinery", "NPK Plant"];

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

  // ---- Companies operations table ----
  document.getElementById("asset-table").innerHTML = `
    <div class="table-wrap" style="max-height: 460px; overflow: auto;">
      <table class="data">
        <thead>
          <tr>
            <th>Company</th>
            <th class="numeric">Planted (ha)</th>
            <th class="numeric">Mature (ha)</th>
            <th class="numeric">Mills</th>
            <th class="numeric">CPO Refineries</th>
            <th class="numeric">FFB Prod (t)</th>
            <th class="numeric">CPO Prod (t)</th>
            <th class="numeric">OER (%)</th>
          </tr>
        </thead>
        <tbody>
          ${ops.map((r) => `
            <tr>
              <td>${escapeHtml(txt(r.company))}</td>
              <td class="numeric">${fmtNumber(r.planted_area_total_ha)}</td>
              <td class="numeric">${fmtNumber(r.mature_area_ha)}</td>
              <td class="numeric">${fmtNumber(r.mills_count)}</td>
              <td class="numeric">${fmtNumber(r.cpo_refinery_count)}</td>
              <td class="numeric">${fmtNumber(r.ffb_production_t)}</td>
              <td class="numeric">${fmtNumber(r.cpo_production_t)}</td>
              <td class="numeric">${fmtPct(r.oer_pct)}</td>
            </tr>
          `).join("") || `<tr><td colspan="8" class="muted-text">No data for ${year}</td></tr>`}
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
