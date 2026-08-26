#!/bin/sh
# Logical PostgreSQL backup. Works on bash and Alpine ash (compose sidecar).
set -eu

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL is required" >&2
  exit 1
fi

if [ "${REQUIRE_STRONG_BACKUP_TARGET:-}" = "true" ]; then
  case "${DATABASE_URL}" in
    *edu:edu@*|*@localhost*|*@127.0.0.1*)
      echo "Refusing local/dev DATABASE_URL (set REQUIRE_STRONG_BACKUP_TARGET=false to override)" >&2
      exit 1
      ;;
  esac
fi

BACKUP_DIR="${BACKUP_DIR:-./backups/postgres}"
KEEP="${BACKUP_KEEP:-14}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "${BACKUP_DIR}"

CLEAN_URL="${DATABASE_URL%%\?*}"
OUT="${BACKUP_DIR}/edu_commerce_${STAMP}.sql.gz"

pg_dump --no-owner --no-acl --format=plain --dbname="${CLEAN_URL}" | gzip -9 > "${OUT}"

# Keep the newest KEEP files only.
n=0
# shellcheck disable=SC2045
for f in $(ls -1t "${BACKUP_DIR}"/edu_commerce_*.sql.gz 2>/dev/null); do
  n=$((n + 1))
  if [ "${n}" -gt "${KEEP}" ]; then
    rm -f -- "${f}"
  fi
done

echo "${OUT}"
