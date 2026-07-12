#!/usr/bin/env bash
set -euo pipefail

echo "[prestart] Running Prisma migrations..."
npx prisma migrate deploy

echo "[prestart] Seeding database..."
npx tsx prisma/seed.ts

echo "[prestart] Database initialization complete."
