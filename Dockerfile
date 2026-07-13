# Zeabur / Docker / 任意云主机通用（Node 22 Debian）
FROM node:22-bookworm-slim AS deps
WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
# postinstall 会跑 prisma generate，需先有 schema
COPY prisma ./prisma
RUN npm ci

FROM node:22-bookworm-slim AS builder
WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# 明确不带本地密钥进构建环境（.dockerignore 已排除 .env*）
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
# 构建期占位，真正连接串由运行时注入
ENV DATABASE_URL="postgresql://build:build@127.0.0.1:5432/build?schema=public"
RUN npx prisma generate
RUN npm run build

FROM node:22-bookworm-slim AS runner
WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/package-lock.json ./package-lock.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY scripts/start-cloud.sh ./scripts/start-cloud.sh

RUN chmod +x ./scripts/start-cloud.sh \
  && chown -R nextjs:nodejs /app

USER nextjs
EXPOSE 3000
# start-cloud.sh 读取 Zeabur 注入的 PORT / DATABASE_URL / ADMIN_JWT_SECRET
CMD ["./scripts/start-cloud.sh"]
