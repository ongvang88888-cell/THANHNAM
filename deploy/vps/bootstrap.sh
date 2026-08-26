#!/usr/bin/env bash
# Install EduCommerce on a Vietnix-style Ubuntu VPS without wiping other sites.
# Existing Caddy/:80 apps (for example ChốtKiểm) stay on the bare IP.
# This site is added on PUBLIC_HOST only (default: <public-ip>.sslip.io).
#
# Usage (as root):
#   GIT_REF=cursor/play-and-data-launch-ac5e bash deploy/vps/bootstrap.sh
set -euo pipefail

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run as root" >&2
  exit 1
fi

APP_DIR="${APP_DIR:-/opt/edu-commerce}"
GIT_URL="${GIT_URL:-https://github.com/ongvang88888-cell/THANHNAM.git}"
GIT_REF="${GIT_REF:-cursor/play-and-data-launch-ac5e}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

detect_public_ip() {
  local ip=""
  ip="$(curl -4 -fsS --max-time 8 https://api.ipify.org || true)"
  if [[ -z "${ip}" ]]; then
    ip="$(hostname -I 2>/dev/null | awk '{print $1}')"
  fi
  printf '%s' "${ip}"
}

PUBLIC_IP="${PUBLIC_IP:-$(detect_public_ip)}"
if [[ -z "${PUBLIC_IP}" ]]; then
  echo "Could not detect PUBLIC_IP" >&2
  exit 1
fi
PUBLIC_HOST="${PUBLIC_HOST:-${PUBLIC_IP}.sslip.io}"
PUBLIC_WEB_URL="${PUBLIC_WEB_URL:-https://${PUBLIC_HOST}}"
PUBLIC_API_URL="${PUBLIC_API_URL:-${PUBLIC_WEB_URL}/api/v1}"

echo "Installing EduCommerce"
echo "  APP_DIR=${APP_DIR}"
echo "  GIT_REF=${GIT_REF}"
echo "  PUBLIC_HOST=${PUBLIC_HOST}"

ensure_hosts() {
  grep -qE '[[:space:]]postgres\.local([[:space:]]|$)' /etc/hosts || echo '127.0.0.1 postgres.local' >> /etc/hosts
  grep -qE '[[:space:]]redis\.local([[:space:]]|$)' /etc/hosts || echo '127.0.0.1 redis.local' >> /etc/hosts
}

ensure_swap() {
  local mem_mb
  mem_mb="$(awk '/MemTotal/ {print int($2/1024)}' /proc/meminfo)"
  if [[ "${mem_mb}" -ge 3500 ]]; then
    return 0
  fi
  if swapon --show | grep -q .; then
    return 0
  fi
  if [[ -f /swapfile ]]; then
    swapon /swapfile || true
    return 0
  fi
  echo "RAM ${mem_mb}MB — adding 2G swap"
  fallocate -l 2G /swapfile 2>/dev/null || dd if=/dev/zero of=/swapfile bs=1M count=2048 status=none
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  grep -q '^/swapfile ' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
}

install_packages() {
  export DEBIAN_FRONTEND=noninteractive
  apt-get update -y
  apt-get install -y --no-install-recommends \
    ca-certificates curl git gnupg build-essential \
    postgresql postgresql-contrib redis-server \
    ufw

  if ! command -v node >/dev/null 2>&1 || ! node -v | grep -qE '^v20\.|^v22\.|^v24\.'; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
  fi

  corepack enable
  corepack prepare pnpm@9.15.0 --activate

  if ! command -v caddy >/dev/null 2>&1 && ! command -v docker >/dev/null 2>&1; then
    apt-get install -y debian-keyring debian-archive-keyring apt-transport-https
    curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
      | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
    curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
      | tee /etc/apt/sources.list.d/caddy-stable.list >/dev/null
    apt-get update -y
    apt-get install -y caddy
  fi
}

sync_repo() {
  mkdir -p "${APP_DIR}"
  if [[ -d "${APP_DIR}/.git" ]]; then
    git -C "${APP_DIR}" fetch --all --tags
    git -C "${APP_DIR}" checkout "${GIT_REF}"
    git -C "${APP_DIR}" pull --ff-only origin "${GIT_REF}" || true
  elif [[ -f "${APP_DIR}/package.json" ]]; then
    echo "Using existing tree at ${APP_DIR}"
  else
    git clone --branch "${GIT_REF}" --single-branch "${GIT_URL}" "${APP_DIR}"
  fi
}

rand() {
  openssl rand -hex 24
}

