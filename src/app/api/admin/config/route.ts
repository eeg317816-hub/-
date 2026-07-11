import { prisma } from "@/lib/db";
import { fail, ok } from "@/lib/api";
import { requireAdmin } from "@/lib/admin";
import { setConfig } from "@/lib/config";

function serializeConfigs(
  rows: Array<{
    id: bigint;
    configKey: string;
    configValue: string;
    description: string | null;
    updatedAt: Date;
  }>,
) {
  return rows.map((r) => ({
    id: Number(r.id),
    configKey: r.configKey,
    configValue: r.configValue,
    description: r.description,
    updatedAt: r.updatedAt,
  }));
}

export async function GET(req: Request) {
  try {
    await requireAdmin(req);
  } catch {
    return fail("未授权", 401);
  }
  try {
    const rows = await prisma.gameConfig.findMany({ orderBy: { id: "asc" } });
    const map: Record<string, string> = {};
    for (const r of rows) map[r.configKey] = r.configValue;
    return ok({ configs: serializeConfigs(rows), map });
  } catch (e) {
    console.error("admin config GET", e);
    return fail("读取配置失败", 500);
  }
}

export async function PUT(req: Request) {
  try {
    await requireAdmin(req);
  } catch {
    return fail("未授权", 401);
  }
  try {
    const body = await req.json().catch(() => ({}));
    const allowed = [
      "daily_play_limit",
      "default_duration_seconds",
      "life_count",
      "activity_enabled",
      "leaderboard_valid_only",
    ];
    for (const key of allowed) {
      if (body[key] !== undefined && body[key] !== null) {
        await setConfig(key, String(body[key]));
      }
    }
    const rows = await prisma.gameConfig.findMany({ orderBy: { id: "asc" } });
    const map: Record<string, string> = {};
    for (const r of rows) map[r.configKey] = r.configValue;
    return ok({ configs: serializeConfigs(rows), map });
  } catch (e) {
    console.error("admin config PUT", e);
    return fail("保存配置失败", 500);
  }
}
