import { prisma } from "@/lib/db";
import { assertRuntimeEnv, getAppEnv } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function GET() {
  const missing = assertRuntimeEnv();
  const timestamp = new Date().toISOString();
  let database: "connected" | "disconnected" = "disconnected";
  try {
    await prisma.$queryRaw`SELECT 1`;
    database = "connected";
  } catch (err) {
    console.error("[health] 数据库连接失败:", err);
  }

  const ok = database === "connected" && missing.length === 0;
  const body = {
    status: ok ? "ok" : "degraded",
    database,
    env: getAppEnv(),
    timestamp,
    missingEnv: missing,
  };

  return Response.json(body, { status: ok ? 200 : 503 });
}
