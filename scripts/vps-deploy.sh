#!/usr/bin/env bash
# Deploy Edu Commerce (GPLX) to a Linux VPS over SSH.
# Usage:
#   VPS_HOST=222.255.214.202 VPS_PASS='...' ./scripts/vps-deploy.sh
# Or with key auth (preferred after bootstrap):
#   VPS_HOST=... VPS_SSH_KEY=~/.ssh/id_ed25519 ./scripts/vps-deploy.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VPS_HOST="${VPS_HOST:?set VPS_HOST}"
VPS_USER="${VPS_USER:-root}"
VPS_PORT="${VPS_PORT:-22}"
REMOTE_DIR="${REMOTE_DIR:-/opt/edu-commerce}"
PUBLIC_HOST="${PUBLIC_HOST:-$VPS_HOST}"
SEED="${SEED:-1}"

ssh_base=(ssh -p "$VPS_PORT" -o StrictHostKeyChecking=accept-new)
scp_base=(scp -P "$VPS_PORT" -o StrictHostKeyChecking=accept-new)
rsync_ssh="ssh -p $VPS_PORT -o StrictHostKeyChecking=accept-new"

if [[ -n "${VPS_SSH_KEY:-}" ]]; then
  ssh_base+=(-i "$VPS_SSH_KEY")
  scp_base+=(-i "$VPS_SSH_KEY")
  rsync_ssh="ssh -p $VPS_PORT -i $VPS_SSH_KEY -o StrictHostKeyChecking=accept-new"
elif [[ -n "${VPS_PASS:-}" ]]; then
  if ! command -v sshpass >/dev/null 2>&1; then
    echo "sshpass required for password auth (apt install sshpass)" >&2
    exit 1
  fi
  export SSHPASS="$VPS_PASS"
  ssh_base=(sshpass -e "${ssh_base[@]}")
  scp_base=(sshpass -e "${scp_base[@]}")
  rsync_ssh="sshpass -e ssh -p $VPS_PORT -o StrictHostKeyChecking=accept-new"
else
  echo "Set VPS_PASS or VPS_SSH_KEY" >&2
  exit 1
fi

remote() { "${ssh_base[@]}" "${VPS_USER}@${VPS_HOST}" "$@"; }

echo "==> Bootstrap Docker / tools on VPS"
remote 'bash -s' <<'REMOTE'
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive
if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sh
fi
systemctl enable --now docker
apt-get update -qq
apt-get install -y -qq git curl rsync ufw ca-certificates
# open app ports (idempotent)
ufw allow 22/tcp || true
ufw allow 80/tcp || true
ufw allow 443/tcp || true
ufw allow 3000/tcp || true
ufw allow 3001/tcp || true
# enable only if not already active with deny-all risk — skip force-enable
mkdir -p /opt/edu-commerce
REMOTE

echo "==> Sync repo to ${REMOTE_DIR}"
rsync -az --delete \
  --exclude '.git' \
  --exclude 'node_modules' \
  --exclude '**/.next' \
  --exclude '**/dist' \
  --exclude '.env' \
  --exclude '.cursor' \
  --exclude 'apps/mobile-student/node_modules' \
  --exclude 'apps/mobile-student/.expo' \
  --exclude 'apps/mobile-student/android' \
  --exclude 'apps/mobile-student/ios' \
  -e "$rsync_ssh" \
  "$ROOT/" "${VPS_USER}@${VPS_HOST}:${REMOTE_DIR}/"

echo "==> Ensure .env on VPS (generate once)"
remote "PUBLIC_HOST='$PUBLIC_HOST' REMOTE_DIR='$REMOTE_DIR' bash -s" <<'REMOTE'
set -euo pipefail
cd "$REMOTE_DIR"
if [[ ! -f .env ]]; then
  PG_PASS="$(openssl rand -base64 24 | tr -d '/+=' | head -c 32)"
  JWT_A="$(openssl rand -base64 48 | tr -d '/+=' | head -c 48)"
  JWT_R="$(openssl rand -base64 48 | tr -d '/+=' | head -c 48)"
  MEDIA="$(openssl rand -base64 48 | tr -d '/+=' | head -c 48)"
  cat > .env <<EOF
NODE_ENV=production
POSTGRES_USER=edu
POSTGRES_PASSWORD=${PG_PASS}
POSTGRES_DB=edu_commerce
DATABASE_URL=postgresql://edu:${PG_PASS}@postgres:5432/edu_commerce?schema=public
REDIS_URL=redis://redis:6379
REDIS_HOST=redis
REDIS_PORT=6379
JWT_ACCESS_SECRET=${JWT_A}
JWT_REFRESH_SECRET=${JWT_R}
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=30d
API_PORT=3001
API_URL=http://${PUBLIC_HOST}:3001
APP_ID=education_app
STORAGE_DRIVER=memory
MEDIA_PUBLIC_BASE=http://${PUBLIC_HOST}:3001
MEDIA_SIGNING_SECRET=${MEDIA}
DEFAULT_PAYMENT_PROVIDER=mock
ALLOW_MOCK_PAYMENTS=true
ALLOW_DEV_SSV=false
ALLOW_IAP_TEST_TOKENS=false
ALLOW_LOCAL_MEDIA=true
NEXT_PUBLIC_API_URL=http://${PUBLIC_HOST}:3001/api/v1
NEXT_PUBLIC_APP_ID=education_app
CORS_ORIGINS=http://${PUBLIC_HOST}:3000,http://127.0.0.1:3000
PUBLIC_WEB_URL=http://${PUBLIC_HOST}:3000
MAIL_FROM=GPLX <noreply@${PUBLIC_HOST}>
INVOICE_VAT_BPS=0
EOF
  chmod 600 .env
  echo "Created .env"
else
  echo ".env already exists — keeping"
fi
REMOTE

echo "==> Build & start (docker compose prod)"
remote "cd '$REMOTE_DIR' && docker compose -f docker-compose.prod.yml --env-file .env up -d --build"

if [[ "$SEED" == "1" ]]; then
  echo "==> Seed database (GPLX demo bank + products)"
  # Wait for API healthy then seed via one-off node container sharing network
  remote "cd '$REMOTE_DIR' && bash -s" <<'REMOTE'
set -euo pipefail
for i in $(seq 1 60); do
  if curl -fsS http://127.0.0.1:3001/api/v1/health >/dev/null 2>&1; then
    echo "API healthy"
    break
  fi
  sleep 5
done
# Seed using api image (has pnpm + source)
docker compose -f docker-compose.prod.yml --env-file .env run --rm --entrypoint "" api \
  sh -c 'pnpm --filter @edu/database seed' || {
  echo "Seed via api image failed — trying db push fallback path"
  docker compose -f docker-compose.prod.yml --env-file .env run --rm --entrypoint "" api \
    sh -c 'pnpm db:generate && pnpm --filter @edu/database seed'
}
REMOTE
fi

echo "==> Smoke checks"
remote "curl -fsS http://127.0.0.1:3001/api/v1/health; echo; curl -fsS -o /dev/null -w 'web:%{http_code}\n' http://127.0.0.1:3000/ || true"

echo ""
echo "Deploy done."
echo "  Web:  http://${PUBLIC_HOST}:3000"
echo "  API:  http://${PUBLIC_HOST}:3001/api/v1/health"
echo "  GPLX: http://${PUBLIC_HOST}:3000/gplx"
echo "Rotate the root password shared in chat ASAP. Prefer SSH keys next."
