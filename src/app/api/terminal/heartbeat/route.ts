import { fail, ok } from "@/lib/api";
import { touchHeartbeat } from "@/lib/terminal-server";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const id = Number(body?.terminalSessionId);
  if (!id) return fail("缺少 terminalSessionId");

  try {
    const result = await touchHeartbeat(BigInt(id));
    if (!result.ok) {
      return ok({ expired: true, status: "EXPIRED" });
    }
    return ok({
      expired: false,
      status: result.session.status,
      expiresAt: result.session.expiresAt.toISOString(),
      lastHeartbeat: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[terminal/heartbeat] 失败:", err);
    return fail("心跳失败", 500);
  }
}
