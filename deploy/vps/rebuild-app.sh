#!/usr/bin/env bash
# Rebuild API + web on the school VPS without sourcing .env (MAIL_FROM can break bash).
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/edu-commerce}"
STORAGE_ROOT="${STORAGE_ROOT:-/var/lib/edu-commerce/media}"
cd "${APP_DIR}"

mkdir -p "${STORAGE_ROOT}"
chmod 750 "${STORAGE_ROOT}"

python3 - <<PY
from pathlib import Path
env_path = Path("${APP_DIR}/.env")
if not env_path.exists():
    raise SystemExit(0)
updates = {
    "STORAGE_DRIVER": "disk",
    "STORAGE_ROOT": "/var/lib/edu-commerce/media",
    "ALLOW_LOCAL_MEDIA": "true",
    "FFMPEG_THREADS": "2",
    "FFMPEG_MAX_CONCURRENT": "2",
}
lines = env_path.read_text().splitlines()
seen = set()
out = []
for line in lines:
    stripped = line.strip()
    if stripped and not stripped.startswith("#") and "=" in stripped:
        key = stripped.split("=", 1)[0].strip()
        if key in updates:
            out.append(f"{key}={updates[key]}")
            seen.add(key)
            continue
    out.append(line)
for key, value in updates.items():
    if key not in seen:
        out.append(f"{key}={value}")
env_path.write_text("\n".join(out) + "\n")
PY

if [[ -d "${APP_DIR}/deploy/vps/systemd" ]]; then
  cp "${APP_DIR}/deploy/vps/systemd/edu-api.service" /etc/systemd/system/edu-api.service
  cp "${APP_DIR}/deploy/vps/systemd/edu-web.service" /etc/systemd/system/edu-web.service
  sed -i "s#/opt/edu-commerce#${APP_DIR}#g" /etc/systemd/system/edu-api.service /etc/systemd/system/edu-web.service
  systemctl daemon-reload
fi

if [[ -f /etc/caddy/Caddyfile ]] && grep -q "edu-commerce-platform" /etc/caddy/Caddyfile; then
  python3 - <<'PY'
from pathlib import Path
p = Path("/etc/caddy/Caddyfile")
text = p.read_text()
mark = "# edu-commerce-platform"
if mark not in text:
    raise SystemExit(0)
if "request_body" in text and "@compressible" in text:
    raise SystemExit(0)
# Keep existing host; only refresh the edu-commerce site block body after the mark.
start = text.find(mark)
if start < 0:
    raise SystemExit(0)
rest = text[start:]
brace = rest.find("{")
if brace < 0:
    raise SystemExit(0)
depth = 0
end = None
for i, ch in enumerate(rest[brace:], start=brace):
    if ch == "{":
        depth += 1
    elif ch == "}":
        depth -= 1
        if depth == 0:
            end = i
            break
if end is None:
    raise SystemExit(0)
host_line = rest[:brace]
new_block = host_line + """{
	request_body {
		max_size 450MB
	}
	@compressible {
		not path /api/v1/media/local*
	}
	encode @compressible zstd gzip
	@api path /api/*
	reverse_proxy @api 127.0.0.1:3001
	reverse_proxy 127.0.0.1:3000
}
"""
p.write_text(text[:start] + mark + "\n" + new_block + rest[end + 1 :])
print("Updated Caddy media streaming site block")
PY
  systemctl reload caddy || true
fi

if ! command -v ffmpeg >/dev/null 2>&1; then
  echo "Installing ffmpeg for AI video/audio edits…"
  apt-get update -y
  DEBIAN_FRONTEND=noninteractive apt-get install -y ffmpeg
fi

if [[ -f "${APP_DIR}/.env" ]]; then
  while IFS= read -r line; do
    case "${line}" in
      NEXT_PUBLIC_*=*)
        export "${line}"
        ;;
    esac
  done < <(grep -E '^NEXT_PUBLIC_[A-Z0-9_]+=' "${APP_DIR}/.env" || true)
fi

if [[ -z "${NEXT_PUBLIC_API_URL:-}" ]]; then
  echo "NEXT_PUBLIC_API_URL is required at Next build time (browser bundle)." >&2
  exit 1
fi

export CI=true
export NEXT_PUBLIC_APP_ID="${NEXT_PUBLIC_APP_ID:-education_app}"
unset NODE_ENV || true

# New workspace packages (e.g. @edu/ai-core) need a lockfile install before turbo build.
pnpm install --frozen-lockfile

pnpm exec turbo run build --filter=@edu/api --filter=@edu/web
systemctl restart edu-api edu-web
echo "Rebuilt with NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}"
