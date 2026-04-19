import sys
from pathlib import Path

import plotly.express as px
import streamlit as st

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from utils.db import get_conn

st.set_page_config(page_title="Compare · Indonesia Palm", layout="wide")

METRICS = {
    "Revenue (IDR bn)": ("fact_financials", "revenue_idr_bn"),
    "Net Profit (IDR bn)": ("fact_financials", "net_profit_idr_bn"),
    "EBITDA Calc (IDR bn)": ("fact_financials", "ebitda_calculated_idr_bn"),
    "Total Assets (IDR bn)": ("fact_financials", "total_assets_idr_bn"),
    "Gross Debt (IDR bn)": ("fact_financials", "gross_debt_idr_bn"),
    "Net Debt Calc (IDR bn)": ("fact_financials", "net_debt_calculated_idr_bn"),
    "ROE (%)": ("fact_financials", "roe_reported_pct"),
    "Net Margin (%)": ("fact_financials", "net_margin_reported_pct"),
    "Planted Area (ha)": ("fact_operations", "planted_area_total_ha"),
    "Mature Area (ha)": ("fact_operations", "mature_area_ha"),
    "FFB Production (t)": ("fact_operations", "ffb_production_t"),
    "CPO Production (t)": ("fact_operations", "cpo_production_t"),
    "FFB Yield (t/ha)": ("fact_operations", "ffb_yield_t_per_ha"),
    "OER (%)": ("fact_operations", "oer_pct"),
    "Mills Count": ("fact_operations", "mills_count"),
}


def conn():
    return get_conn()


@st.cache_data
def all_companies():
    return (
        conn()
        .execute("SELECT company FROM dim_company ORDER BY company")
        .df()["company"]
        .tolist()
    )


@st.cache_data
def metric_series(table: str, col: str, companies: tuple[str, ...]):
    if not companies:
        import pandas as pd

        return pd.DataFrame()
    placeholders = ",".join(["?"] * len(companies))
    return conn().execute(
        f"""SELECT company, report_year, {col} AS value
            FROM {table}
            WHERE company IN ({placeholders}) AND {col} IS NOT NULL
            ORDER BY company, report_year""",
        list(companies),
    ).df()


st.title("⚖️ Company Comparison")

companies = all_companies()
sel = st.sidebar.multiselect(
    "Companies (2–5 recommended)", companies, default=companies[:3]
)
metric_labels = st.sidebar.multiselect(
    "Metrics", list(METRICS.keys()),
    default=["Revenue (IDR bn)", "Net Profit (IDR bn)", "Planted Area (ha)", "FFB Yield (t/ha)"],
)

if not sel:
    st.info("Pick at least one company in the sidebar.")
    st.stop()
if not metric_labels:
    st.info("Pick at least one metric.")
    st.stop()

cols = st.columns(2)
for i, label in enumerate(metric_labels):
    table, col = METRICS[label]
    df = metric_series(table, col, tuple(sel))
    with cols[i % 2]:
        st.subheader(label)
        if df.empty:
            st.caption("No data")
            continue
        fig = px.line(df, x="report_year", y="value", color="company", markers=True)
        fig.update_layout(
            xaxis_title="Year",
            yaxis_title=label,
            legend=dict(orientation="h", yanchor="bottom", y=-0.3),
            height=360,
        )
        st.plotly_chart(fig, use_container_width=True)
