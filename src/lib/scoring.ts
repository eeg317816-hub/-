export type GameEvent = {
  t: number;
  targetId: string;
  targetType: "mouse" | "keyboard";
  expectedKey?: string;
  action: "click" | "keydown";
  key?: string;
  correct: boolean;
  targetSpawnAt: number;
};

export type ComputedMetrics = {
  score: number;
  apm: number;
  maxApm: number;
  accuracy: number; // percentage 0-100
  maxCombo: number;
  correctCount: number;
  errorCount: number;
  mouseCorrect: number;
  mouseError: number;
  keyboardCorrect: number;
  keyboardError: number;
  avgReactionMs: number;
  rankLevel: string;
  rankTitle: string;
  comment: string;
  cheatFlag: boolean;
  cheatReason: string | null;
};

export const RANK_RULES = [
  { level: "C", title: "新人训练生", min: 0, max: 199, comment: "刚入门，操作节奏较慢，失误较多。" },
  { level: "B", title: "网吧高手", min: 200, max: 399, comment: "有一定手速，能完成基础键鼠反应。" },
  { level: "A", title: "战队预备役", min: 400, max: 599, comment: "反应快，正确率较高，连击能力不错。" },
  { level: "S", title: "职业选手", min: 600, max: 799, comment: "你的反应和稳定性已经达到职业训练水平。" },
  { level: "SS", title: "全明星级", min: 800, max: 999, comment: "极少数玩家能达到，适合展会冲榜。" },
  { level: "SSS", title: "荣耀教科书", min: 1000, max: null as number | null, comment: "顶级表现，不愧为荣耀教科书。" },
];

export function resolveRank(score: number) {
  const sorted = [...RANK_RULES].sort((a, b) => b.min - a.min);
  for (const r of sorted) {
    if (score >= r.min) {
      return { level: r.level, title: r.title, comment: r.comment };
    }
  }
  const c = RANK_RULES[0];
  return { level: c.level, title: c.title, comment: c.comment };
}

function accuracyBonus(accRatio: number) {
  if (accRatio >= 0.98) return 150;
  if (accRatio >= 0.95) return 100;
  if (accRatio >= 0.9) return 60;
  if (accRatio >= 0.8) return 20;
  return 0;
}

function reactionBonus(ms: number) {
  if (ms > 0 && ms <= 250) return 150;
  if (ms > 0 && ms <= 350) return 100;
  if (ms > 0 && ms <= 500) return 50;
  return 0;
}

function apmBonus(apm: number) {
  if (apm >= 400) return 150;
  if (apm >= 300) return 100;
  if (apm >= 200) return 60;
  if (apm >= 120) return 20;
  return 0;
}

export function computeScore(input: {
  correctCount: number;
  errorCount: number;
  maxCombo: number;
  avgReactionMs: number;
  apm: number;
}) {
  const total = input.correctCount + input.errorCount;
  const accRatio = total === 0 ? 0 : input.correctCount / total;
  const score = Math.max(
    0,
    input.correctCount * 10 +
      input.maxCombo * 5 +
      accuracyBonus(accRatio) +
      reactionBonus(input.avgReactionMs) +
      apmBonus(input.apm) -
      input.errorCount * 15,
  );
  return { score, accuracyPct: Math.round(accRatio * 10000) / 100 };
}

export function computeFromEvents(params: {
  events: GameEvent[];
  durationSeconds: number;
  maxApmHint?: number;
}): ComputedMetrics {
  let correctCount = 0;
  let errorCount = 0;
  let mouseCorrect = 0;
  let mouseError = 0;
  let keyboardCorrect = 0;
  let keyboardError = 0;
  let maxCombo = 0;
  let combo = 0;
  const reactions: number[] = [];

  for (const ev of params.events) {
    if (ev.correct) {
      correctCount++;
      combo++;
      maxCombo = Math.max(maxCombo, combo);
      reactions.push(Math.max(0, ev.t - ev.targetSpawnAt));
      if (ev.targetType === "mouse") mouseCorrect++;
      else keyboardCorrect++;
    } else {
      errorCount++;
      combo = 0;
      if (ev.targetType === "mouse" || ev.action === "click") mouseError++;
      else keyboardError++;
    }
  }

  const elapsed = Math.max(1, params.durationSeconds);
  const apm = Math.round((correctCount / elapsed) * 60);
  const avgReactionMs =
    reactions.length === 0
      ? 0
      : Math.round(reactions.reduce((a, b) => a + b, 0) / reactions.length);
  const { score, accuracyPct } = computeScore({
    correctCount,
    errorCount,
    maxCombo,
    avgReactionMs,
    apm,
  });
  const rank = resolveRank(score);

  const reasons: string[] = [];
  if (apm > 600) reasons.push(`APM超限:${apm}`);
  if (avgReactionMs > 0 && avgReactionMs < 80) reasons.push(`反应过快:${avgReactionMs}ms`);
  if (accuracyPct >= 100 && avgReactionMs > 0 && avgReactionMs < 100 && correctCount >= 20) {
    reasons.push("满分且反应异常偏低");
  }

  return {
    score,
    apm,
    maxApm: Math.max(params.maxApmHint ?? 0, apm),
    accuracy: accuracyPct,
    maxCombo,
    correctCount,
    errorCount,
    mouseCorrect,
    mouseError,
    keyboardCorrect,
    keyboardError,
    avgReactionMs,
    rankLevel: rank.level,
    rankTitle: rank.title,
    comment: rank.comment,
    cheatFlag: reasons.length > 0,
    cheatReason: reasons.length ? reasons.join("；") : null,
  };
}

export function computeFromSummary(body: {
  correctCount: number;
  errorCount: number;
  maxCombo: number;
  avgReactionMs?: number | null;
  apm: number;
  maxApm?: number;
  mouseCorrect: number;
  mouseError: number;
  keyboardCorrect: number;
  keyboardError: number;
  claimedScore?: number;
}): ComputedMetrics {
  const avgReactionMs = body.avgReactionMs ?? 0;
  const { score, accuracyPct } = computeScore({
    correctCount: body.correctCount,
    errorCount: body.errorCount,
    maxCombo: body.maxCombo,
    avgReactionMs,
    apm: body.apm,
  });
  const rank = resolveRank(score);
  const reasons: string[] = [];
  if (body.apm > 600) reasons.push(`APM超限:${body.apm}`);
  if (avgReactionMs > 0 && avgReactionMs < 80) reasons.push(`反应过快:${avgReactionMs}ms`);
  if (
    typeof body.claimedScore === "number" &&
    Math.abs(body.claimedScore - score) > 30
  ) {
    reasons.push("前端分数与后端重算偏差过大");
  }
  return {
    score,
    apm: body.apm,
    maxApm: Math.max(body.maxApm ?? 0, body.apm),
    accuracy: accuracyPct,
    maxCombo: body.maxCombo,
    correctCount: body.correctCount,
    errorCount: body.errorCount,
    mouseCorrect: body.mouseCorrect,
    mouseError: body.mouseError,
    keyboardCorrect: body.keyboardCorrect,
    keyboardError: body.keyboardError,
    avgReactionMs,
    rankLevel: rank.level,
    rankTitle: rank.title,
    comment: rank.comment,
    cheatFlag: reasons.length > 0,
    cheatReason: reasons.length ? reasons.join("；") : null,
  };
}
