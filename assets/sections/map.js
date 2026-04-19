// Plantation Map section: Leaflet map of Indonesia + region summary table.
// Filters by selected company; "All Companies" shows aggregate.
import { state, ALL } from "../data.js";
import { fmtHa } from "../format.js";

// Per-region marker palette
const REGION_COLORS = {
  Sumatra:           { fill: "#4caf50", stroke: "#1b5e20" }, // green
  Kalimantan:        { fill: "#42a5f5", stroke: "#0d47a1" }, // blue
  Sulawesi:          { fill: "#ff9800", stroke: "#e65100" }, // orange
  Other:             { fill: "#ab47bc", stroke: "#4a148c" }, // purple
  "Other Indonesia": { fill: "#78909c", stroke: "#37474f" }, // sea-like grey
};
const DEFAULT_COLOR = { fill: "#9e9e9e", stroke: "#424242" };

let mapInstance = null;
let layerGroup = null;

function ensureMap() {
  if (mapInstance) return;
  mapInstance = L.map("leaflet-map", {
    center: [-2.0, 118.0],
    zoom: 4,
    minZoom: 3,
    maxZoom: 9,
    scrollWheelZoom: false,
  });
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '© <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(mapInstance);
  layerGroup = L.layerGroup().addTo(mapInstance);
  mapInstance.on("focus", () => mapInstance.scrollWheelZoom.enable());
  mapInstance.on("blur", () => mapInstance.scrollWheelZoom.disable());
}

export function renderMap() {
  ensureMap();
  layerGroup.clearLayers();

  const year = state.selectedYear;
  const company = state.selectedCompany;
  const filterByCompany = company !== ALL;

  // Aggregate area per region (and per company within region)
  const byRegion = new Map();
  state.regions
    .filter((r) => r.report_year === year && (r.area_ha || 0) > 0)
    .filter((r) => !filterByCompany || r.company === company)
    .forEach((r) => {
      const cur = byRegion.get(r.region) || { area: 0, companies: new Map() };
      cur.area += r.area_ha;
      cur.companies.set(r.company, (cur.companies.get(r.company) || 0) + r.area_ha);
      byRegion.set(r.region, cur);
    });

  const maxArea = Math.max(1, ...Array.from(byRegion.values()).map((v) => v.area));

  for (const [region, agg] of byRegion) {
    const geo = state.regionGeo.find((g) => g.region === region);
    if (!geo) continue;
    const radius = Math.sqrt(agg.area / maxArea) * 35 + 12;

    const colors = REGION_COLORS[region] || DEFAULT_COLOR;
    const marker = L.circleMarker([geo.lat, geo.lon], {
      radius,
      color: colors.stroke,
      weight: 2,
      fillColor: colors.fill,
      fillOpacity: 0.55,
    }).addTo(layerGroup);

    let popupHtml;
    if (filterByCompany) {
      popupHtml = `
        <strong>${escapeHtml(region)}</strong><br/>
        <span style="color:#444;">${escapeHtml(company)}</span><br/>
        Area: ${fmtHa(agg.area)}
      `;
    } else {
      const sortedCos = Array.from(agg.companies.entries()).sort((a, b) => b[1] - a[1]);
      const top = sortedCos.slice(0, 8);
      const more = sortedCos.length - top.length;
      popupHtml = `
        <strong>${escapeHtml(region)}</strong><br/>
        Total Area: ${fmtHa(agg.area)}<br/>
        Companies: ${agg.companies.size}
        <hr style="margin: 6px 0; border: none; border-top: 1px solid #ddd;"/>
        <table>
          ${top.map(([co, area]) => `
            <tr>
              <td style="max-width: 220px; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(co)}</td>
              <td class="numeric" style="text-align: right; padding-left: 12px;">${fmtHa(area)}</td>
            </tr>`).join("")}
          ${more > 0 ? `<tr><td colspan="2"><em>+ ${more} more</em></td></tr>` : ""}
        </table>
      `;
    }
    marker.bindPopup(popupHtml, { maxWidth: 360 });
  }

  // ---- Region summary table ----
  const heading = filterByCompany
    ? `${escapeHtml(company)} — ${year}`
    : `Region Summary — ${year}`;

  const summaryRows = Array.from(byRegion.entries())
    .sort((a, b) => b[1].area - a[1].area)
    .map(([region, agg]) => `
      <tr>
        <td>${escapeHtml(region)}</td>
        <td class="numeric">${fmtHa(agg.area)}</td>
        ${filterByCompany ? "" : `<td class="numeric">${agg.companies.size}</td>`}
      </tr>
    `).join("");

  const colspan = filterByCompany ? 2 : 3;
  const headerCols = filterByCompany
    ? `<th>Region</th><th class="numeric">Area</th>`
    : `<th>Region</th><th class="numeric">Total Area</th><th class="numeric">Companies</th>`;

  document.getElementById("region-summary").innerHTML = `
    <h3 style="margin: 0 0 10px;">${heading}</h3>
    <div class="table-wrap">
      <table class="data">
        <thead><tr>${headerCols}</tr></thead>
        <tbody>${summaryRows || `<tr><td colspan="${colspan}" class="muted-text">No plantation data for this selection</td></tr>`}</tbody>
      </table>
    </div>
    <p class="muted-text" style="font-size: 12px; margin-top: 10px;">
      ${filterByCompany
        ? "Click a circle for details. Switch to <strong>All Companies</strong> to see aggregate."
        : "Click a circle to see top companies in that region."}
    </p>
  `;

  // Re-render so map fits its container after section becomes visible.
  setTimeout(() => mapInstance.invalidateSize(), 50);
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
