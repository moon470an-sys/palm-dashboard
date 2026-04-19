// Production Sector section: grouped Plantation / Mill / Refinery / Kernel Plant
// production output table + Sales sub-table.
import { state, ALL } from "../data.js";
import { txt, fmtNumber, fmtPct } from "../format.js";

// Column groups. Each col: top metric optionally with a smaller sub-metric below.
const PRODUCTION_GROUPS = [
  {
    label: "Plantation",
    cols: [
      {
        top: "Nucleus FFB (t)", topKey: "nucleus_ffb_t",
        sub: "Nucleus FFB Yield (t/ha)", subKey: "nucleus_ffb_yield_t_per_ha", subUnit: "t/ha",
        subFmt: (v) => fmtNumber(v, { decimals: 2 }),
      },
      { top: "Plasma FFB (t)", topKey: "plasma_ffb_t" },
      { top: "Third-Party FFB (t)", topKey: "third_party_ffb_t" },
      { top: "FFB Processed (t)", topKey: "ffb_processed_t" },
    ],
  },
  {
    label: "Mill",
    cols: [
      {
        top: "CPO Production (t)", topKey: "cpo_production_t",
        sub: "OER (%)", subKey: "oer_pct", subUnit: "%",
        subFmt: (v) => fmtNumber(v, { decimals: 2 }),
      },
      {
        top: "Kernel Production (t)", topKey: "kernel_production_t",
        sub: "KER (%)", subKey: "ker_pct", subUnit: "%",
        subFmt: (v) => fmtNumber(v, { decimals: 2 }),
      },
    ],
  },
  {
    label: "Refinery",
    cols: [
      { top: "RBDPO Production (t)", topKey: "rbdpo_production_t" },
      { top: "Olein Production (t)", topKey: "olein_production_t" },
      { top: "Stearin Production (t)", topKey: "stearin_production_t" },
      { top: "PFAD Production (t)", topKey: "pfad_production_t" },
    ],
  },
  {
    label: "Kernel Plant",
    cols: [
      {
        top: "PKO Production (t)", topKey: "pko_production_t",
        sub: "PKO Extraction (%)", subKey: "pko_extraction_pct", subUnit: "%",
        subFmt: (v) => fmtNumber(v, { decimals: 2 }),
      },
      { top: "PKE Production (t)", topKey: "pke_production_t" },
    ],
  },
];

const SALES_COLS = [
  {
    label: "Average CPO Selling Price (local ccy/kg)",
    key: "average_cpo_selling_price_local_per_kg",
    fmt: (v) => fmtNumber(v, { decimals: 2 }),
  },
  { label: "Domestic Sales (%)", key: "domestic_sales_pct", fmt: fmtPct },
  { label: "Export Sales (%)", key: "export_sales_pct", fmt: fmtPct },
];

const ALL_COLS = PRODUCTION_GROUPS.flatMap((g) => g.cols);

export function renderProduction() {
  const year = state.selectedYear;
  const company = state.selectedCompany;
  const filterByCompany = company !== ALL;

  const rows = state.operations
    .filter((r) => r.report_year === year)
    .filter((r) => !filterByCompany || r.company === company)
    .sort((a, b) => a.company.localeCompare(b.company));

  document.getElementById("production-meta").textContent = filterByCompany
    ? `Year ${year} · ${company}`
    : `Year ${year} · ${rows.length} companies`;

  // ---- Production grouped table ----
  const groupHeader = PRODUCTION_GROUPS.map(
    (g) => `<th class="group-header" colspan="${g.cols.length}">${g.label}</th>`
  ).join("");

  const colHeader = ALL_COLS.map((c) => `
    <th class="numeric">
      <div>${c.top}</div>
      ${c.sub ? `<div class="th-sub">${c.sub}</div>` : ""}
    </th>
  `).join("");

  const totalCols = ALL_COLS.length + 1; // +1 for Company

  const bodyRows = rows.map((r) => `
    <tr>
      <td>${escapeHtml(txt(r.company))}</td>
      ${ALL_COLS.map((c) => {
        const top = fmtNumber(r[c.topKey]);
        if (!c.subKey) return `<td class="numeric"><div>${top}</div></td>`;
        const v = r[c.subKey];
        const subFmt = c.subFmt || fmtNumber;
        const subDisplay = v == null || (typeof v === "number" && Number.isNaN(v))
          ? "N/A"
          : `${subFmt(v)}${c.subUnit ? " " + c.subUnit : ""}`;
        return `<td class="numeric"><div>${top}</div><div class="cell-sub">${subDisplay}</div></td>`;
      }).join("")}
    </tr>
  `).join("");

  document.getElementById("production-table").innerHTML = `
    <div class="table-wrap" style="max-height: 460px; overflow: auto;">
      <table class="data">
        <thead>
          <tr>
            <th rowspan="2">Company</th>
            ${groupHeader}
          </tr>
          <tr>${colHeader}</tr>
        </thead>
        <tbody>${bodyRows || `<tr><td colspan="${totalCols}" class="muted-text">No production data</td></tr>`}</tbody>
      </table>
    </div>
  `;

  // ---- Sales table ----
  const salesBody = rows.map((r) => `
    <tr>
      <td>${escapeHtml(txt(r.company))}</td>
      ${SALES_COLS.map((s) => `<td class="numeric">${s.fmt(r[s.key])}</td>`).join("")}
    </tr>
  `).join("");

  document.getElementById("sales-table").innerHTML = `
    <div class="table-wrap" style="max-height: 360px; overflow: auto;">
      <table class="data">
        <thead>
          <tr>
            <th>Company</th>
            ${SALES_COLS.map((s) => `<th class="numeric">${s.label}</th>`).join("")}
          </tr>
        </thead>
        <tbody>${salesBody || `<tr><td colspan="${SALES_COLS.length + 1}" class="muted-text">No sales data</td></tr>`}</tbody>
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
