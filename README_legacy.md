# Indonesia Palm Listed Co. Dashboard

Single-page web dashboard for Indonesian palm-oil listed companies — Overview / Financials / Plantation Map / Asset Detail.

**Live**: https://moon470an-sys.github.io/palm-dashboard/

## Stack

- **Frontend**: Vanilla JS (ES Modules), Plotly.js, Leaflet.js, CSS Grid — pure static, no build step
- **Data**: 34 companies × 1–4 years (2020, 2022–2025), sourced from `palm_longlist_*.xlsx` (Claude-extracted + NotebookLM verified)
- **ETL**: Python (DuckDB) — Excel → JSON
- **Hosting**: GitHub Pages (static), auto-deploy via GitHub Actions

## Layout

```
.
├─ index.html                        # entry, sticky nav + 4 sections
├─ assets/
│  ├─ styles.css
│  ├─ app.js                         # main entry — load + render
│  ├─ data.js                        # JSON loaders, shared state, sample fallback
│  ├─ format.js                      # number/text formatters (N/A handling)
│  ├─ nav.js                         # anchor nav + scroll-spy
│  └─ sections/
│     ├─ overview.js                 # company identity cards + group note
│     ├─ financials.js               # revenue/profit & assets/liab charts
│     ├─ map.js                      # Leaflet Indonesia + region popup
│     └─ assets.js                   # ops table + Mill/Refinery pivot
├─ data/
│  ├─ processed/palm.duckdb          # local only (gitignored)
│  └─ json/                          # browser-loadable
│     ├─ companies.json
│     ├─ financials.json
│     ├─ operations.json
│     ├─ regions.json
│     ├─ assets.json
│     └─ region_geo.json
├─ etl/
│  ├─ build_db.py                    # Excel -> DuckDB
│  ├─ export_json.py                 # DuckDB -> JSON for browser
│  └─ region_geo.csv                 # 4 island centroids
├─ .github/workflows/deploy.yml
├─ palm_longlist_*.xlsx              # raw source
└─ requirements.txt                  # ETL deps only
```

## Data Mapping

| JSON | Source sheet | Use |
|------|--------------|-----|
| `companies.json` | Company_Master (latest year per company) | Overview cards, Group Structure |
| `financials.json` | Financials | Revenue/Profit + Assets/Liabilities charts |
| `operations.json` | Asset_Operations | Asset Detail ops table |
| `regions.json` | Asset_Operations (unpivoted by region) | Map + Region summary |
| `assets.json` | Asset_Operations (unpivoted by asset type) | Mill/Refinery pivot |
| `region_geo.json` | `etl/region_geo.csv` | Map marker coordinates |

## Local Dev

```bash
pip install -r requirements.txt
python etl/build_db.py        # Excel -> DuckDB
python etl/export_json.py     # DuckDB -> JSON

# Serve static files
python -m http.server 8000
# open http://localhost:8000
```

## Update Data

1. Replace `palm_longlist_*.xlsx`
2. Re-run `build_db.py` and `export_json.py`
3. Commit `data/json/*.json` and push — GitHub Actions auto-deploys
