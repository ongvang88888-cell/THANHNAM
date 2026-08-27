# GPLX illustration sources

## Research summary (2026-08)

Legal / reusable sources surveyed for Vietnamese road signs and situation art:

| Source | What it provides | License / notes | Used? |
|--------|------------------|-----------------|-------|
| [Wikimedia Commons – Diagrams of road signs of Vietnam](https://commons.wikimedia.org/wiki/Category:Diagrams_of_road_signs_of_Vietnam) | ~200+ SVG diagrams (mostly `Vietnam road sign …`) | Mix of PD / CC recreations of QCVN 41 faces | **Yes** — primary sign library |
| [PD-VietnamGov (road signs)](https://commons.wikimedia.org/wiki/Category:PD-VietnamGov_(road_signs)) | Official-style faces tagged public domain | **PD-VietnamGov** | **Yes** (subset overlaps) |
| QCVN 41 (BGTVT) / related circulars | Normative shapes/colours of signs | Government technical regulation — diagrams on Commons recreate these | Reference only |
| Official Bộ Công an 600-question exam images | Exam sa-hình artwork | **Copyrighted — do not scrape/redistribute** | **No** |
| Original educational SVGs in this repo | Situation / sa-hình diagrams | Created for Đậu GPLX | **Yes** — all `situations/` |

Re-download signs:

```bash
python3 scripts/fetch-gplx-signs.py
```

See also `scripts/fetch-gplx-sign-assets.md`.

## Road signs (`signs/`)

~180 SVG files named `P_101.svg`, `W_225.svg`, `R_303.svg`, … mapped from Commons titles like `Vietnam road sign P101.svg`.

Catalog: `GPLX_SIGNS` in `packages/education-core/src/gplx-content.ts`.

## Situations (`situations/`)

Original educational SVG diagrams (not official exam art), covering intersection priority, pedestrians, signals, overtaking, railway, roundabout, emergency vehicles, school zone, highway merge/exit, lane markings, rain/flood, narrow road, stop on slope, bus lane, etc.

Catalog: `GPLX_SITUATIONS` in the same module.

## Do not

- Do not scrape or redistribute official Bộ Công an 600-question exam images.
- Prefer Commons PD / QCVN diagrams or original educational art.
- Do not commit third-party paid bank assets or scraped LMS media.
