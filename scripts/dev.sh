#!/usr/bin/env bash
# One-command bootstrap for the Claims Intelligence Engine (local machine or this workspace).
set -euo pipefail
cd "$(dirname "$0")/.."

PG_BIN=""
if command -v psql >/dev/null 2>&1; then
  PG_BIN="$(dirname "$(command -v psql)")"
elif [ -d /usr/lib/postgresql/15/bin ]; then
  PG_BIN=/usr/lib/postgresql/15/bin
else
  echo "PostgreSQL not found. Install it (apt-get install postgresql) or use: docker compose up -d postgres"
  exit 1
fi

# --- PostgreSQL (local data dir so data persists in the repo workspace) ---
if [ ! -f .pgdata/PG_VERSION ]; then
  mkdir -p .pgdata
  sudo chown -R postgres:postgres .pgdata 2>/dev/null || true
  sudo -u postgres "$PG_BIN/initdb" -D "$PWD/.pgdata" -E UTF8 --auth-local=trust --auth-host=trust
fi
if ! sudo -u postgres "$PG_BIN/pg_ctl" -D "$PWD/.pgdata" status >/dev/null 2>&1; then
  sudo -u postgres "$PG_BIN/pg_ctl" -D "$PWD/.pgdata" -l /tmp/claims-pg.log -o "-c listen_addresses=localhost -p 5432" start
fi
sudo -u postgres "$PG_BIN/createdb" claims_engine 2>/dev/null || true

# --- Backend ---
cd backend
yarn install
yarn prisma:generate
yarn prisma:migrate
yarn seed
cd ..

# --- Frontend ---
cd frontend && yarn install && cd ..

echo ""
echo "Stack ready. Start services with:"
echo "  cd backend  && yarn start:dev   # http://localhost:8001"
echo "  cd frontend && yarn dev         # http://localhost:3000"
