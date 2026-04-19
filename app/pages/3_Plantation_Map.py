import sys
from pathlib import Path

import pandas as pd
import plotly.express as px
import streamlit as st

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from utils.db import get_conn

st.set_page_config(page_title="Plantation Map · Indonesia Palm", layout="wide")


def conn():
    return get_conn()


@st.cache_data
def list_years() -> list[int]:
    return (
        conn()
        .execute(
            "SELECT DISTINCT report_year FROM fact_plantation_region "
            "WHERE report_year IS NOT NULL ORDER BY report_year DESC"
        )
        .df()["report_year"]
        .tolist()
    )


@st.cache_data
def regional_agg(year: int) -> pd.DataFrame:
    return conn().execute(
        """
        SELECT g.region, g.lat, g.lon,
               SUM(p.area_ha) AS area_ha,
               COUNT(DISTINCT p.company) FILTER (WHERE p.area_ha > 0) AS companies
        FROM fact_plantation_region p
        JOIN dim_region_geo g USING(region)
        WHERE p.report_year = ?
        GROUP BY 1,2,3
        ORDER BY area_ha DESC NULLS LAST
        """,
        [year],
    ).df()


@st.cache_data
def companies_in_region(year: int, region: str) -> pd.DataFrame:
    return conn().execute(
        """
        SELECT p.company,
               p.area_ha AS region_area_ha,
               o.planted_area_total_ha,
               o.mature_area_ha,
               o.mills_count,
               o.cpo_refinery_count,
               o.ffb_production_t,
               o.cpo_production_t
        FROM fact_plantation_region p
        LEFT JOIN fact_operations o
          ON o.company = p.company AND o.report_year = p.report_year
        WHERE p.report_year = ? AND p.region = ? AND p.area_ha > 0
        ORDER BY p.area_ha DESC NULLS LAST
        """,
        [year, region],
    ).df()


st.title("🗺️ Plantation Map")

years = list_years()
if not years:
    st.warning("No plantation data found.")
    st.stop()

year_sel = st.sidebar.selectbox("Year", years)

agg = regional_agg(year_sel)
agg_plot = agg.dropna(subset=["area_ha"]).copy()
agg_plot = agg_plot[agg_plot["area_ha"] > 0]

st.subheader(f"Regional Plantation Distribution — {year_sel}")

if agg_plot.empty:
    st.info("No regional area data for this year.")
else:
    agg_plot["area_label"] = agg_plot["area_ha"].apply(lambda v: f"{v:,.0f} ha")
    fig = px.scatter_geo(
        agg_plot,
        lat="lat",
        lon="lon",
        size="area_ha",
        size_max=60,
        color="region",
        hover_name="region",
        hover_data={
            "area_label": True,
            "companies": True,
            "lat": False,
            "lon": False,
            "area_ha": False,
        },
        projection="natural earth",
    )
    fig.update_geos(
        center=dict(lat=-2.0, lon=118.0),
        lataxis_range=[-12, 8],
        lonaxis_range=[94, 142],
        showcountries=True,
        countrycolor="#888",
        showland=True,
        landcolor="#f5f5f0",
        showocean=True,
        oceancolor="#dbeefd",
    )
    fig.update_layout(height=520, margin=dict(l=0, r=0, t=0, b=0))
    st.plotly_chart(fig, use_container_width=True)

st.markdown("---")
st.subheader("Regional Summary")
st.dataframe(
    agg[["region", "area_ha", "companies"]].rename(
        columns={"area_ha": "Total Area (ha)", "companies": "# Companies"}
    ),
    use_container_width=True,
    hide_index=True,
)

st.markdown("---")
st.subheader("Companies by Region")
region_pick = st.selectbox(
    "Region", agg_plot["region"].tolist() if not agg_plot.empty else []
)
if region_pick:
    detail = companies_in_region(year_sel, region_pick)
    st.dataframe(detail, use_container_width=True, hide_index=True)
