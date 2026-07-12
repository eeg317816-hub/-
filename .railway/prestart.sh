#!/usr/bin/env bash
set -euo pipefail

# 1. 运行 Prisma 迁移和 seed（此时 Postgres 已就绪）
echo "[prestart] Running Prisma migrations..."
npx prisma migrate deploy

echo "[prestart] Running Prisma seed..."
npx tsx prisma/seed.ts

# 2. 启动 Next.js
echo "[prestart] Starting Next.js..."
exec npm run start
