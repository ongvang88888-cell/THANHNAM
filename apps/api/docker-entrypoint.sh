#!/bin/sh
set -eu
cd /repo
echo "[entrypoint] waiting for database…"
# simple retry loop for postgres readiness via prisma
i=0
until pnpm --filter @edu/database exec prisma migrate deploy; do
  i=$((i + 1))
  if [ "$i" -ge 30 ]; then
    echo "[entrypoint] migrate failed after retries" >&2
    exit 1
  fi
  echo "[entrypoint] migrate retry $i…"
  sleep 2
done
echo "[entrypoint] starting API"
exec node apps/api/dist/main.js
