import { fail, ok } from "@/lib/api";
import { getConfigBool } from "@/lib/config";
import { openTerminalSession } from "@/lib/terminal-server";

/**
 * 打开终端会话。不接收、不存储刷卡字符串。
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const deviceCode = String(body?.deviceCode || body?.terminalCode || "PC01").trim();
  if (!deviceCode) return fail("缺少终端编号");

  if (!(await getConfigBool("activity_enabled", true))) {
    return fail("活动未开启", 403);
  }

  try {
    const session = await openTerminalSession(deviceCode);
    return ok({
      terminalSessionId: Number(session.id),
      terminalCode: session.terminalCode,
      status: session.status,
      expiresAt: session.expiresAt.toISOString(),
    });
  } catch (err) {
    console.error("[terminal/open] 失败:", err);
    return fail("无法打开终端会话", 500);
  }
}
