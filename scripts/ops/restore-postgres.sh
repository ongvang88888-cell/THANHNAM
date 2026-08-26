#!/usr/bin/env bash
# Restore a gzip SQL dump. Destructive. Requires explicit RESTORE_CONFIRM=YES.
set -euo pipefail

FILE="${1:-}"
if [[ -z "${FILE}" || ! -f "${FILE}" ]]; then
  echo "usage: RESTORE_CONFIRM=YES DATABASE_URL=... $0 <backup.sql.gz>" >&2
  exit 1
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is required" >&2
  exit 1
fi

if [[ "${RESTORE_CONFIRM:-}" != "YES" ]]; then
  echo "Refusing restore. Re-run with RESTORE_CONFIRM=YES after you intend to overwrite this database." >&2
  exit 1
fi

CLEAN_URL="${DATABASE_URL%%\?*}"
echo "Restoring ${FILE} into ${CLEAN_URL%%@*}@…" >&2
gzip -dc "${FILE}" | psql --dbname="${CLEAN_URL}"
echo "Restore finished." >&2
