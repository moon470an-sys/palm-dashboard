import sys
from pathlib import Path

import streamlit as st

sys.path.insert(0, str(Path(__file__).resolve().parent))
from utils.db import get_conn

st.set_page_config(page_title="Overview · Indonesia Palm", layout="wide")


def conn():
    return get_conn()


@st.cache_data
def list_companies():
    return conn().execute("SELECT company, ticker FROM dim_company ORDER BY company").df()


@st.cache_data
def get_company(name: str):
    return conn().execute("SELECT * FROM dim_company WHERE company = ?", [name]).df().iloc[0]


@st.cache_data
def years_for(name: str):
    return (
        conn()
        .execute(
            "SELECT DISTINCT report_year FROM fact_financials WHERE company = ? ORDER BY report_year",
            [name],
        )
        .df()["report_year"]
        .tolist()
    )


st.title("🌴 Indonesia Palm Listed Co. Dashboard")
st.caption("Source: palm_longlist (Claude generated + NotebookLM verified)")

companies = list_companies()
sel = st.sidebar.selectbox("Company", companies["company"])
row = get_company(sel)

c1, c2, c3, c4 = st.columns(4)
c1.metric("Ticker", row.get("ticker") or "-")
c2.metric("Exchange", row.get("exchange") or "-")
c3.metric("HQ", row.get("hq") or "-")
c4.metric("Listed Status", row.get("listed_status") or "-")

st.markdown("### Business")
st.write(f"**Primary Business:** {row.get('primary_business') or '-'}")
st.write(f"**Business Model:** {row.get('business_model') or '-'}")
st.write(f"**Core Region:** {row.get('core_region') or '-'}")
st.write(f"**Years Available:** {', '.join(str(y) for y in years_for(sel)) or '-'}")

st.markdown("### Group / Ownership")
with st.expander("Group Structure", expanded=True):
    st.write(row.get("group_structure_note") or "_(no data)_")
with st.expander("Subsidiaries"):
    st.write(row.get("subsidiaries_note") or "_(no data)_")
with st.expander("Shareholder Structure"):
    st.write(row.get("shareholder_structure_note") or "_(no data)_")

st.markdown("### Deal & Risk Notes")
with st.expander("Deal Structure (initial)"):
    st.write(row.get("deal_structure_initial_thought") or "_(no data)_")
with st.expander("Dealability"):
    st.write(row.get("dealability_note") or "_(no data)_")
with st.expander("Acquisition Note"):
    st.write(row.get("acquisition_note") or "_(no data)_")
with st.expander("Key Red Flags"):
    st.write(row.get("key_red_flags") or "_(no data)_")
with st.expander("Overall Comment"):
    st.write(row.get("overall_comment") or "_(no data)_")
