#!/bin/sh
set -eu
cd /repo
echo "[entrypoint] waiting for database…"
i=0
until pnpm --filter @edu/database exec prisma migrate deploy; do
  i=$((i + 1))
  if [ "$i" -ge 20 ]; then
    echo "[entrypoint] migrate deploy failed — attempting db push bootstrap" >&2
    pnpm --filter @edu/database exec prisma db push --accept-data-loss
    # Mark migrations applied so future deploys use migrate deploy
    pnpm --filter @edu/database exec prisma migrate resolve --applied 20260827100000_init || true
    break
  fi
  echo "[entrypoint] migrate retry $i…"
  sleep 3
done
echo "[entrypoint] starting API"
exec node apps/api/dist/main.js
