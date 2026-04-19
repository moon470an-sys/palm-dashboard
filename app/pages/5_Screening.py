import sys
from pathlib import Path

import plotly.graph_objects as go
import streamlit as st

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from utils.db import get_conn

st.set_page_config(page_title="Screening · Indonesia Palm", layout="wide")

SCORE_COLS = [
    ("scale_score", "Scale"),
    ("asset_quality_score", "Asset Quality"),
    ("integration_score", "Integration"),
    ("operational_efficiency_score", "Operational Efficiency"),
    ("profitability_score", "Profitability"),
    ("leverage_score", "Leverage"),
    ("liquidity_score", "Liquidity"),
    ("esg_and_legality_score", "ESG & Legality"),
    ("dealability_score", "Dealability"),
]

RISK_COLS = [
    ("hgu_risk", "HGU"),
    ("esg_risk", "ESG"),
    ("community_risk", "Community"),
    ("regulatory_risk", "Regulatory"),
    ("infrastructure_risk", "Infrastructure"),
    ("financial_risk", "Financial"),
]


def conn():
    return get_conn()


@st.cache_data
def screening_latest():
    return conn().execute(
        """
        WITH latest AS (
            SELECT company, MAX(report_year) AS y
            FROM dim_screening WHERE report_year IS NOT NULL
            GROUP BY company
        )
        SELECT s.* FROM dim_screening s
        JOIN latest l ON l.company = s.company AND l.y = s.report_year
        ORDER BY total_score DESC NULLS LAST
        """
    ).df()


@st.cache_data
def screening_for(company: str):
    return conn().execute(
        "SELECT * FROM dim_screening WHERE company = ? ORDER BY report_year DESC",
        [company],
    ).df()


st.title("🎯 Screening & Scoring")
st.caption("Latest available year per company. Source: Screening sheet (NLM verified).")

df = screening_latest()

rank_cols = [
    "company",
    "report_year",
    "core_region",
    "total_score",
    *[c for c, _ in SCORE_COLS],
    "validation_status",
]
have = [c for c in rank_cols if c in df.columns]
st.subheader("Ranking")
st.dataframe(df[have], use_container_width=True, hide_index=True, height=420)

st.markdown("---")
st.subheader("Detail")

sel = st.selectbox("Company", df["company"].tolist())
detail = screening_for(sel)
row = detail.iloc[0]

c1, c2, c3, c4 = st.columns(4)
c1.metric("Total Score", row.get("total_score") or "-")
c2.metric("Year", row.get("report_year") or "-")
c3.metric("Region", row.get("core_region") or "-")
c4.metric("Validation", row.get("validation_status") or "-")

left, right = st.columns([1, 1])

with left:
    st.markdown("#### Score Profile (1–5)")
    fig = go.Figure()
    fig.add_trace(
        go.Scatterpolar(
            r=[row.get(c) for c, _ in SCORE_COLS],
            theta=[lab for _, lab in SCORE_COLS],
            fill="toself",
            name=sel,
        )
    )
    fig.update_layout(
        polar=dict(radialaxis=dict(visible=True, range=[0, 5])),
        showlegend=False,
        height=420,
    )
    st.plotly_chart(fig, use_container_width=True)

with right:
    st.markdown("#### Key Numbers")
    keys = [
        ("revenue_idr_bn", "Revenue (IDR bn)"),
        ("ebitda_idr_bn", "EBITDA (IDR bn)"),
        ("net_profit_idr_bn", "Net Profit (IDR bn)"),
        ("net_debt_idr_bn", "Net Debt (IDR bn)"),
        ("market_cap_idr_bn", "Market Cap (IDR bn)"),
        ("ebitda_margin_pct", "EBITDA Margin (%)"),
        ("net_debt_per_ebitda_x", "Net Debt / EBITDA (x)"),
        ("planted_area_total_ha", "Planted Area (ha)"),
        ("mature_area_ha", "Mature Area (ha)"),
        ("ffb_yield_t_per_ha", "FFB Yield (t/ha)"),
        ("oer_pct", "OER (%)"),
    ]
    for col, label in keys:
        if col in row.index:
            v = row.get(col)
            st.write(f"**{label}:** {v if v == v else '-'}")  # NaN check via v == v

st.markdown("---")
st.markdown("#### Investment Thesis")
for col, label in [
    ("why_now", "Why Now"),
    ("portfolio_synergy", "Portfolio Synergy"),
    ("value_up_100d", "Value-Up 100D"),
    ("value_up_12m", "Value-Up 12M"),
    ("negotiation_points", "Negotiation Points"),
    ("next_step", "Next Step"),
]:
    val = row.get(col)
    if val and str(val) != "nan":
        with st.expander(label, expanded=(col in ("why_now", "next_step"))):
            st.write(val)

st.markdown("#### Risks")
risk_data = [(lab, row.get(col)) for col, lab in RISK_COLS]
risk_data = [(lab, v) for lab, v in risk_data if v and str(v) != "nan"]
if row.get("key_risks") and str(row.get("key_risks")) != "nan":
    with st.expander("Key Risks (summary)", expanded=True):
        st.write(row.get("key_risks"))
for lab, v in risk_data:
    with st.expander(f"{lab} Risk"):
        st.write(v)