ensure_env() {
  local env_file="${APP_DIR}/.env"
  if [[ -f "${env_file}" ]]; then
    echo "Keeping existing ${env_file}"
    return 0
  fi

  local pg_pass jwt_access jwt_refresh media_sign media_hook vnpay_placeholder
  pg_pass="$(rand)"
  jwt_access="$(rand)$(rand)"
  jwt_refresh="$(rand)$(rand)"
  media_sign="$(rand)$(rand)"
  media_hook="$(rand)$(rand)"
  vnpay_placeholder="$(rand)$(rand)"

  umask 077
  cat > "${env_file}" <<EOF
NODE_ENV=production
API_PORT=3001

POSTGRES_USER=edu_app
POSTGRES_PASSWORD=${pg_pass}
POSTGRES_DB=edu_commerce
DATABASE_URL=postgresql://edu_app:${pg_pass}@postgres.local:5432/edu_commerce?schema=public
REDIS_URL=redis://redis.local:6379

JWT_ACCESS_SECRET=${jwt_access}
JWT_REFRESH_SECRET=${jwt_refresh}
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=30d

APP_ID=education_app
CORS_ORIGINS=${PUBLIC_WEB_URL}
PUBLIC_WEB_URL=${PUBLIC_WEB_URL}
NEXT_PUBLIC_API_URL=${PUBLIC_API_URL}
NEXT_PUBLIC_APP_ID=education_app
EXPO_PUBLIC_API_URL=${PUBLIC_API_URL}
EXPO_PUBLIC_APP_ID=education_app
PUBLIC_DOMAIN=${PUBLIC_HOST}

STORAGE_DRIVER=memory
ALLOW_LOCAL_MEDIA=true
MEDIA_SIGNING_SECRET=${media_sign}
MEDIA_WEBHOOK_SECRET=${media_hook}
S3_REGION=ap-southeast-1
AWS_REGION=ap-southeast-1

DEFAULT_PAYMENT_PROVIDER=vnpay
ALLOW_MOCK_PAYMENTS=false
ALLOW_DEV_SSV=false
ALLOW_IAP_TEST_TOKENS=false
VNPAY_TMN_CODE=
VNPAY_HASH_SECRET=${vnpay_placeholder}
VNPAY_URL=https://pay.vnpay.vn/vpcpay.html

SMTP_HOST=
SMTP_PORT=587
SMTP_SECURE=true
MAIL_FROM=EduCommerce noreply@${PUBLIC_HOST}
INVOICE_VAT_BPS=0

SELL_ON_PLAY=false
GOOGLE_PLAY_PACKAGE_NAME=com.educommerce.student
EOF
  chmod 600 "${env_file}"
  echo "Wrote ${env_file} (secrets stay on this server)"
}

load_env_value() {
  local key="$1"
  local line
  line="$(grep -E "^${key}=" "${APP_DIR}/.env" | tail -n 1 || true)"
  printf '%s' "${line#*=}"
}

ensure_postgres() {
  systemctl enable --now postgresql
  local user db pass
  user="$(load_env_value POSTGRES_USER)"
  db="$(load_env_value POSTGRES_DB)"
  pass="$(load_env_value POSTGRES_PASSWORD)"
  if [[ -z "${user}" || -z "${db}" || -z "${pass}" ]]; then
    echo "Postgres env missing" >&2
    exit 1
  fi
  sudo -u postgres psql -v ON_ERROR_STOP=1 <<SQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${user}') THEN
    CREATE ROLE ${user} LOGIN PASSWORD '${pass}';
  ELSE
    ALTER ROLE ${user} LOGIN PASSWORD '${pass}';
  END IF;
END
\$\$;
SQL
  if ! sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='${db}'" | grep -q 1; then
    sudo -u postgres createdb -O "${user}" "${db}"
  fi
}

ensure_redis() {
  if systemctl list-unit-files | grep -q '^redis-server.service'; then
    systemctl enable --now redis-server
  elif systemctl list-unit-files | grep -q '^redis.service'; then
    systemctl enable --now redis
  fi
}

build_app() {
  cd "${APP_DIR}"
  export DATABASE_URL="$(load_env_value DATABASE_URL)"
  export NEXT_PUBLIC_API_URL="${PUBLIC_API_URL}"
  export NEXT_PUBLIC_APP_ID=education_app
  # Prisma CLI and tsc live in devDependencies — do not set NODE_ENV=production
  # before install/generate, or pnpm skips them.
  unset NODE_ENV || true
  pnpm install --frozen-lockfile
  pnpm db:generate
  pnpm --filter @edu/database push
  pnpm --filter @edu/database build
  pnpm --filter @edu/api build
  NODE_ENV=production pnpm --filter @edu/web build

  local count
  count="$(sudo -u postgres psql -d "$(load_env_value POSTGRES_DB)" -tAc 'SELECT count(*) FROM "User"' 2>/dev/null || echo 0)"
  if [[ "${count}" == "0" ]]; then
    echo "Empty User table — seeding catalog/demo accounts"
    pnpm db:seed
  else
    echo "User table already has ${count} rows — skip seed"
  fi
}

