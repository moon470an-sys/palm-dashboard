# Indonesia Palm Listed Co. Dashboard

Public-listed Indonesian palm-oil companies — operations, financials, screening.

**Live**: https://moon470an-sys.github.io/palm-dashboard/

## Stack

- **Data**: 34 companies × 1–4 years (2020, 2022–2025), sourced from `palm_longlist_*.xlsx` (Claude-extracted + NotebookLM verified)
- **Storage**: DuckDB (local analyst use) + Parquet (browser load)
- **App**: Streamlit, runs locally OR in browser via [stlite](https://github.com/whitphx/stlite) (Pyodide WASM)
- **Hosting**: GitHub Pages (static), auto-deploy via GitHub Actions

## Pages

| # | Page | Source |
|---|------|--------|
| 1 | Overview | `app/Overview.py` |
| 2 | Financials | `app/pages/2_Financials.py` |
| 3 | Plantation Map | `app/pages/3_Plantation_Map.py` |
| 4 | Asset Detail | `app/pages/4_Asset_Detail.py` |
| 5 | Screening | `app/pages/5_Screening.py` |
| 6 | Compare | `app/pages/6_Compare.py` |
| 7 | Data Quality | `app/pages/7_Data_Quality.py` |

## Local Dev

```bash
pip install -r requirements.txt
python etl/build_db.py        # Excel -> DuckDB
python etl/export_parquet.py  # DuckDB -> Parquet
streamlit run app/Overview.py
```

## Update Data

1. Replace `palm_longlist_*.xlsx`
2. Re-run `build_db.py` and `export_parquet.py`
3. Commit `data/parquet/*.parquet` and push — GitHub Actions auto-deploys

## Layout

```
.
├─ index.html                        # stlite entrypoint (GH Pages)
├─ palm_longlist_*.xlsx              # raw source
├─ etl/
│  ├─ build_db.py                    # Excel -> DuckDB
│  ├─ export_parquet.py              # DuckDB -> Parquet
│  └─ region_geo.csv                 # 4 island centroids
├─ app/
│  ├─ Overview.py
│  ├─ utils/db.py                    # in-memory DuckDB + parquet loader
│  └─ pages/2..7_*.py
├─ data/
│  ├─ processed/palm.duckdb          # local only (gitignored)
│  └─ parquet/*.parquet              # browser-loadable
├─ .github/workflows/deploy.yml
└─ requirements.txt
```
