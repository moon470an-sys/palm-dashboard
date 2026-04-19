"""DuckDB tables -> JSON for vanilla-JS frontend."""
import json
import math
from pathlib import Path

import duckdb

ROOT = Path(__file__).resolve().parents[1]
DB_PATH = ROOT / "data" / "processed" / "palm.duckdb"
OUT_DIR = ROOT / "data" / "json"

EXPORTS = {
    "companies": "SELECT * FROM dim_company",
    "financials": "SELECT * FROM fact_financials",
    "operations": "SELECT * FROM fact_operations",
    "regions": "SELECT * FROM fact_plantation_region",
    "assets": "SELECT * FROM fact_assets",
    "region_geo": "SELECT * FROM dim_region_geo",
}


def clean(value):
    if value is None:
        return None
    if isinstance(value, float) and math.isnan(value):
        return None
    return value


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    con = duckdb.connect(str(DB_PATH), read_only=True)
    for name, sql in EXPORTS.items():
        df = con.execute(sql).df()
        records = [
            {k: clean(v) for k, v in row.items()}
            for row in df.to_dict(orient="records")
        ]
        path = OUT_DIR / f"{name}.json"
        with path.open("w", encoding="utf-8") as f:
            json.dump(records, f, ensure_ascii=False, separators=(",", ":"))
        print(f"  {name}: {len(records)} rows -> {path.name} ({path.stat().st_size:,} bytes)")
    con.close()


if __name__ == "__main__":
    main()
