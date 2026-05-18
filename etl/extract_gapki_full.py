"""GAPKI members.html → gapki_members.json (full 5-column extraction).

ISPO cross-reference 제거. 원본 HTML의 5컬럼(번호·회사·지점·주소·전화)만 사용.

  python etl/extract_gapki_full.py
"""
from __future__ import annotations

import html as html_mod
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]  # D:\프로젝트\인도네시아 팜 농장
SRC_HTML = ROOT / "data" / "gapki" / "members.html"
DASHBOARD = Path(__file__).resolve().parents[1]
OUT_JSON = DASHBOARD / "data" / "json" / "gapki_members.json"

CELL_RE = re.compile(
    r'<td class="column-(?P<col>[1-5])">(?P<body>.*?)</td>',
    re.IGNORECASE | re.DOTALL,
)
TAG_RE = re.compile(r"<[^>]+>")


def clean(s: str) -> str:
    s = html_mod.unescape(s or "")
    s = TAG_RE.sub(" ", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s


def main() -> None:
    text = SRC_HTML.read_text(encoding="utf-8", errors="replace")
    rows = []
    cur: dict[str, object] = {}
    for m in CELL_RE.finditer(text):
        col = int(m.group("col"))
        val = clean(m.group("body"))
        if col == 1:
            if cur.get("member_name"):
                rows.append(cur)
            cur = {"no": int(val) if val.isdigit() else None}
        elif col == 2:
            cur["member_name"] = val
        elif col == 3:
            cur["branch"] = val
        elif col == 4:
            cur["address"] = val
        elif col == 5:
            cur["phone"] = val
    if cur.get("member_name"):
        rows.append(cur)

    rows = [r for r in rows if r.get("member_name") and r["member_name"].upper() != "NAMA PERUSAHAAN"]
    for r in rows:
        r.setdefault("branch", "")
        r.setdefault("address", "")
        r.setdefault("phone", "")

    OUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUT_JSON.write_text(
        json.dumps(rows, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )

    unique = {r["member_name"] for r in rows}
    branches = sum(1 for r in rows if r["branch"].lower() != "pusat")
    print(f"[extract] rows={len(rows)} unique companies={len(unique)} branch rows={branches}")
    print(f"  saved -> {OUT_JSON}")


if __name__ == "__main__":
    main()
