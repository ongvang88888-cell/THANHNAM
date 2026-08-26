#!/usr/bin/env bash
# Refuse a production boot that still looks like a laptop demo.
# Usage: scripts/ops/check-production-env.sh [path-to-env-file]
set -euo pipefail

ENV_FILE="${1:-.env}"
load_env_file() {
  local file="$1"
  local line key val
  while IFS= read -r line || [[ -n "${line}" ]]; do
    case "${line}" in
      ''|\#*|\;*) continue ;;
    esac
    if [[ "${line}" =~ ^([A-Za-z_][A-Za-z0-9_]*)=(.*)$ ]]; then
      key="${BASH_REMATCH[1]}"
      val="${BASH_REMATCH[2]}"
      if [[ "${val}" =~ ^\"(.*)\"$ ]] || [[ "${val}" =~ ^\'(.*)\'$ ]]; then
        val="${BASH_REMATCH[1]}"
      fi
      export "${key}=${val}"
    fi
  done < "${file}"
}
if [[ -f "${ENV_FILE}" ]]; then
  load_env_file "${ENV_FILE}"
else
  echo "WARN: ${ENV_FILE} not found; checking current process environment only" >&2
fi

FAILED=0
fail() { echo "FAIL: $*" >&2; FAILED=1; }
warn() { echo "WARN: $*" >&2; }
ok() { echo "OK: $*"; }

is_loopback() {
  case "$1" in
    *localhost*|*127.0.0.1*|*0.0.0.0*|*10.0.2.2*) return 0 ;;
    *) return 1 ;;
  esac
}

[[ "${NODE_ENV:-}" == "production" ]] || fail "NODE_ENV must be production (got '${NODE_ENV:-}')"

SECRET="${JWT_ACCESS_SECRET:-}"
if [[ ${#SECRET} -lt 32 ]] || [[ "${SECRET}" =~ change-me|dev-access ]]; then
  fail "JWT_ACCESS_SECRET must be a strong 32+ character secret"
else
  ok "JWT_ACCESS_SECRET length"
fi

REFRESH="${JWT_REFRESH_SECRET:-}"
if [[ ${#REFRESH} -lt 32 ]] || [[ "${REFRESH}" =~ change-me ]]; then
  warn "JWT_REFRESH_SECRET is weak or missing (refresh tokens are random hashes; still rotate this if you start signing with it)"
fi

DB="${DATABASE_URL:-}"
if [[ -z "${DB}" ]]; then
  fail "DATABASE_URL is required"
elif [[ "${DB}" == *"edu:edu@"* ]] || is_loopback "${DB}"; then
  fail "DATABASE_URL still looks local/dev"
else
  ok "DATABASE_URL"
fi

if [[ -z "${CORS_ORIGINS:-}" ]]; then
  fail "CORS_ORIGINS is required"
elif is_loopback "${CORS_ORIGINS}"; then
  fail "CORS_ORIGINS must not be only localhost in production"
else
  ok "CORS_ORIGINS"
fi

WEB="${PUBLIC_WEB_URL:-}"
if [[ -z "${WEB}" ]]; then
  fail "PUBLIC_WEB_URL is required"
elif [[ "${WEB}" != https://* ]]; then
  fail "PUBLIC_WEB_URL must be https://"
elif is_loopback "${WEB}"; then
  fail "PUBLIC_WEB_URL must not be loopback"
else
  ok "PUBLIC_WEB_URL"
fi

API_PUBLIC="${NEXT_PUBLIC_API_URL:-${API_URL:-}}"
if [[ -z "${API_PUBLIC}" ]]; then
  fail "NEXT_PUBLIC_API_URL (or API_URL) is required so the web client can reach the API"
elif is_loopback "${API_PUBLIC}"; then
  fail "NEXT_PUBLIC_API_URL must be a public URL, not loopback"
elif [[ "${API_PUBLIC}" != https://* ]]; then
  fail "NEXT_PUBLIC_API_URL must be https://"
else
  ok "public API URL"
fi

if [[ "${STORAGE_DRIVER:-memory}" == "memory" && "${ALLOW_LOCAL_MEDIA:-}" != "true" ]]; then
  fail "STORAGE_DRIVER=memory is not allowed in production"
else
  ok "STORAGE_DRIVER=${STORAGE_DRIVER:-}"
fi

if [[ "${ALLOW_MOCK_PAYMENTS:-}" == "true" ]]; then
  fail "ALLOW_MOCK_PAYMENTS must not be true in production"
fi

PROVIDER="${DEFAULT_PAYMENT_PROVIDER:-vnpay}"
if [[ "${PROVIDER}" == "mock" ]]; then
  fail "DEFAULT_PAYMENT_PROVIDER=mock is not allowed in production"
fi
if [[ "${PROVIDER}" == "vnpay" && -z "${VNPAY_HASH_SECRET:-}" ]]; then
  fail "VNPAY_HASH_SECRET required for DEFAULT_PAYMENT_PROVIDER=vnpay"
fi
if [[ "${PROVIDER}" == "momo" && -z "${MOMO_SECRET_KEY:-}" ]]; then
  fail "MOMO_SECRET_KEY required for DEFAULT_PAYMENT_PROVIDER=momo"
fi
if [[ "${PROVIDER}" == "zalopay" && -z "${ZALOPAY_KEY1:-}" ]]; then
  fail "ZALOPAY_KEY1 required for DEFAULT_PAYMENT_PROVIDER=zalopay"
fi
if [[ "${PROVIDER}" == "stripe" && -z "${STRIPE_SECRET_KEY:-}" ]]; then
  fail "STRIPE_SECRET_KEY required for DEFAULT_PAYMENT_PROVIDER=stripe"
fi

if [[ -z "${SMTP_HOST:-}" ]]; then
  warn "SMTP_HOST is empty — verify/reset/receipt emails will not leave the box"
else
  ok "SMTP_HOST"
fi

if [[ "${SELL_ON_PLAY:-}" == "true" ]]; then
  [[ -n "${GOOGLE_PLAY_PACKAGE_NAME:-}" ]] || fail "GOOGLE_PLAY_PACKAGE_NAME required when SELL_ON_PLAY=true"
  [[ -n "${GOOGLE_PLAY_SERVICE_ACCOUNT_JSON:-}" ]] || fail "GOOGLE_PLAY_SERVICE_ACCOUNT_JSON required when SELL_ON_PLAY=true"
  if [[ "${ALLOW_IAP_TEST_TOKENS:-}" == "true" ]]; then
    fail "ALLOW_IAP_TEST_TOKENS cannot be true when SELL_ON_PLAY=true"
  fi
  ok "SELL_ON_PLAY gates"
else
  warn "SELL_ON_PLAY is not true — Android store purchases will not verify against Play"
fi

if [[ ${FAILED} -ne 0 ]]; then
  echo "Production environment check failed." >&2
  exit 1
fi

echo "Production environment check passed."
