"""Shared in-memory DuckDB connection backed by parquet files.

Works identically in local Streamlit and in stlite (Pyodide), as long as
parquet files exist at <project_root>/data/parquet/*.parquet on the FS.
"""
from pathlib import Path

import duckdb
import streamlit as st

ROOT = Path(__file__).resolve().parents[2]
PARQUET_DIR = ROOT / "data" / "parquet"

TABLES = [
    "company_master_raw",
    "dim_company",
    "fact_financials",
    "fact_operations",
    "fact_plantation_region",
    "fact_assets",
    "dim_screening",
    "dim_region_geo",
    "audit_validation_summary",
    "audit_review_required",
    "audit_nlm_backfill_log",
]


@st.cache_resource
def get_conn() -> duckdb.DuckDBPyConnection:
    con = duckdb.connect(":memory:")
    for t in TABLES:
        path = PARQUET_DIR / f"{t}.parquet"
        if path.exists():
            con.execute(
                f"CREATE OR REPLACE TABLE {t} AS SELECT * FROM read_parquet(?)",
                [path.as_posix()],
            )
    return con
