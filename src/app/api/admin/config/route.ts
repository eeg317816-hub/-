import { prisma } from "@/lib/db";
import { fail, ok } from "@/lib/api";
import { requireAdmin } from "@/lib/admin";
import { setConfig } from "@/lib/config";

export async function GET(req: Request) {
  try {
    await requireAdmin(req);
  } catch {
    return fail("未授权", 401);
  }
  const rows = await prisma.gameConfig.findMany({ orderBy: { id: "asc" } });
  const map: Record<string, string> = {};
  for (const r of rows) map[r.configKey] = r.configValue;
  return ok({ configs: rows, map });
}

export async function PUT(req: Request) {
  try {
    await requireAdmin(req);
  } catch {
    return fail("未授权", 401);
  }
  const body = await req.json().catch(() => ({}));
  const allowed = [
    "daily_play_limit",
    "default_duration_seconds",
    "life_count",
    "activity_enabled",
    "leaderboard_valid_only",
  ];
  for (const key of allowed) {
    if (body[key] !== undefined) {
      await setConfig(key, String(body[key]));
    }
  }
  const rows = await prisma.gameConfig.findMany();
  return ok({ configs: rows });
}
