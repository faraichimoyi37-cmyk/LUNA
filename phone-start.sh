#!/usr/bin/env bash
# Run LUNA (API + web + engine + saver) on an Android phone via Termux.
set -euo pipefail

export NODE_ENV=production
export PORT=3000
export DATABASE_URL="file:$HOME/LUNA/server/prisma/luna.db"
export JWT_EXPIRES_IN="7d"
export CORS_ORIGIN="*"

# Keep the same JWT_SECRET across restarts so sessions/tokens survive reboots.
if [ -z "${JWT_SECRET:-}" ]; then
  if [ ! -f "$HOME/.luna_jwt" ]; then
    head -c 48 /dev/urandom | base64 > "$HOME/.luna_jwt"
  fi
  export JWT_SECRET="$(cat "$HOME/.luna_jwt")"
fi

cd "$HOME/LUNA"
mkdir -p server/prisma

echo "==> Applying database migrations (safe to skip if unchanged)..."
npx prisma migrate deploy --schema server/prisma/schema.prisma

echo "==> Starting LUNA API on port $PORT (engine + saver run every 60s)..."
exec npm start
