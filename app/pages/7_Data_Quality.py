import sys
from pathlib import Path

import streamlit as st

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from utils.db import get_conn

st.set_page_config(page_title="Data Quality · Indonesia Palm", layout="wide")


def conn():
    return get_conn()


@st.cache_data
def table(name: str):
    return conn().execute(f"SELECT * FROM {name}").df()


st.title("🔎 Data Quality & Validation Audit")
st.caption("Source: Validation_Summary, Review_Required, NLM_Backfill_Log sheets.")

tab1, tab2, tab3 = st.tabs(["Validation Summary", "Review Required", "NLM Backfill Log"])

with tab1:
    df = table("audit_validation_summary")
    st.write(f"{len(df)} rows")
    st.dataframe(df, use_container_width=True, hide_index=True, height=520)

with tab2:
    df = table("audit_review_required")
    st.write(f"{len(df)} rows")
    companies = sorted(df["company"].dropna().unique()) if "company" in df.columns else []
    sel = st.multiselect("Filter by company", companies)
    view = df[df["company"].isin(sel)] if sel else df
    st.dataframe(view, use_container_width=True, hide_index=True, height=520)

with tab3:
    df = table("audit_nlm_backfill_log")
    st.write(f"{len(df)} rows")
    companies = sorted(df["company"].dropna().unique()) if "company" in df.columns else []
    sel = st.multiselect("Filter by company", companies, key="nlm_co")
    view = df[df["company"].isin(sel)] if sel else df
    st.dataframe(view, use_container_width=True, hide_index=True, height=520)
