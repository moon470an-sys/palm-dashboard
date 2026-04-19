// Financials section: Revenue/Profit chart + Assets/Liabilities chart.
import { state } from "../data.js";

const COLORS = {
  revenue: "#2e7d32",
  grossProfit: "#66bb6a",
  netProfit: "#1565c0",
  assets: "#1565c0",
  liabilities: "#ef6c00",
  equity: "#6d4c41",
};

const CHART_LAYOUT = {
  paper_bgcolor: "transparent",
  plot_bgcolor: "transparent",
  margin: { t: 50, r: 50, b: 40, l: 60 },
  height: 380,
  legend: { orientation: "h", y: -0.18 },
  font: { family: "system-ui, sans-serif" },
};

export function renderFinancials() {
  const rows = state.financials
    .filter((r) => r.company === state.selectedCompany)
    .sort((a, b) => (a.report_year || 0) - (b.report_year || 0));

  const years = rows.map((r) => String(r.report_year));

  // ---- Revenue & Profit ----
  Plotly.newPlot(
    "chart-revenue-profit",
    [
      {
        type: "bar", name: "Revenue",
        x: years, y: rows.map((r) => r.revenue_idr_bn),
        marker: { color: COLORS.revenue },
      },
      {
        type: "bar", name: "Gross Profit",
        x: years, y: rows.map((r) => r.gross_profit_idr_bn),
        marker: { color: COLORS.grossProfit },
      },
      {
        type: "scatter", mode: "lines+markers", name: "Net Profit",
        x: years, y: rows.map((r) => r.net_profit_idr_bn),
        line: { color: COLORS.netProfit, width: 3 },
        marker: { size: 8 },
        yaxis: "y2",
      },
    ],
    {
      ...CHART_LAYOUT,
      title: { text: "Revenue & Profit (IDR bn)", font: { size: 14 } },
      barmode: "group",
      yaxis: { title: "Revenue / Gross Profit" },
      yaxis2: { title: "Net Profit", overlaying: "y", side: "right" },
    },
    { responsive: true, displayModeBar: false }
  );

  // ---- Assets / Liabilities / Equity ----
  Plotly.newPlot(
    "chart-assets-liab",
    [
      {
        type: "bar", name: "Total Assets",
        x: years, y: rows.map((r) => r.total_assets_idr_bn),
        marker: { color: COLORS.assets },
      },
      {
        type: "bar", name: "Total Liabilities",
        x: years, y: rows.map((r) => r.total_liabilities_idr_bn),
        marker: { color: COLORS.liabilities },
      },
      {
        type: "bar", name: "Total Equity",
        x: years, y: rows.map((r) => r.total_equity_idr_bn),
        marker: { color: COLORS.equity },
      },
    ],
    {
      ...CHART_LAYOUT,
      title: { text: "Assets / Liabilities / Equity (IDR bn)", font: { size: 14 } },
      barmode: "group",
      yaxis: { title: "IDR bn" },
    },
    { responsive: true, displayModeBar: false }
  );
}
