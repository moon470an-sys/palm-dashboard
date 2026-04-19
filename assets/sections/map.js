// Plantation Map section: Leaflet map of Indonesia + region summary table.
import { state } from "../data.js";
import { fmtHa } from "../format.js";

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
  // Enable scroll-zoom only when the map gets focus.
  mapInstance.on("focus", () => mapInstance.scrollWheelZoom.enable());
  mapInstance.on("blur", () => mapInstance.scrollWheelZoom.disable());
}

export function renderMap() {
  ensureMap();
  layerGroup.clearLayers();

  const year = state.selectedYear;
  const byRegion = new Map();
  state.regions
    .filter((r) => r.report_year === year && (r.area_ha || 0) > 0)
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

    const marker = L.circleMarker([geo.lat, geo.lon], {
      radius,
      color: "#1b5e20",
      weight: 2,
      fillColor: "#4caf50",
      fillOpacity: 0.55,
    }).addTo(layerGroup);

    const sortedCos = Array.from(agg.companies.entries()).sort((a, b) => b[1] - a[1]);
    const top = sortedCos.slice(0, 8);
    const more = sortedCos.length - top.length;

    const popup = `
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
    marker.bindPopup(popup, { maxWidth: 360 });
  }

  // ---- Region summary table ----
  const rows = Array.from(byRegion.entries())
    .sort((a, b) => b[1].area - a[1].area)
    .map(([region, agg]) => `
      <tr>
        <td>${escapeHtml(region)}</td>
        <td class="numeric">${fmtHa(agg.area)}</td>
        <td class="numeric">${agg.companies.size}</td>
      </tr>
    `).join("");

  document.getElementById("region-summary").innerHTML = `
    <h3 style="margin: 0 0 10px;">Region Summary — ${year}</h3>
    <div class="table-wrap">
      <table class="data">
        <thead>
          <tr>
            <th>Region</th>
            <th class="numeric">Total Area</th>
            <th class="numeric">Companies</th>
          </tr>
        </thead>
        <tbody>${rows || `<tr><td colspan="3" class="muted-text">No data</td></tr>`}</tbody>
      </table>
    </div>
    <p class="muted-text" style="font-size: 12px; margin-top: 10px;">
      Click a circle to see top companies in that region.
    </p>
  `;

  // Force a refresh so the map re-renders correctly after the section becomes visible.
  setTimeout(() => mapInstance.invalidateSize(), 50);
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
