import sys
from io import BytesIO
from pathlib import Path

import pandas as pd
import streamlit as st

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from utils.db import get_conn

st.set_page_config(page_title="Asset Detail · Indonesia Palm", layout="wide")

ASSET_TYPES = ["Mill", "Kernel Crushing", "CPO Refinery", "PKO Refinery", "NPK Plant"]


def conn():
    return get_conn()


@st.cache_data
def list_years() -> list[int]:
    return (
        conn()
        .execute(
            "SELECT DISTINCT report_year FROM fact_operations "
            "WHERE report_year IS NOT NULL ORDER BY report_year DESC"
        )
        .df()["report_year"]
        .tolist()
    )


@st.cache_data
def list_regions() -> list[str]:
    return (
        conn()
        .execute(
            "SELECT DISTINCT region FROM fact_plantation_region "
            "WHERE area_ha > 0 ORDER BY region"
        )
        .df()["region"]
        .tolist()
    )


@st.cache_data
def operations(year: int) -> pd.DataFrame:
    return conn().execute(
        "SELECT * FROM fact_operations WHERE report_year = ?", [year]
    ).df()


@st.cache_data
def companies_in_regions(year: int, regions: tuple[str, ...]) -> set[str]:
    if not regions:
        return set()
    placeholders = ",".join(["?"] * len(regions))
    rows = conn().execute(
        f"""SELECT DISTINCT company FROM fact_plantation_region
           WHERE report_year = ? AND area_ha > 0 AND region IN ({placeholders})""",
        [year, *regions],
    ).df()
    return set(rows["company"].tolist())


@st.cache_data
def companies_with_assets(year: int, asset_types: tuple[str, ...]) -> set[str]:
    if not asset_types:
        return set()
    placeholders = ",".join(["?"] * len(asset_types))
    rows = conn().execute(
        f"""SELECT DISTINCT company FROM fact_assets
           WHERE report_year = ? AND asset_count > 0 AND asset_type IN ({placeholders})""",
        [year, *asset_types],
    ).df()
    return set(rows["company"].tolist())


st.title("🏭 Asset Detail")

years = list_years()
year_sel = st.sidebar.selectbox("Year", years)
regions = list_regions()
region_sel = st.sidebar.multiselect("Region (any)", regions, default=regions)
asset_sel = st.sidebar.multiselect("Asset Type (must have)", ASSET_TYPES, default=[])
min_area = st.sidebar.number_input("Min Planted Area (ha)", value=0, step=1000)

ops = operations(year_sel)

if region_sel and len(region_sel) < len(regions):
    in_region = companies_in_regions(year_sel, tuple(region_sel))
    ops = ops[ops["company"].isin(in_region)]

if asset_sel:
    has_assets = companies_with_assets(year_sel, tuple(asset_sel))
    ops = ops[ops["company"].isin(has_assets)]

if "planted_area_total_ha" in ops.columns and min_area > 0:
    ops = ops[ops["planted_area_total_ha"].fillna(0) >= min_area]

display_cols = [
    "company",
    "planted_area_total_ha",
    "nucleus_area_ha",
    "plasma_area_ha",
    "mature_area_ha",
    "immature_area_ha",
    "average_tree_age_years",
    "mills_count",
    "mill_capacity_tph",
    "kernel_crushing_count",
    "kernel_crushing_capacity_tph",
    "cpo_refinery_count",
    "cpo_refinery_capacity_tpa",
    "pko_refinery_count",
    "pko_refinery_capacity_tpa",
    "npk_plant_count",
    "ffb_production_t",
    "cpo_production_t",
    "kernel_production_t",
    "ffb_yield_t_per_ha",
    "oer_pct",
]
have = [c for c in display_cols if c in ops.columns]
view = ops[have].sort_values(
    "planted_area_total_ha", ascending=False, na_position="last"
).reset_index(drop=True)

st.caption(f"Year **{year_sel}** · {len(view)} companies")
st.dataframe(view, use_container_width=True, height=520, hide_index=True)

st.markdown("### Download")
csv = view.to_csv(index=False).encode("utf-8-sig")
st.download_button(
    "⬇️ CSV", csv, file_name=f"asset_detail_{year_sel}.csv", mime="text/csv"
)

buf = BytesIO()
with pd.ExcelWriter(buf, engine="openpyxl") as w:
    view.to_excel(w, index=False, sheet_name="assets")
st.download_button(
    "⬇️ Excel",
    buf.getvalue(),
    file_name=f"asset_detail_{year_sel}.xlsx",
    mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
)
