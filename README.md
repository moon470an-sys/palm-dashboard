# 🌴 Indonesia Palm Integrated Dashboard

ISPO + RSPO + BDSP + GAPKI + IDX Annual Report 통합 정적 대시보드.
GitHub Pages 호환 (모든 데이터는 `data/json/` JSON, 서버 불필요).

## 6 탭 구성

| 탭 | 설명 | 데이터 행 |
|---|---|---:|
| 🏠 종합 | KPI · 7계층 매트릭스 · ISPO/RSPO/GAPKI Venn · 1,195 회사 cross | meta + cross |
| 📊 Annual Report | IDX 34개 상장사 IR (회사+연도 필터) · 매출/순이익/OER/식재/지역 | palm_longlist (외부 source) |
| 📜 ISPO | 1,378 인증서 + 1,195 회사 + 41 LS · 상태/유형/주/지도 + 분기 구현률 | ispo_* |
| 🌐 RSPO | Indonesia 2,026 + 글로벌 9,343 · 카테고리/CB/국가/PC면적 비교 | rspo_* |
| 📈 BDSP | KELAPA SAWIT 시계열 5,562 · 국가/주/군 + Heatmap + YoY | bdsp_* |
| 🏪 GAPKI | 714 협회 회원사 + ISPO 매칭 분석 | gapki_members |

## 데이터 갱신

```powershell
# 1. DB 최신화 (각 source 별 ETL)
python scripts\rspo.py --fetch --country ID --category pc,trader,distributor,ish
python scripts\rspo.py --match
python scripts\gapki.py --fetch --match
python scripts\bdsp_playwright.py --mode all-prov --proxy ...
python scripts\bdsp_bulk_import.py
python scripts\idx.py --fetch
python scripts\news.py --fetch

# 2. DB → JSON export (docs/data/json/*.json)
python scripts\export_json.py

# 3. 로컬 검증
python -m http.server 8503 --directory docs
# → http://localhost:8503/
```

## GitHub Pages 배포

이미 GitHub Pages가 활성화돼 있고 `docs/` 폴더 배포 설정이라면:

```bash
git add docs/
git commit -m "dashboard: 7-tier integration (ISPO + RSPO + BDSP + GAPKI + Annual + 종합)"
git push origin main
# → https://moon470an-sys.github.io/palm-dashboard/ (5~10분 후 반영)
```

GitHub Pages 설정 변경이 필요한 경우: 저장소 Settings > Pages > Source = "Deploy from a branch" > Branch = `main` / `/docs` 폴더.

## 기술 스택 (모두 CDN, npm 빌드 불필요)

- **Plotly 2.35** — 차트 (pie, bar, scatter, heatmap, dual-axis)
- **Leaflet 1.9** — Indonesia 지도 (OSM 타일)
- **DataTables 2.1** — 필터/검색/페이징 (jQuery 기반)
- 순수 ES module — 빌드 불필요

## 파일 구조

```
docs/
├── index.html              # 6 탭 nav + script loader
├── README.md               # 이 파일
├── assets/
│   ├── main.js             # 라우팅 + lazy render
│   ├── data.js             # JSON loader + 공용 유틸 (kpi, plot, makeTable)
│   ├── styles.css          # palm theme
│   └── sections/
│       ├── overview.js     # 종합
│       ├── annual.js       # Annual Report
│       ├── ispo.js         # ISPO + Leaflet 지도
│       ├── rspo.js         # RSPO Indonesia + 글로벌
│       ├── bdsp.js         # BDSP 시계열 + heatmap
│       └── gapki.js        # GAPKI 매칭
└── data/
    └── json/
        ├── meta.json
        ├── ispo_*.json
        ├── rspo_*.json
        ├── bdsp_*.json
        ├── gapki_members.json
        ├── idx_companies.json
        ├── cross_matching.json
        ├── province_coords.json
        └── ar/                # Annual Report 원본 (palm_longlist)
            ├── companies.json
            ├── financials.json
            ├── operations.json
            ├── regions.json
            ├── assets.json
            └── region_geo.json
```

## 데이터 출처

- **ISPO**: Ditjenbun 분기 PDF 4건 (2025-02 ~ 2025-10) + LS-ISPO 14곳
- **RSPO**: api-platform.cert-and-license.prismabyrspo.org/api/v1/license/certificate-registry
- **BDSP**: bdsp2.pertanian.go.id/bdsp (Cloudflare 차단 → Playwright + 인도네시아 프록시)
- **GAPKI**: gapki.id/member-gapki/
- **IDX**: 8 ticker × 각 회사 IR + Wikipedia
- **Annual Report**: palm_longlist (Claude generated + NotebookLM verified, 34 회사)

## 검증 결과 (2026-05-17)

- 6 탭 모두 헤드리스 검증 OK
- 콘솔 에러 0개
- DataTables 검색/페이징, Plotly 차트 모두 정상
- 지도 (ISPO 탭) OSM 타일 + 주별 면적 원
