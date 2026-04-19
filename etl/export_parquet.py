"""DuckDB tables -> parquet files for stlite consumption."""
from pathlib import Path

import duckdb

ROOT = Path(__file__).resolve().parents[1]
DB_PATH = ROOT / "data" / "processed" / "palm.duckdb"
OUT_DIR = ROOT / "data" / "parquet"

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


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    con = duckdb.connect(str(DB_PATH), read_only=True)
    for t in TABLES:
        out = OUT_DIR / f"{t}.parquet"
        con.execute(
            f"COPY (SELECT * FROM {t}) TO '{out.as_posix()}' (FORMAT PARQUET)"
        )
        n = con.execute(f"SELECT COUNT(*) FROM {t}").fetchone()[0]
        size = out.stat().st_size
        print(f"  {t}: {n} rows -> {out.name} ({size:,} bytes)")
    con.close()


if __name__ == "__main__":
    main()
