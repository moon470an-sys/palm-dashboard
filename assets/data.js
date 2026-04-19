// Loads JSON datasets, exposes shared mutable state.
const DATA_BASE = "data/json/";

// Sentinel for the "All Companies" option in the company filter.
export const ALL = "__ALL__";

export const state = {
  companies: [],
  financials: [],
  operations: [],
  regions: [],
  assets: [],
  regionGeo: [],
  selectedCompany: null,
  selectedYear: null,
};

const FILES = ["companies", "financials", "operations", "regions", "assets", "region_geo"];

// Minimal sample so the page renders even if fetch fails.
const SAMPLE = {
  companies: [
    {
      company: "PT Sample Tbk", ticker: "SMPL", hq: "Jakarta",
      core_region: "Sumatra", primary_business: "Palm oil",
      business_model: "Integrated", listed_status: "Listed",
      group_structure_note: "Sample group structure for fallback display.",
    },
  ],
  financials: [
    {
      company: "PT Sample Tbk", report_year: 2024,
      revenue_idr_bn: 10000, gross_profit_idr_bn: 3000, net_profit_idr_bn: 1500,
      total_assets_idr_bn: 25000, total_liabilities_idr_bn: 12000, total_equity_idr_bn: 13000,
    },
  ],
  operations: [
    {
      company: "PT Sample Tbk", report_year: 2024,
      planted_area_total_ha: 100000, mature_area_ha: 80000,
      mills_count: 10, mill_capacity_tph: 500,
      cpo_refinery_count: 1, cpo_refinery_capacity_tpa: 100000,
      ffb_production_t: 1500000, cpo_production_t: 350000, oer_pct: 23.3,
    },
  ],
  regions: [
    { company: "PT Sample Tbk", report_year: 2024, region: "Sumatra", area_ha: 100000 },
  ],
  assets: [
    { company: "PT Sample Tbk", report_year: 2024, asset_type: "Mill", asset_count: 10, capacity: 500, capacity_unit: "tph" },
  ],
  region_geo: [
    { region: "Sumatra", lat: -0.5, lon: 101.5 },
    { region: "Kalimantan", lat: -1.0, lon: 114.0 },
    { region: "Sulawesi", lat: -2.0, lon: 120.5 },
    { region: "Other", lat: -4.0, lon: 138.0 },
  ],
};

async function loadOne(name) {
  try {
    const res = await fetch(`${DATA_BASE}${name}.json`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn(`[data] ${name}: falling back to sample (${err.message})`);
    return SAMPLE[name];
  }
}

export async function loadAll() {
  const [companies, financials, operations, regions, assets, region_geo] =
    await Promise.all(FILES.map(loadOne));
  state.companies = companies;
  state.financials = financials;
  state.operations = operations;
  state.regions = regions;
  state.assets = assets;
  state.regionGeo = region_geo;
  return state;
}

export function listCompanies() {
  return [...new Set(state.companies.map((c) => c.company).filter(Boolean))].sort();
}

export function listYears() {
  const ys = new Set();
  state.financials.forEach((r) => r.report_year && ys.add(r.report_year));
  state.operations.forEach((r) => r.report_year && ys.add(r.report_year));
  return [...ys].sort((a, b) => b - a);
}
