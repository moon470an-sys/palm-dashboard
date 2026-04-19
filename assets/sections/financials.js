// Financials section: Revenue/Profit chart + Balance Sheet chart.
import { state, ALL } from "../data.js";

const COLORS = {
  revenue: "#2e7d32",
  grossProfit: "#81c784",
  netProfit: "#1565c0",
  assets: "#1565c0",
  liabilities: "#ef6c00",
  equity: "#6d4c41",
};

const GRID_COLOR = "rgba(0,0,0,0.06)";

const SHARED_LAYOUT = {
  paper_bgcolor: "transparent",
  plot_bgcolor: "transparent",
  font: { family: "system-ui, sans-serif", size: 12 },
  margin: { t: 60, r: 60, b: 50, l: 70 },
  height: 400,
  // Top-right horizontal legend, frees up the chart area
  legend: {
    orientation: "h",
    x: 1, xanchor: "right",
    y: 1.12, yanchor: "bottom",
    bgcolor: "rgba(0,0,0,0)",
  },
  // Bar sizing (≈ barPercentage 0.7, categoryPercentage 0.8 in Chart.js)
  bargap: 0.25,
  bargroupgap: 0.08,
  hoverlabel: {
    bgcolor: "white",
    bordercolor: "#ccc",
    font: { family: "system-ui, sans-serif", size: 12 },
  },
};

const X_AXIS = {
  type: "category", // years as discrete categories — no decimals
  showgrid: false,
  showline: true,
  linecolor: GRID_COLOR,
  ticks: "outside",
  ticklen: 4,
  tickcolor: GRID_COLOR,
};

const Y_AXIS_BASE = {
  showgrid: true,
  gridcolor: GRID_COLOR,
  zeroline: true,
  zerolinecolor: GRID_COLOR,
  separatethousands: true,
  tickformat: ",",
};

const CONFIG = { responsive: true, displayModeBar: false };

function hideFinancialCharts() {
  Plotly.purge("chart-revenue-profit");
  Plotly.purge("chart-assets-liab");
  const c1 = document.getElementById("chart-revenue-profit");
  const c2 = document.getElementById("chart-assets-liab");
  c1.innerHTML = "";
  c2.innerHTML = "";
  c1.style.display = "none";
  c2.style.display = "none";
}

function showFinancialCharts() {
  document.getElementById("chart-revenue-profit").style.display = "";
  document.getElementById("chart-assets-liab").style.display = "";
}

export function renderFinancials() {
  if (state.selectedCompany === ALL) {
    hideFinancialCharts();
    return;
  }
  showFinancialCharts();

  const rows = state.financials
    .filter((r) => r.company === state.selectedCompany)
    .sort((a, b) => (a.report_year || 0) - (b.report_year || 0));

  const years = rows.map((r) => String(r.report_year));

  const revenue = rows.map((r) => r.revenue_idr_bn);
  const grossProfit = rows.map((r) => r.gross_profit_idr_bn);
  const netProfit = rows.map((r) => r.net_profit_idr_bn);

  const fmtLabel = (v) => (v == null || Number.isNaN(v) ? "" : Number(v).toLocaleString("en-US"));

  // ============================ Chart 1: Revenue & Profit ============================
  Plotly.newPlot(
    "chart-revenue-profit",
    [
      {
        type: "bar", name: "Revenue",
        x: years, y: revenue,
        marker: { color: COLORS.revenue },
        text: revenue.map(fmtLabel),
        textposition: "outside",
        textfont: { size: 11 },
        cliponaxis: false,
        hovertemplate: "Revenue: %{y:,.0f} IDR bn (%{x})<extra></extra>",
      },
      {
        type: "bar", name: "Gross Profit",
        x: years, y: grossProfit,
        marker: { color: COLORS.grossProfit },
        text: grossProfit.map(fmtLabel),
        textposition: "outside",
        textfont: { size: 11 },
        cliponaxis: false,
        hovertemplate: "Gross Profit: %{y:,.0f} IDR bn (%{x})<extra></extra>",
      },
      {
        type: "bar", name: "Net Profit",
        x: years, y: netProfit,
        marker: { color: COLORS.netProfit },
        text: netProfit.map(fmtLabel),
        textposition: "outside",
        textfont: { size: 11 },
        cliponaxis: false,
        hovertemplate: "Net Profit: %{y:,.0f} IDR bn (%{x})<extra></extra>",
      },
    ],
    {
      ...SHARED_LAYOUT,
      title: { text: "Revenue & Profit", font: { size: 14 }, x: 0.02, xanchor: "left" },
      barmode: "group",
      xaxis: X_AXIS,
      yaxis: { ...Y_AXIS_BASE, title: { text: "IDR bn" } },
    },
    CONFIG
  );

  // ============================ Chart 2: Balance Sheet ============================
  Plotly.newPlot(
    "chart-assets-liab",
    [
      {
        type: "bar", name: "Total Assets",
        x: years, y: rows.map((r) => r.total_assets_idr_bn),
        marker: { color: COLORS.assets },
        text: rows.map((r) => fmtLabel(r.total_assets_idr_bn)),
        textposition: "outside", textfont: { size: 11 }, cliponaxis: false,
        hovertemplate: "Total Assets: %{y:,.0f} IDR bn (%{x})<extra></extra>",
      },
      {
        type: "bar", name: "Total Liabilities",
        x: years, y: rows.map((r) => r.total_liabilities_idr_bn),
        marker: { color: COLORS.liabilities },
        text: rows.map((r) => fmtLabel(r.total_liabilities_idr_bn)),
        textposition: "outside", textfont: { size: 11 }, cliponaxis: false,
        hovertemplate: "Total Liabilities: %{y:,.0f} IDR bn (%{x})<extra></extra>",
      },
      {
        type: "bar", name: "Total Equity",
        x: years, y: rows.map((r) => r.total_equity_idr_bn),
        marker: { color: COLORS.equity },
        text: rows.map((r) => fmtLabel(r.total_equity_idr_bn)),
        textposition: "outside", textfont: { size: 11 }, cliponaxis: false,
        hovertemplate: "Total Equity: %{y:,.0f} IDR bn (%{x})<extra></extra>",
      },
    ],
    {
      ...SHARED_LAYOUT,
      title: { text: "Balance Sheet", font: { size: 14 }, x: 0.02, xanchor: "left" },
      barmode: "group",
      xaxis: X_AXIS,
      yaxis: { ...Y_AXIS_BASE, title: { text: "Amount (IDR bn)" } },
    },
    CONFIG
  );
}
