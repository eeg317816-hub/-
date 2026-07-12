import { PrismaClient } from "@prisma/client";
import { assertRuntimeEnv } from "@/lib/env";

const missing = assertRuntimeEnv();
if (missing.length) {
  console.error("[db] 环境变量不完整，数据库功能可能失败:", missing.join(", "));
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["error", "warn"]
        : ["error"],
  });

prisma.$connect().catch((err) => {
  console.error("[db] 初始连接失败，请检查 DATABASE_URL 与 Postgres 是否启动:", err);
});

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
