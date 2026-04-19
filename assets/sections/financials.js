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

function showFinancialPlaceholder(msg) {
  Plotly.purge("chart-revenue-profit");
  Plotly.purge("chart-assets-liab");
  const c1 = document.getElementById("chart-revenue-profit");
  const c2 = document.getElementById("chart-assets-liab");
  c1.innerHTML = `<div class="chart-placeholder">${msg}</div>`;
  c1.style.gridColumn = "1 / -1";
  c2.style.display = "none";
  c2.innerHTML = "";
}

function clearFinancialPlaceholder() {
  document.getElementById("chart-revenue-profit").style.gridColumn = "";
  document.getElementById("chart-assets-liab").style.display = "";
}

export function renderFinancials() {
  if (state.selectedCompany === ALL) {
    showFinancialPlaceholder("Select a specific company in the sidebar to view financial charts.");
    return;
  }
  clearFinancialPlaceholder();

  const rows = state.financials
    .filter((r) => r.company === state.selectedCompany)
    .sort((a, b) => (a.report_year || 0) - (b.report_year || 0));

  const years = rows.map((r) => String(r.report_year));

  const revenue = rows.map((r) => r.revenue_idr_bn);
  const grossProfit = rows.map((r) => r.gross_profit_idr_bn);
  const netProfit = rows.map((r) => r.net_profit_idr_bn);

  // ============================ Chart 1: Revenue & Profit ============================
  Plotly.newPlot(
    "chart-revenue-profit",
    [
      {
        type: "bar", name: "Revenue",
        x: years, y: revenue,
        marker: { color: COLORS.revenue },
        hovertemplate: "Revenue: %{y:,.0f} IDR bn (%{x})<extra></extra>",
      },
      {
        type: "bar", name: "Gross Profit",
        x: years, y: grossProfit,
        marker: { color: COLORS.grossProfit },
        hovertemplate: "Gross Profit: %{y:,.0f} IDR bn (%{x})<extra></extra>",
      },
      {
        type: "scatter", mode: "lines+markers+text", name: "Net Profit",
        x: years, y: netProfit,
        line: { color: COLORS.netProfit, width: 2.5 },
        marker: { size: 9, color: COLORS.netProfit },
        text: netProfit.map((v) => (v == null ? "" : Number(v).toLocaleString("en-US"))),
        textposition: "top center",
        textfont: { size: 11, color: COLORS.netProfit },
        cliponaxis: false,
        yaxis: "y2",
        hovertemplate: "Net Profit: %{y:,.0f} IDR bn (%{x})<extra></extra>",
      },
    ],
    {
      ...SHARED_LAYOUT,
      title: { text: "Revenue & Profit", font: { size: 14 }, x: 0.02, xanchor: "left" },
      barmode: "group",
      xaxis: X_AXIS,
      yaxis: { ...Y_AXIS_BASE, title: { text: "Revenue / Gross Profit (IDR bn)" } },
      yaxis2: {
        ...Y_AXIS_BASE,
        title: { text: "Net Profit (IDR bn)" },
        overlaying: "y",
        side: "right",
        showgrid: false, // avoid double-grid on right axis
      },
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
        hovertemplate: "Total Assets: %{y:,.0f} IDR bn (%{x})<extra></extra>",
      },
      {
        type: "bar", name: "Total Liabilities",
        x: years, y: rows.map((r) => r.total_liabilities_idr_bn),
        marker: { color: COLORS.liabilities },
        hovertemplate: "Total Liabilities: %{y:,.0f} IDR bn (%{x})<extra></extra>",
      },
      {
        type: "bar", name: "Total Equity",
        x: years, y: rows.map((r) => r.total_equity_idr_bn),
        marker: { color: COLORS.equity },
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
