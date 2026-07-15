import { fail, ok } from "@/lib/api";
import { getDisplayLeaderboard, type LeaderboardType } from "@/lib/leaderboard";

/** 大屏 / 展示用：一次返回前 100 名（带短缓存） */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const type = (url.searchParams.get("type") || "all") as LeaderboardType;
    if (type !== "today" && type !== "all") {
      return fail("type 仅支持 today 或 all");
    }
    const data = await getDisplayLeaderboard(type);
    return ok(data);
  } catch (e) {
    console.error("[leaderboard/display GET]", e);
    return fail("排行榜读取失败", 500);
  }
}
