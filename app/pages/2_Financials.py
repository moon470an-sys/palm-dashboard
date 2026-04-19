import sys
from pathlib import Path

import plotly.graph_objects as go
import streamlit as st

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from utils.db import get_conn

st.set_page_config(page_title="Financials · Indonesia Palm", layout="wide")


def conn():
    return get_conn()


@st.cache_data
def list_companies():
    return (
        conn()
        .execute("SELECT DISTINCT company FROM fact_financials ORDER BY company")
        .df()["company"]
        .tolist()
    )


@st.cache_data
def fin_for(name: str):
    return (
        conn()
        .execute(
            "SELECT * FROM fact_financials WHERE company = ? ORDER BY report_year",
            [name],
        )
        .df()
    )


st.title("📊 Financials")

sel = st.sidebar.selectbox("Company", list_companies())
fin = fin_for(sel)

if fin.empty:
    st.warning("No financial data for this company.")
    st.stop()

st.subheader(f"{sel} — Yearly Financials (IDR bn)")

display_cols = [
    "report_year",
    "revenue_idr_bn",
    "gross_profit_idr_bn",
    "ebit_idr_bn",
    "net_profit_idr_bn",
    "total_assets_idr_bn",
    "total_liabilities_idr_bn",
    "total_equity_idr_bn",
    "gross_debt_idr_bn",
    "cash_and_cash_equivalents_idr_bn",
    "cfo_idr_bn",
    "fcf_idr_bn",
    "current_ratio_x",
    "debt_per_equity_x",
    "roa_reported_pct",
    "roe_reported_pct",
    "net_margin_reported_pct",
    "gross_margin_reported_pct",
]
have = [c for c in display_cols if c in fin.columns]
table = fin[have].set_index("report_year").T
st.dataframe(table.style.format("{:,.2f}", na_rep="-"), use_container_width=True)

st.markdown("---")
c1, c2 = st.columns(2)

with c1:
    st.subheader("Revenue & Net Profit")
    fig = go.Figure()
    if "revenue_idr_bn" in fin:
        fig.add_bar(x=fin["report_year"], y=fin["revenue_idr_bn"], name="Revenue")
    if "gross_profit_idr_bn" in fin:
        fig.add_bar(x=fin["report_year"], y=fin["gross_profit_idr_bn"], name="Gross Profit")
    if "net_profit_idr_bn" in fin:
        fig.add_scatter(
            x=fin["report_year"],
            y=fin["net_profit_idr_bn"],
            name="Net Profit",
            mode="lines+markers",
            yaxis="y2",
        )
    fig.update_layout(
        barmode="group",
        yaxis=dict(title="Revenue / Gross Profit (IDR bn)"),
        yaxis2=dict(title="Net Profit (IDR bn)", overlaying="y", side="right"),
        legend=dict(orientation="h"),
        height=420,
    )
    st.plotly_chart(fig, use_container_width=True)

with c2:
    st.subheader("Assets vs Liabilities vs Equity")
    fig = go.Figure()
    if "total_assets_idr_bn" in fin:
        fig.add_bar(x=fin["report_year"], y=fin["total_assets_idr_bn"], name="Total Assets")
    if "total_liabilities_idr_bn" in fin:
        fig.add_bar(
            x=fin["report_year"], y=fin["total_liabilities_idr_bn"], name="Total Liabilities"
        )
    if "total_equity_idr_bn" in fin:
        fig.add_bar(x=fin["report_year"], y=fin["total_equity_idr_bn"], name="Total Equity")
    fig.update_layout(barmode="group", height=420, legend=dict(orientation="h"))
    st.plotly_chart(fig, use_container_width=True)

c3, c4 = st.columns(2)
with c3:
    st.subheader("Debt Profile")
    fig = go.Figure()
    if "gross_debt_idr_bn" in fin:
        fig.add_bar(x=fin["report_year"], y=fin["gross_debt_idr_bn"], name="Gross Debt")
    if "cash_and_cash_equivalents_idr_bn" in fin:
        fig.add_bar(
            x=fin["report_year"],
            y=fin["cash_and_cash_equivalents_idr_bn"],
            name="Cash",
        )
    if "net_debt_calculated_idr_bn" in fin:
        fig.add_scatter(
            x=fin["report_year"],
            y=fin["net_debt_calculated_idr_bn"],
            name="Net Debt",
            mode="lines+markers",
        )
    fig.update_layout(barmode="group", height=380, legend=dict(orientation="h"))
    st.plotly_chart(fig, use_container_width=True)

with c4:
    st.subheader("Profitability Ratios (%)")
    fig = go.Figure()
    for col, name in [
        ("gross_margin_reported_pct", "Gross Margin"),
        ("net_margin_reported_pct", "Net Margin"),
        ("roa_reported_pct", "ROA"),
        ("roe_reported_pct", "ROE"),
    ]:
        if col in fin:
            fig.add_scatter(
                x=fin["report_year"], y=fin[col], name=name, mode="lines+markers"
            )
    fig.update_layout(height=380, yaxis_title="%", legend=dict(orientation="h"))
    st.plotly_chart(fig, use_container_width=True)
