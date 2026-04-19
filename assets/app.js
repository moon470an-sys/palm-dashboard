// Main entry: load data, wire sidebar selectors, render sections.
import { loadAll, state, listCompanies, listYears, ALL } from "./data.js";
import { initNav } from "./nav.js";
import { renderOverview } from "./sections/overview.js";
import { renderFinancials } from "./sections/financials.js";
import { renderMap } from "./sections/map.js";
import { renderAssets } from "./sections/assets.js";

function buildSelectors() {
  const companies = listCompanies();
  const years = listYears();

  const cSel = document.getElementById("company-select");
  const allOption = `<option value="${ALL}">All Companies</option>`;
  cSel.innerHTML =
    allOption +
    companies
      .map((c) => `<option value="${escapeAttr(c)}">${escapeHtml(c)}</option>`)
      .join("");
  state.selectedCompany = companies[0] || ALL;
  cSel.value = state.selectedCompany;

  const ySel = document.getElementById("year-select");
  ySel.innerHTML = years.map((y) => `<option value="${y}">${y}</option>`).join("");
  state.selectedYear = years[0] || null;
  ySel.value = state.selectedYear ?? "";

  cSel.addEventListener("change", (e) => {
    state.selectedCompany = e.target.value;
    renderOverview();
    renderFinancials();
    renderMap();
  });

  ySel.addEventListener("change", (e) => {
    state.selectedYear = Number(e.target.value);
    renderMap();
    renderAssets();
  });
}

function renderAll() {
  renderOverview();
  renderFinancials();
  renderMap();
  renderAssets();
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
function escapeAttr(s) {
  return String(s).replace(/"/g, "&quot;");
}

(async () => {
  try {
    await loadAll();
    buildSelectors();
    initNav();
    renderAll();
  } catch (err) {
    console.error("[app] init failed", err);
    document.querySelector(".boot .msg").textContent = "Failed to load: " + err.message;
    return;
  }
  const boot = document.querySelector(".boot");
  if (boot) boot.remove();
})();
