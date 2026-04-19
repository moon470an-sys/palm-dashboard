"""Excel -> DuckDB ETL for Indonesia Palm dashboard."""
from __future__ import annotations

import re
from pathlib import Path

import duckdb
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
RAW_XLSX = next(ROOT.glob("palm_longlist_*.xlsx"))
DB_PATH = ROOT / "data" / "processed" / "palm.duckdb"
GEO_CSV = ROOT / "etl" / "region_geo.csv"

UNIT_REPLACEMENTS = [
    ("(IDR bn)", "_idr_bn"),
    ("(local ccy/share)", "_local_per_share"),
    ("(local ccy/kg)", "_local_per_kg"),
    ("(t/ha)", "_t_per_ha"),
    ("(tph)", "_tph"),
    ("(tpa)", "_tpa"),
    ("(ha)", "_ha"),
    ("(t)", "_t"),
    ("(%)", "_pct"),
    ("(#)", ""),
    ("(years)", "_years"),
    ("(mn)", "_mn"),
    ("(x)", "_x"),
]


def snake(name: str) -> str:
    s = str(name).strip()
    for src, dst in UNIT_REPLACEMENTS:
        s = s.replace(src, dst)
    s = re.sub(r"\[.*?\]", "", s)
    s = re.sub(r"\(.*?\)", "", s)
    s = s.replace("&", "_and_")
    s = s.replace("/", "_per_")
    s = re.sub(r"[^\w\s]", "_", s)
    s = re.sub(r"\s+", "_", s)
    s = re.sub(r"_+", "_", s)
    return s.strip("_").lower()


def load_sheet(name: str) -> pd.DataFrame:
    df = pd.read_excel(RAW_XLSX, sheet_name=name)
    df = df.dropna(how="all")
    df.columns = [snake(c) for c in df.columns]
    return df


def to_num(s: pd.Series) -> pd.Series:
    return pd.to_numeric(s, errors="coerce")


def main() -> None:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)

    company_master = load_sheet("Company_Master")
    asset_ops = load_sheet("Asset_Operations")
    financials = load_sheet("Financials")
    screening = load_sheet("Screening")
    validation_summary = load_sheet("Validation_Summary")
    review_required = load_sheet("Review_Required")
    nlm_backfill_log = load_sheet("NLM_Backfill_Log")

    if "latest_report_year" in screening.columns:
        screening = screening.rename(columns={"latest_report_year": "report_year"})

    company_master = company_master.dropna(subset=["company"]).copy()
    company_master["report_year"] = to_num(company_master["report_year"]).astype("Int64")

    dim_company = (
        company_master.sort_values("report_year")
        .groupby("company", as_index=False)
        .tail(1)
        .reset_index(drop=True)
    )

    fact_financials = financials.dropna(subset=["company", "report_year"]).copy()
    fact_financials["report_year"] = to_num(fact_financials["report_year"]).astype("Int64")
    for c in fact_financials.columns:
        if c not in ("company",) and fact_financials[c].dtype == object:
            converted = pd.to_numeric(fact_financials[c], errors="coerce")
            if converted.notna().sum() > 0:
                fact_financials[c] = converted

    fact_operations = asset_ops.dropna(subset=["company", "report_year"]).copy()
    fact_operations["report_year"] = to_num(fact_operations["report_year"]).astype("Int64")
    for c in fact_operations.columns:
        if c not in ("company",) and fact_operations[c].dtype == object:
            converted = pd.to_numeric(fact_operations[c], errors="coerce")
            if converted.notna().sum() > 0:
                fact_operations[c] = converted

    dim_screening = screening.dropna(subset=["company"]).copy()
    if "report_year" in dim_screening.columns:
        dim_screening["report_year"] = to_num(dim_screening["report_year"]).astype("Int64")

    region_map = {
        "sumatra_area_ha": "Sumatra",
        "kalimantan_area_ha": "Kalimantan",
        "sulawesi_area_ha": "Sulawesi",
        "other_region_area_ha": "Other",
    }
    region_cols = [c for c in region_map if c in fact_operations.columns]
    fact_plantation_region = fact_operations[["company", "report_year", *region_cols]].melt(
        id_vars=["company", "report_year"],
        var_name="region_col",
        value_name="area_ha",
    )
    fact_plantation_region["region"] = fact_plantation_region["region_col"].map(region_map)
    fact_plantation_region = fact_plantation_region.drop(columns="region_col")
    fact_plantation_region["area_ha"] = to_num(fact_plantation_region["area_ha"])
    fact_plantation_region = fact_plantation_region[
        ["company", "report_year", "region", "area_ha"]
    ]

    # Add "Other Indonesia" = planted_area_total - sum(4 regions) when positive.
    # Catches plantations whose region wasn't broken out in the source filings.
    if "planted_area_total_ha" in fact_operations.columns:
        diff = fact_operations[["company", "report_year", "planted_area_total_ha", *region_cols]].copy()
        for c in [*region_cols, "planted_area_total_ha"]:
            diff[c] = pd.to_numeric(diff[c], errors="coerce").fillna(0)
        diff["area_ha"] = diff["planted_area_total_ha"] - diff[region_cols].sum(axis=1)
        diff = diff[diff["area_ha"] > 0.5][["company", "report_year", "area_ha"]].copy()
        diff["region"] = "Other Indonesia"
        diff = diff[["company", "report_year", "region", "area_ha"]]
        fact_plantation_region = pd.concat(
            [fact_plantation_region, diff], ignore_index=True
        )

    asset_specs = [
        ("Mill", "mills_count", "mill_capacity_tph", "tph"),
        ("Kernel Crushing", "kernel_crushing_count", "kernel_crushing_capacity_tph", "tph"),
        ("CPO Refinery", "cpo_refinery_count", "cpo_refinery_capacity_tpa", "tpa"),
        ("PKO Refinery", "pko_refinery_count", "pko_refinery_capacity_tpa", "tpa"),
        ("NPK Plant", "npk_plant_count", None, None),
    ]
    rows: list[dict] = []
    for _, r in fact_operations.iterrows():
        for label, c_count, c_cap, unit in asset_specs:
            rows.append(
                {
                    "company": r["company"],
                    "report_year": r["report_year"],
                    "asset_type": label,
                    "asset_count": pd.to_numeric(r.get(c_count), errors="coerce"),
                    "capacity": pd.to_numeric(r.get(c_cap), errors="coerce") if c_cap else None,
                    "capacity_unit": unit,
                }
            )
    fact_assets = pd.DataFrame(rows)

    geo = pd.read_csv(GEO_CSV)

    con = duckdb.connect(str(DB_PATH))
    tables = {
        "company_master_raw": company_master,
        "dim_company": dim_company,
        "fact_financials": fact_financials,
        "fact_operations": fact_operations,
        "fact_plantation_region": fact_plantation_region,
        "fact_assets": fact_assets,
        "dim_screening": dim_screening,
        "dim_region_geo": geo,
        "audit_validation_summary": validation_summary,
        "audit_review_required": review_required,
        "audit_nlm_backfill_log": nlm_backfill_log,
    }
    for name, df in tables.items():
        con.register("df_in", df)
        con.execute(f"CREATE OR REPLACE TABLE {name} AS SELECT * FROM df_in")
        con.unregister("df_in")
        print(f"  wrote {name}: {len(df)} rows, {len(df.columns)} cols")
    con.close()
    print(f"DuckDB written: {DB_PATH}")


if __name__ == "__main__":
    main()
