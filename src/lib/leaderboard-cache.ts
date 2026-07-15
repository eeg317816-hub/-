export type DisplayBoardPayload = {
  list: Array<{
    rank: number;
    playerId: number;
    nickname: string;
    phoneMasked: string;
    score: number;
    rankLevel: string;
    rankTitle: string;
    apm: number;
    accuracy: number;
    maxCombo: number;
    createdAt: string;
  }>;
  total: number;
  version: string;
  updatedAt: number;
  type: "today" | "all";
};

type CacheEntry = {
  expiresAt: number;
  payload: DisplayBoardPayload;
};

const TTL_MS = 12_000;
const store = new Map<string, CacheEntry>();

export function getCachedDisplayBoard(type: "today" | "all"): DisplayBoardPayload | null {
  const hit = store.get(type);
  if (!hit) return null;
  if (Date.now() > hit.expiresAt) {
    store.delete(type);
    return null;
  }
  return hit.payload;
}

export function setCachedDisplayBoard(payload: DisplayBoardPayload) {
  store.set(payload.type, {
    expiresAt: Date.now() + TTL_MS,
    payload,
  });
}

/** 提交成功 / 清榜时主动失效 */
export function invalidateLeaderboardCache(type?: "today" | "all") {
  if (!type) {
    store.clear();
    return;
  }
  store.delete(type);
}
