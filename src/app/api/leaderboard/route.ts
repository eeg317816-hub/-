import { fail, ok } from "@/lib/api";
import { getLeaderboardPage, type LeaderboardType } from "@/lib/leaderboard";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const type = (url.searchParams.get("type") || "all") as LeaderboardType;
    if (type !== "today" && type !== "all") {
      return fail("type ??? today ? all");
    }
    const offset = Number(url.searchParams.get("offset") || 0);
    const limit = Number(url.searchParams.get("limit") || 20);
    const nickname = url.searchParams.get("nickname") || undefined;

    const data = await getLeaderboardPage({
      type,
      offset: Number.isFinite(offset) ? offset : 0,
      limit: Number.isFinite(limit) ? limit : 20,
      nickname,
    });

    return ok({ ...data, type });
  } catch (e) {
    console.error("[leaderboard GET]", e);
    return fail("???????", 500);
  }
}
