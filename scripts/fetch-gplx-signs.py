#!/usr/bin/env python3
"""Download Vietnamese road-sign SVGs from Wikimedia Commons (QCVN 41 diagrams).

Prefer canonical titles: `Vietnam road sign P101.svg`
Falls back to dotted / QCVN-suffixed variants when needed.
Rate-limits requests; skips existing files unless --force.
"""
from __future__ import annotations

import argparse
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

UA = "EduCommerceGPLX/1.1 (educational trainer; +https://github.com/ongvang88888-cell/THANHNAM)"
OUT = Path(__file__).resolve().parents[1] / "apps/web/public/gplx/signs"

# Exam-relevant codes (QCVN 41 series) — expand library beyond the initial ~43.
CODES: list[str] = [
    # Prohibitory P.
    "P101", "P102", "P103a", "P103b", "P103c", "P104", "P105", "P106a", "P106b", "P106c",
    "P107", "P107a", "P107b", "P108", "P109", "P110a", "P110b", "P111a", "P111b", "P111c",
    "P111d", "P112", "P113", "P115", "P116", "P117", "P118", "P119", "P120", "P121",
    "P122", "P123a", "P123b", "P124a", "P124b", "P125", "P126", "P127a", "P127b", "P127c",
    "P128", "P129", "P130", "P131a", "P131b", "P131c", "P132", "P133", "P134", "P135",
    "P136", "P137", "P138", "P139", "P140",
    # Warning W.
    "W201a", "W201b", "W201c", "W201d", "W202a", "W202b", "W203a", "W203b", "W203c",
    "W204", "W205a", "W205b", "W205c", "W205d", "W205e", "W206", "W207a", "W207b",
    "W207c", "W208", "W209", "W210", "W211a", "W211b", "W212", "W213", "W214",
    "W215a", "W215b", "W215c", "W216a", "W216b", "W217", "W218", "W219", "W220",
    "W221a", "W221b", "W222a", "W222b", "W223a", "W223b", "W224", "W225", "W226",
    "W227", "W228a", "W228b", "W228c", "W228d", "W229", "W230", "W231", "W232",
    "W233", "W234", "W235", "W236", "W237", "W238", "W239a", "W239b", "W240",
    "W241", "W242a", "W242b", "W243a", "W244", "W245a", "W245b", "W246a", "W246b",
    "W247",
    # Mandatory R.
    "R301a", "R301b", "R301c", "R301d", "R301e", "R301f", "R301g", "R302a", "R302b",
    "R302c", "R303", "R304", "R305", "R306", "R307", "R308a", "R308b", "R309",
    "R310a", "R310b", "R310c", "R403a", "R403b", "R404a", "R404b", "R411", "R412a",
    "R415a", "R415b", "R420", "R421",
    # Guide I.
    "I401", "I402", "I403a", "I405a", "I407a", "I408", "I409", "I412a", "I423a",
    "I423b", "I434a", "I434b", "I439", "I443", "I447a", "I449",
    # Supplementary S.
    "S501", "S502", "S503a", "S503b", "S504", "S505a", "S505b", "S507", "S509a",
    "S509b", "S510",
]


def local_name(code: str) -> str:
    """P101 -> P_101.svg ; W201a -> W_201a.svg"""
    m = re.match(r"^([PWRIS])(\d+[a-z]?)$", code, re.I)
    if not m:
        raise ValueError(code)
    return f"{m.group(1).upper()}_{m.group(2)}.svg"


def candidate_titles(code: str) -> list[str]:
    letter = code[0]
    rest = code[1:]
    return [
        f"Vietnam road sign {code}.svg",
        f"Vietnam road sign {letter}.{rest}.svg",
        f"Vietnam road sign {letter}.{rest} (QCVN 41-2019-BGTVT).svg",
        f"Vietnam road sign {letter}.{rest} (QCVN 41-2016-BGTVT).svg",
        f"Vietnam road sign {letter}.{rest} (QCVN 41-2024-BGTVT).svg",
        f"Vietnam road sign {code} (QCVN 41-2019-BGTVT).svg",
    ]


def download(url: str, dest: Path, retries: int = 4) -> bool:
    delay = 1.5
    for attempt in range(retries):
        req = urllib.request.Request(url, headers={"User-Agent": UA})
        try:
            with urllib.request.urlopen(req, timeout=90) as resp:
                data = resp.read()
                ctype = (resp.headers.get("Content-Type") or "").lower()
                if b"<svg" not in data[:2000] and "svg" not in ctype:
                    return False
                dest.write_bytes(data)
                return True
        except urllib.error.HTTPError as e:
            if e.code == 404:
                return False
            if e.code in (429, 503) and attempt < retries - 1:
                time.sleep(delay)
                delay *= 2
                continue
            return False
        except Exception:
            if attempt < retries - 1:
                time.sleep(delay)
                delay *= 2
                continue
            return False
    return False


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--force", action="store_true")
    ap.add_argument("--sleep", type=float, default=0.45)
    args = ap.parse_args()
    OUT.mkdir(parents=True, exist_ok=True)

    ok = skip = fail = 0
    for code in CODES:
        dest = OUT / local_name(code)
        if dest.exists() and not args.force and dest.stat().st_size > 200:
            skip += 1
            continue
        got = False
        for title in candidate_titles(code):
            url = "https://commons.wikimedia.org/wiki/Special:FilePath/" + urllib.parse.quote(
                title.replace(" ", "_")
            )
            if download(url, dest):
                print(f"OK  {dest.name}  ← {title}")
                ok += 1
                got = True
                break
            time.sleep(0.15)
        if not got:
            print(f"MISS {local_name(code)}", file=sys.stderr)
            fail += 1
        time.sleep(args.sleep)

    print(f"\nDone: downloaded={ok} skipped={skip} missing={fail} total_codes={len(CODES)}")
    print(f"Files in {OUT}: {len(list(OUT.glob('*.svg')))}")
    return 0 if ok or skip else 1


if __name__ == "__main__":
    raise SystemExit(main())
