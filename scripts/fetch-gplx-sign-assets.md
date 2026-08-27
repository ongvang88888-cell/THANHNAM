# Fetch GPLX sign assets

Road-sign SVGs under `apps/web/public/gplx/signs/` are sourced from Wikimedia Commons
(Vietnamese QCVN 41 diagrams / PD-VietnamGov). Prefer the batch script:

```bash
python3 scripts/fetch-gplx-signs.py
# or force re-download:
python3 scripts/fetch-gplx-signs.py --force
```

Single-file example:

```bash
curl -L -A 'EduCommerceGPLX/1.0' \
  -o apps/web/public/gplx/signs/P_101.svg \
  'https://commons.wikimedia.org/wiki/Special:FilePath/Vietnam_road_sign_P101.svg'
```

Situation diagrams in `apps/web/public/gplx/situations/` are original educational SVGs.
See `apps/web/public/gplx/SOURCES.md` for the full source research table.
