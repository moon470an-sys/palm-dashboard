# 🌴 Indonesia Palm Integrated Dashboard

ISPO + RSPO + BDSP + GAPKI + IDX Annual Report 통합 정적 대시보드.
GitHub Pages 호환 (모든 데이터는 `data/json/` JSON, 서버 불필요).

**구조 원칙: 각 탭은 단독 source 기반 (no cross-reference).**

## 6 탭 구성

| 탭 | 설명 | 데이터 source |
|---|---|---|
| 🏠 종합 | Annual Report 34개사 재무 통합 (재무 · 농장 · 생산 · 평가) · 4-group 약 60 plot | ar/* |
| 📊 Annual Report | IDX 34 상장사 (회사+연도 필터) · Overview/Financials/Map/Asset/Production 5 sub-tab | palm_longlist |
| 📜 ISPO | 1,378 인증서 + 1,195 회사 + 41 LS · 상태/유형/주/지도 · CPO/PKS Capa · 90일 만료 | ispo_* |
| 🌐 RSPO | Indonesia 2,026 + 글로벌 9,343 · License Status · 90/365일 만료 · Parent Entity Top 15 | rspo_* |
| 📈 BDSP | KELAPA SAWIT 시계열 5,562 · 국가/주/군 · YoY · Top 20 생산성 kabupaten | bdsp_* |
| 🏪 GAPKI | 714 협회 회원사 (단독 source) | gapki_members |

## 데이터 갱신

```powershell
# 1. DB 최신화 (각 source 별 ETL — 부모 디렉토리 ../../scripts/)
python ..\..\scripts\rspo.py --fetch --country ID --category pc,trader,distributor,ish
python ..\..\scripts\rspo.py --match
python ..\..\scripts\gapki.py --fetch --match
python ..\..\scripts\bdsp_playwright.py --mode all-prov --proxy ...
python ..\..\scripts\bdsp_bulk_import.py
python ..\..\scripts\idx.py --fetch
python ..\..\scripts\news.py --fetch

# 2. DB → JSON export (dashboard 내부 ETL)
python etl\export_json.py

# 3. 로컬 검증 (dashboard 디렉토리에서)
python -m http.server 8503
# → http://localhost:8503/
```

## GitHub Pages 배포

배포 워크플로(`.github/workflows/deploy.yml`)가 `dashboard/` 폴더를 `gh-pages` 브랜치로 push합니다.

```bash
git add dashboard/
git commit -m "dashboard: ..."
git push origin main
# → https://moon470an-sys.github.io/palm-dashboard/ (Actions 후 1~2분)
```

## 기술 스택 (모두 CDN, npm 빌드 불필요)

- **Plotly 2.35** — 차트 (pie, bar, scatter, dual-axis)
- **Leaflet 1.9** — Indonesia 지도 (OSM 타일)
- **DataTables 2.1** — 필터/검색/페이징 (jQuery 기반)
- 순수 ES module — 빌드 불필요
- **IntersectionObserver lazy render** — 차트는 viewport 진입 시 그림 (data.js의 `lazyPlot`)

## 파일 구조

```
dashboard/
├── index.html              # 6 탭 nav + script loader (defer + preload)
├── README.md               # 이 파일
├── assets/
│   ├── main.js             # 라우팅 + boot progress + waitForLibs
│   ├── data.js             # JSON loader + 공용 유틸 (kpi, plot, lazyPlot, makeTable)
│   ├── styles.css          # palm theme + group-h / section-h / warn-note
│   └── sections/
│       ├── overview.js     # 종합 (Annual 재무 통합)
│       ├── annual.js       # Annual Report (5 sub-tab dispatcher)
│       ├── ar_sub/         #   overview / financials / map / assets / production
│       ├── ispo.js         # ISPO + Leaflet 지도
│       ├── rspo.js         # RSPO Indonesia + 글로벌
│       ├── bdsp.js         # BDSP 시계열
│       └── gapki.js        # GAPKI 회원사
└── data/
    └── json/
        ├── meta.json
        ├── ispo_*.json
        ├── rspo_*.json
        ├── bdsp_*.json
        ├── gapki_members.json
        ├── province_coords.json
        └── ar/                # Annual Report (palm_longlist)
            ├── companies.json
            ├── financials.json
            ├── operations.json
            ├── regions.json
            ├── assets.json
            └── region_geo.json
```

## 데이터 출처 (각 탭 단독 source, no cross-reference)

- **ISPO**: Ditjenbun 분기 PDF 4건 (2025-02 ~ 2025-10) + LS-ISPO 14곳
- **RSPO**: api-platform.cert-and-license.prismabyrspo.org/api/v1/license/certificate-registry
- **BDSP**: bdsp2.pertanian.go.id/bdsp (Cloudflare 차단 → Playwright + 인도네시아 프록시)
- **GAPKI**: gapki.id/member-gapki/
- **IDX (Annual Report)**: palm_longlist (Claude generated + NotebookLM verified, 34 회사)

## 검증 결과 (2026-05-18)

- 6 탭 모두 단독 source 검증 OK · cross-reference 흔적 모두 제거
- 콘솔 에러 0개
- Lazy rendering으로 초기 로드 시간 단축
- DataTables 검색/페이징, Plotly 차트 모두 정상
- 지도 (ISPO 탭) OSM 타일 + 주별 면적 원
- footer에 DB size + 갱신 시각 자동 표시
