#!/bin/sh
set -e

PORT="${PORT:-3000}"
HOSTNAME="${HOSTNAME:-0.0.0.0}"

if [ -z "$DATABASE_URL" ]; then
  echo "[start] 缺少 DATABASE_URL，请在平台 Variables 里配置 Postgres 连接串"
  exit 1
fi

if [ -z "$ADMIN_JWT_SECRET" ]; then
  echo "[start] 缺少 ADMIN_JWT_SECRET，请在平台 Variables 里配置"
  exit 1
fi

echo "[start] 同步数据库结构..."
npx prisma db push --skip-generate

if [ -n "$ADMIN_SEED_PASSWORD" ]; then
  echo "[start] 写入管理员种子账号..."
  npx tsx prisma/seed.ts || echo "[start] seed 跳过或已存在"
fi

echo "[start] 启动 Next.js 于 ${HOSTNAME}:${PORT}"
# Next standalone / Zeabur：优先读环境变量 PORT、HOSTNAME
export PORT
export HOSTNAME
if [ -f "./server.js" ]; then
  exec node server.js
fi
exec npx next start -H "$HOSTNAME" -p "$PORT"
