#!/usr/bin/env bash
# Rebuild API + web on the school VPS without sourcing .env (MAIL_FROM can break bash).
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/edu-commerce}"
cd "${APP_DIR}"

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
