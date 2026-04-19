import sys
from io import BytesIO
from pathlib import Path

import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import streamlit as st

sys.path.insert(0, str(Path(__file__).resolve().parent))
from utils.db import get_conn

st.set_page_config(page_title="Indonesia Palm Dashboard", layout="wide")


def conn():
    return get_conn()


# ============================================================================
# Cached data accessors
# ============================================================================

@st.cache_data
def list_companies() -> list[str]:
    return (
        conn()
        .execute("SELECT company FROM dim_company ORDER BY company")
        .df()["company"]
        .tolist()
    )


@st.cache_data
def get_company(name: str):
    return conn().execute("SELECT * FROM dim_company WHERE company = ?", [name]).df().iloc[0]


@st.cache_data
def years_for_company(name: str) -> list[int]:
    return (
        conn()
        .execute(
            "SELECT DISTINCT report_year FROM fact_financials "
            "WHERE company = ? ORDER BY report_year",
            [name],
        )
        .df()["report_year"]
        .tolist()
    )


@st.cache_data
def fin_for(name: str) -> pd.DataFrame:
    return conn().execute(
        "SELECT * FROM fact_financials WHERE company = ? ORDER BY report_year",
        [name],
    ).df()


@st.cache_data
def all_years() -> list[int]:
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
        SELECT p.company, p.area_ha AS region_area_ha,
               o.planted_area_total_ha, o.mature_area_ha,
               o.mills_count, o.cpo_refinery_count,
               o.ffb_production_t, o.cpo_production_t
        FROM fact_plantation_region p
        LEFT JOIN fact_operations o
          ON o.company = p.company AND o.report_year = p.report_year
        WHERE p.report_year = ? AND p.region = ? AND p.area_ha > 0
        ORDER BY p.area_ha DESC NULLS LAST
        """,
        [year, region],
    ).df()


@st.cache_data
def operations(year: int) -> pd.DataFrame:
    return conn().execute(
        "SELECT * FROM fact_operations WHERE report_year = ?", [year]
    ).df()


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


# ============================================================================
# Sidebar — global selectors
# ============================================================================

st.sidebar.title("🌴 Filters")
companies = list_companies()
sel_company = st.sidebar.selectbox(
    "Company", companies, help="Used by Overview & Financials tabs"
)
years = all_years()
sel_year = st.sidebar.selectbox(
    "Year", years, help="Used by Plantation Map & Asset Detail tabs"
)


# ============================================================================
# Header
# ============================================================================

st.title("🌴 Indonesia Palm Listed Co. Dashboard")
st.caption("Source: palm_longlist (Claude generated + NotebookLM verified)")

tab_overview, tab_fin, tab_map, tab_asset = st.tabs(
    ["Overview", "Financials", "Plantation Map", "Asset Detail"]
)


# ============================================================================
# Tab 1 — Overview
# ============================================================================

with tab_overview:
    row = get_company(sel_company)
    c1, c2, c3, c4 = st.columns(4)
    c1.metric("Ticker", row.get("ticker") or "-")
    c2.metric("Exchange", row.get("exchange") or "-")
    c3.metric("HQ", row.get("hq") or "-")
    c4.metric("Listed Status", row.get("listed_status") or "-")

    st.markdown("### Business")
    st.write(f"**Primary Business:** {row.get('primary_business') or '-'}")
    st.write(f"**Business Model:** {row.get('business_model') or '-'}")
    st.write(f"**Core Region:** {row.get('core_region') or '-'}")
    st.write(
        f"**Years Available:** "
        f"{', '.join(str(y) for y in years_for_company(sel_company)) or '-'}"
    )

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


# ============================================================================
# Tab 2 — Financials
# ============================================================================

with tab_fin:
    fin = fin_for(sel_company)
    if fin.empty:
        st.warning("No financial data for this company.")
    else:
        st.subheader(f"{sel_company} — Yearly Financials (IDR bn)")
        display_cols = [
            "report_year", "revenue_idr_bn", "gross_profit_idr_bn",
            "ebit_idr_bn", "net_profit_idr_bn", "total_assets_idr_bn",
            "total_liabilities_idr_bn", "total_equity_idr_bn",
            "gross_debt_idr_bn", "cash_and_cash_equivalents_idr_bn",
            "cfo_idr_bn", "fcf_idr_bn", "current_ratio_x",
            "debt_per_equity_x", "roa_reported_pct", "roe_reported_pct",
            "net_margin_reported_pct", "gross_margin_reported_pct",
        ]
        have = [c for c in display_cols if c in fin.columns]
        table = fin[have].set_index("report_year").T
        st.dataframe(
            table.style.format("{:,.2f}", na_rep="-"), use_container_width=True
        )

        c1, c2 = st.columns(2)
        with c1:
            st.subheader("Revenue & Net Profit")
            fig = go.Figure()
            if "revenue_idr_bn" in fin:
                fig.add_bar(x=fin["report_year"], y=fin["revenue_idr_bn"], name="Revenue")
            if "gross_profit_idr_bn" in fin:
                fig.add_bar(
                    x=fin["report_year"], y=fin["gross_profit_idr_bn"], name="Gross Profit"
                )
            if "net_profit_idr_bn" in fin:
                fig.add_scatter(
                    x=fin["report_year"], y=fin["net_profit_idr_bn"],
                    name="Net Profit", mode="lines+markers", yaxis="y2",
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
                fig.add_bar(
                    x=fin["report_year"], y=fin["total_assets_idr_bn"], name="Total Assets"
                )
            if "total_liabilities_idr_bn" in fin:
                fig.add_bar(
                    x=fin["report_year"], y=fin["total_liabilities_idr_bn"],
                    name="Total Liabilities",
                )
            if "total_equity_idr_bn" in fin:
                fig.add_bar(
                    x=fin["report_year"], y=fin["total_equity_idr_bn"], name="Total Equity"
                )
            fig.update_layout(
                barmode="group", height=420, legend=dict(orientation="h")
            )
            st.plotly_chart(fig, use_container_width=True)

        c3, c4 = st.columns(2)
        with c3:
            st.subheader("Debt Profile")
            fig = go.Figure()
            if "gross_debt_idr_bn" in fin:
                fig.add_bar(
                    x=fin["report_year"], y=fin["gross_debt_idr_bn"], name="Gross Debt"
                )
            if "cash_and_cash_equivalents_idr_bn" in fin:
                fig.add_bar(
                    x=fin["report_year"],
                    y=fin["cash_and_cash_equivalents_idr_bn"],
                    name="Cash",
                )
            if "net_debt_calculated_idr_bn" in fin:
                fig.add_scatter(
                    x=fin["report_year"], y=fin["net_debt_calculated_idr_bn"],
                    name="Net Debt", mode="lines+markers",
                )
            fig.update_layout(
                barmode="group", height=380, legend=dict(orientation="h")
            )
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
            fig.update_layout(
                height=380, yaxis_title="%", legend=dict(orientation="h")
            )
            st.plotly_chart(fig, use_container_width=True)


# ============================================================================
# Tab 3 — Plantation Map
# ============================================================================

with tab_map:
    agg = regional_agg(sel_year)
    agg_plot = agg.dropna(subset=["area_ha"]).copy()
    agg_plot = agg_plot[agg_plot["area_ha"] > 0]

    st.subheader(f"Regional Plantation Distribution — {sel_year}")

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
        "Region",
        agg_plot["region"].tolist() if not agg_plot.empty else [],
        key="map_region_pick",
    )
    if region_pick:
        detail = companies_in_region(sel_year, region_pick)
        st.dataframe(detail, use_container_width=True, hide_index=True)


# ============================================================================
# Tab 4 — Asset Detail
# ============================================================================

with tab_asset:
    ASSET_TYPES = ["Mill", "Kernel Crushing", "CPO Refinery", "PKO Refinery", "NPK Plant"]
    regions = list_regions()

    f1, f2, f3 = st.columns([2, 2, 1])
    with f1:
        region_sel = st.multiselect(
            "Region (any)", regions, default=regions, key="ad_region"
        )
    with f2:
        asset_sel = st.multiselect(
            "Asset Type (must have)", ASSET_TYPES, default=[], key="ad_asset"
        )
    with f3:
        min_area = st.number_input(
            "Min Planted Area (ha)", value=0, step=1000, key="ad_minarea"
        )

    ops = operations(sel_year)

    if region_sel and len(region_sel) < len(regions):
        in_region = companies_in_regions(sel_year, tuple(region_sel))
        ops = ops[ops["company"].isin(in_region)]

    if asset_sel:
        has_assets = companies_with_assets(sel_year, tuple(asset_sel))
        ops = ops[ops["company"].isin(has_assets)]

    if "planted_area_total_ha" in ops.columns and min_area > 0:
        ops = ops[ops["planted_area_total_ha"].fillna(0) >= min_area]

    display_cols = [
        "company", "planted_area_total_ha", "nucleus_area_ha", "plasma_area_ha",
        "mature_area_ha", "immature_area_ha", "average_tree_age_years",
        "mills_count", "mill_capacity_tph",
        "kernel_crushing_count", "kernel_crushing_capacity_tph",
        "cpo_refinery_count", "cpo_refinery_capacity_tpa",
        "pko_refinery_count", "pko_refinery_capacity_tpa",
        "npk_plant_count", "ffb_production_t", "cpo_production_t",
        "kernel_production_t", "ffb_yield_t_per_ha", "oer_pct",
    ]
    have = [c for c in display_cols if c in ops.columns]
    view = ops[have].sort_values(
        "planted_area_total_ha", ascending=False, na_position="last"
    ).reset_index(drop=True)

    st.caption(f"Year **{sel_year}** · {len(view)} companies")
    st.dataframe(view, use_container_width=True, height=520, hide_index=True)

    st.markdown("### Download")
    d1, d2 = st.columns(2)
    with d1:
        csv = view.to_csv(index=False).encode("utf-8-sig")
        st.download_button(
            "⬇️ CSV", csv,
            file_name=f"asset_detail_{sel_year}.csv", mime="text/csv",
        )
    with d2:
        buf = BytesIO()
        with pd.ExcelWriter(buf, engine="openpyxl") as w:
            view.to_excel(w, index=False, sheet_name="assets")
        st.download_button(
            "⬇️ Excel", buf.getvalue(),
            file_name=f"asset_detail_{sel_year}.xlsx",
            mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