install_systemd() {
  local unit_dir="${SCRIPT_DIR}/systemd"
  if [[ ! -f "${unit_dir}/edu-api.service" ]]; then
    unit_dir="${APP_DIR}/deploy/vps/systemd"
  fi
  cp "${unit_dir}/edu-api.service" /etc/systemd/system/edu-api.service
  cp "${unit_dir}/edu-web.service" /etc/systemd/system/edu-web.service
  sed -i "s#/opt/edu-commerce#${APP_DIR}#g" /etc/systemd/system/edu-api.service /etc/systemd/system/edu-web.service
  systemctl daemon-reload
  systemctl enable --now edu-api edu-web
}

find_caddyfile() {
  local candidate
  for candidate in /etc/caddy/Caddyfile /usr/local/etc/caddy/Caddyfile; do
    if [[ -f "${candidate}" ]]; then
      printf '%s' "${candidate}"
      return 0
    fi
  done
  return 1
}

install_caddy_site() {
  local mark="# edu-commerce-platform"
  local caddyfile site
  site="${PUBLIC_HOST} {
	encode zstd gzip
	@api path /api/*
	reverse_proxy @api 127.0.0.1:3001
	reverse_proxy 127.0.0.1:3000
}
"
  if caddyfile="$(find_caddyfile)"; then
    if grep -q "${mark}" "${caddyfile}"; then
      echo "Caddy site already present in ${caddyfile}"
    else
      printf '\n%s\n%s\n' "${mark}" "${site}" >> "${caddyfile}"
      echo "Appended EduCommerce host to ${caddyfile} (did not replace existing sites)"
    fi
    if systemctl is-active --quiet caddy; then
      systemctl reload caddy || caddy reload --config "${caddyfile}"
    elif command -v caddy >/dev/null 2>&1; then
      caddy reload --config "${caddyfile}" || true
    fi
  else
    echo "WARN: Caddyfile not found. Add this site block yourself:"
    printf '%s\n' "${site}"
  fi
}

install_backup_cron() {
  mkdir -p /var/backups/edu-commerce
  cat > /etc/cron.d/edu-commerce-backup <<EOF
15 3 * * * root DATABASE_URL=\$(sed -n 's/^DATABASE_URL=//p' ${APP_DIR}/.env | tail -n 1) BACKUP_DIR=/var/backups/edu-commerce ${APP_DIR}/scripts/ops/backup-postgres.sh >> /var/log/edu-commerce-backup.log 2>&1
EOF
  chmod 644 /etc/cron.d/edu-commerce-backup
}

harden_firewall() {
  if ufw status 2>/dev/null | grep -q 'Status: active'; then
    ufw allow OpenSSH || ufw allow 22/tcp || true
    ufw allow 80/tcp || true
    ufw allow 443/tcp || true
  else
    echo "ufw is inactive — leaving it off so an existing site is not locked out"
  fi
}

health_check() {
  local ok=0
  sleep 2
  if curl -fsS --max-time 8 "http://127.0.0.1:3001/api/v1/health" >/tmp/edu-health.json; then
    echo "API health: $(cat /tmp/edu-health.json)"
    ok=1
  else
    echo "WARN: API health check failed — see journalctl -u edu-api"
  fi
  if curl -fsS --max-time 8 "http://127.0.0.1:3000/privacy" >/dev/null; then
    echo "Web /privacy: ok"
  else
    echo "WARN: web /privacy failed — see journalctl -u edu-web"
  fi
  echo "Public origin: ${PUBLIC_WEB_URL}"
  echo "Legal: ${PUBLIC_WEB_URL}/privacy ${PUBLIC_WEB_URL}/terms ${PUBLIC_WEB_URL}/data-deletion"
  echo "VNPay live keys are still placeholders until you paste TMN/hash."
  echo "SELL_ON_PLAY is false until Play service account exists."
  return 0
}

ensure_hosts
ensure_swap
install_packages
sync_repo
ensure_env
ensure_postgres
ensure_redis
build_app
install_systemd
install_caddy_site
install_backup_cron
harden_firewall
bash "${APP_DIR}/scripts/ops/check-production-env.sh" "${APP_DIR}/.env"
health_check
echo "Bootstrap finished."
