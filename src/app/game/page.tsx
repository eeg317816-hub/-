"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { GameEvent } from "@/lib/scoring";
import { getSession } from "@/lib/client";
import { GameShell } from "@/components/GameShell";
import { ScoreFloatLayer, type FloatItem } from "@/components/ScoreFloat";
import { playSfx } from "@/lib/sfx";

const KEY_POOL = ["Q", "W", "E", "R", "A", "S", "D", "F"];
const BASE_HIT = 10;
const MISS_PENALTY = 15;

type Target = {
  id: string;
  type: "mouse" | "keyboard";
  key?: string;
  x: number;
  y: number;
  spawnAt: number;
};

type PlayInfo = {
  sessionId: number;
  durationSeconds: number;
  lifeCount: number;
  practiceOnly?: boolean;
  message?: string | null;
};

function comboBonus(combo: number) {
  if (combo >= 50) return 25;
  if (combo >= 30) return 20;
  if (combo >= 20) return 15;
  if (combo >= 10) return 10;
  if (combo >= 5) return 5;
  return 0;
}

export default function GamePage() {
  const router = useRouter();
  const boxRef = useRef<HTMLDivElement>(null);
  const [play, setPlay] = useState<PlayInfo | null>(null);
  const [running, setRunning] = useState(false);
  const [remain, setRemain] = useState(30);
  const [life, setLife] = useState(3);
  const [target, setTarget] = useState<Target | null>(null);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [maxApm, setMaxApm] = useState(0);
  const [mouseOk, setMouseOk] = useState(0);
  const [mouseErr, setMouseErr] = useState(0);
  const [keyOk, setKeyOk] = useState(0);
  const [keyErr, setKeyErr] = useState(0);
  const [floats, setFloats] = useState<FloatItem[]>([]);
  const eventsRef = useRef<GameEvent[]>([]);
  const statsRef = useRef({
    mouseOk: 0,
    mouseErr: 0,
    keyOk: 0,
    keyErr: 0,
    combo: 0,
    maxCombo: 0,
    maxApm: 0,
    life: 3,
  });
  const targetRef = useRef<Target | null>(null);
  const endedRef = useRef(false);

  const pushFloat = useCallback((item: Omit<FloatItem, "id">) => {
    const id = crypto.randomUUID();
    setFloats((prev) => [...prev.slice(-18), { ...item, id }]);
    window.setTimeout(() => {
      setFloats((prev) => prev.filter((f) => f.id !== id));
    }, 700);
  }, []);

  useEffect(() => {
    const raw = sessionStorage.getItem("qzgs_play");
    const s = getSession();
    if (!raw || !s.playerId) {
      router.replace("/");
      return;
    }
    const info = JSON.parse(raw) as PlayInfo;
    setPlay(info);
    setRemain(info.durationSeconds);
    setLife(info.lifeCount);
    statsRef.current.life = info.lifeCount;
  }, [router]);

  const spawn = useCallback(() => {
    const box = boxRef.current;
    if (!box) return;
    const w = box.clientWidth - 120;
    const h = box.clientHeight - 120;
    const x = Math.floor(Math.random() * Math.max(w, 1)) + 30;
    const y = Math.floor(Math.random() * Math.max(h, 1)) + 60;
    const isMouse = Math.random() > 0.45;
    const next: Target = isMouse
      ? { id: crypto.randomUUID(), type: "mouse", x, y, spawnAt: Date.now() }
      : {
          id: crypto.randomUUID(),
          type: "keyboard",
          key: KEY_POOL[Math.floor(Math.random() * KEY_POOL.length)],
          x,
          y,
          spawnAt: Date.now(),
        };
    targetRef.current = next;
    setTarget(next);
  }, []);

  const finish = useCallback(() => {
    if (endedRef.current || !play) return;
    endedRef.current = true;
    setRunning(false);
    const s = statsRef.current;
    const correct = s.mouseOk + s.keyOk;
    const error = s.mouseErr + s.keyErr;
    const total = correct + error;
    const duration = play.durationSeconds;
    const apm = Math.round((correct / Math.max(1, duration)) * 60);
    const accuracy = total === 0 ? 0 : Math.round((correct / total) * 10000) / 100;
    const reactions = eventsRef.current
      .filter((e) => e.correct)
      .map((e) => e.t - e.targetSpawnAt);
    const avgReactionMs =
      reactions.length === 0
        ? 0
        : Math.round(reactions.reduce((a, b) => a + b, 0) / reactions.length);

    const session = getSession();
    sessionStorage.setItem(
      "qzgs_result_payload",
      JSON.stringify({
        sessionId: play.sessionId,
        playerId: session.playerId,
        score: 0,
        apm,
        maxApm: Math.max(s.maxApm, apm),
        accuracy,
        correctCount: correct,
        errorCount: error,
        mouseCorrect: s.mouseOk,
        mouseError: s.mouseErr,
        keyboardCorrect: s.keyOk,
        keyboardError: s.keyErr,
        maxCombo: s.maxCombo,
        avgReactionMs,
        lifeLeft: s.life,
        events: eventsRef.current,
      }),
    );
    // 避免在 setState 更新链路中同步触发 Router 更新
    window.setTimeout(() => {
      router.push("/result");
    }, 0);
  }, [play, router]);

  const fail = useCallback(
    (partial: Partial<GameEvent>, at?: { x: number; y: number }) => {
      const t = targetRef.current;
      if (!t) return;
      const s = statsRef.current;
      s.combo = 0;
      setCombo(0);
      if (partial.targetType === "mouse" || partial.action === "click") {
        s.mouseErr++;
        setMouseErr(s.mouseErr);
      } else {
        s.keyErr++;
        setKeyErr(s.keyErr);
      }
      eventsRef.current.push({
        t: Date.now(),
        targetId: t.id,
        targetType: t.type,
        expectedKey: t.key,
        action: partial.action || "keydown",
        key: partial.key,
        correct: false,
        targetSpawnAt: t.spawnAt,
      });
      playSfx("miss", 0.4);
      pushFloat({
        x: (at?.x ?? t.x) + 40,
        y: (at?.y ?? t.y) + 20,
        text: `-${MISS_PENALTY}`,
        kind: "minus",
      });
      s.life -= 1;
      setLife(s.life);
      if (s.life <= 0) finish();
    },
    [finish, pushFloat],
  );

  const succeed = useCallback(
    (action: "click" | "keydown", key?: string) => {
      const t = targetRef.current;
      if (!t) return;
      const s = statsRef.current;
      s.combo += 1;
      s.maxCombo = Math.max(s.maxCombo, s.combo);
      setCombo(s.combo);
      setMaxCombo(s.maxCombo);
      if (t.type === "mouse") {
        s.mouseOk++;
        setMouseOk(s.mouseOk);
      } else {
        s.keyOk++;
        setKeyOk(s.keyOk);
      }
      eventsRef.current.push({
        t: Date.now(),
        targetId: t.id,
        targetType: t.type,
        expectedKey: t.key,
        action,
        key,
        correct: true,
        targetSpawnAt: t.spawnAt,
      });

      const bonus = comboBonus(s.combo);
      const gained = BASE_HIT + bonus;
      playSfx(bonus > 0 ? "combo" : "hit", bonus > 0 ? 0.5 : 0.35);
      pushFloat({
        x: t.x + 40,
        y: t.y + 10,
        text: `+${BASE_HIT}`,
        kind: "plus",
      });
      if (bonus > 0) {
        pushFloat({
          x: t.x + 70,
          y: t.y + 42,
          text: `COMBO +${bonus}`,
          kind: "combo",
        });
      }
      spawn();
    },
    [spawn, pushFloat],
  );

  useEffect(() => {
    if (!running || !play) return;
    const timer = window.setInterval(() => {
      setRemain((r) => Math.max(r - 1, 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [running, play]);

  useEffect(() => {
    if (!running) return;
    if (remain !== 0) return;
    finish();
  }, [running, remain, finish]);

  useEffect(() => {
    if (!running) return;
    const onKey = (e: KeyboardEvent) => {
      const t = targetRef.current;
      if (!t) return;
      const k = e.key.toUpperCase();
      if (t.type === "keyboard") {
        if (k === t.key) succeed("keydown", k);
        else fail({ action: "keydown", key: k, targetType: "keyboard" });
        return;
      }
      if (KEY_POOL.includes(k) || e.key.length === 1) {
        fail({ action: "keydown", key: k, targetType: "mouse" });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [running, succeed, fail]);

  function startGame() {
    endedRef.current = false;
    eventsRef.current = [];
    statsRef.current = {
      mouseOk: 0,
      mouseErr: 0,
      keyOk: 0,
      keyErr: 0,
      combo: 0,
      maxCombo: 0,
      maxApm: 0,
      life: play?.lifeCount || 3,
    };
    setMouseOk(0);
    setMouseErr(0);
    setKeyOk(0);
    setKeyErr(0);
    setCombo(0);
    setMaxCombo(0);
    setMaxApm(0);
    setFloats([]);
    setLife(play?.lifeCount || 3);
    setRemain(play?.durationSeconds || 30);
    setRunning(true);
    playSfx("whoosh", 0.35);
    spawn();
    boxRef.current?.focus();
  }

  const correct = mouseOk + keyOk;
  const errors = mouseErr + keyErr;
  const elapsed = (play?.durationSeconds || 30) - remain;
  const apm = elapsed > 0 ? Math.round((correct / elapsed) * 60) : 0;
  useEffect(() => {
    if (apm > maxApm) {
      setMaxApm(apm);
      statsRef.current.maxApm = apm;
    }
  }, [apm, maxApm]);
  const accuracy = correct + errors === 0 ? 0 : correct / (correct + errors);

  if (!play) {
    return (
      <GameShell>
        <div className="flex min-h-screen items-center justify-center text-[#aaa]">
          加载中…
        </div>
      </GameShell>
    );
  }

  return (
    <GameShell scene="arena">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-4 md:px-6">
        <header className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-[#ff334450] pb-3">
          <div>
            <h1 className="font-display title-glow text-2xl tracking-wider text-[#ffe9a8] md:text-3xl">
              全职高手 · 手速挑战
            </h1>
            <p className="text-sm text-[#aaa]">
              {play.durationSeconds}s
              {play.practiceOnly && <span className="ml-2 text-[#ffaa66]">练习局</span>}
            </p>
          </div>
          <div className="flex gap-2 text-2xl">
            {Array.from({ length: play.lifeCount }).map((_, i) => (
              <span key={i} className={i < life ? "text-[#ff3344]" : "text-[#444]"}>
                ❤
              </span>
            ))}
          </div>
        </header>

        <div className="grid flex-1 gap-4 md:grid-cols-[240px_1fr]">
          <aside className="panel-glow space-y-3 rounded-xl p-4">
            <Stat label="实时 APM" value={apm} />
            <Stat label="峰值 APM" value={maxApm} />
            <Stat label="Combo" value={combo} highlight />
            <Stat label="最大连击" value={maxCombo} />
            <Stat label="正确率" value={`${Math.round(accuracy * 100)}%`} />
            <Stat label="正确 / 失误" value={`${correct} / ${errors}`} />
            <Stat label="剩余时间" value={remain} />
          </aside>

          <div
            ref={boxRef}
            tabIndex={0}
            className="panel-glow relative min-h-[420px] overflow-hidden rounded-xl outline-none"
            onClick={(e) => {
              if (!running || !target) return;
              const rect = boxRef.current?.getBoundingClientRect();
              const at = rect
                ? { x: e.clientX - rect.left, y: e.clientY - rect.top }
                : undefined;
              if (target.type === "keyboard") {
                fail({ action: "click", targetType: "keyboard" }, at);
                return;
              }
              if (e.target === boxRef.current) {
                fail({ action: "click", targetType: "mouse" }, at);
              }
            }}
          >
            <ScoreFloatLayer items={floats} />

            {!running && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center">
                <h2 className="font-display mb-2 text-3xl text-[#ffe9a8]">键鼠交替手速挑战</h2>
                <p className="mb-6 text-[#aaa]">红点点鼠标，字母按对应键；跨类型扣血</p>
                {play.message && <p className="mb-4 text-[#ffaa66]">{play.message}</p>}
                <button type="button" onClick={startGame} className="btn-game rounded-lg px-10 py-3 text-lg font-semibold">
                  开始测试
                </button>
              </div>
            )}

            {running && (
              <div className="font-tech absolute left-1/2 top-4 -translate-x-1/2 text-5xl font-bold text-[#ff3344] drop-shadow-[0_0_12px_#ff3344]">
                {remain}
              </div>
            )}

            {running && target?.type === "mouse" && (
              <button
                type="button"
                className="absolute h-[60px] w-[60px] rounded-full bg-[radial-gradient(#fff,#ff3344)] shadow-[0_0_20px_#ff3344]"
                style={{ left: target.x, top: target.y }}
                onClick={(e) => {
                  e.stopPropagation();
                  succeed("click");
                }}
              />
            )}

            {running && target?.type === "keyboard" && (
              <div
                className="absolute flex h-[100px] w-[100px] items-center justify-center rounded-lg border-[3px] border-[#ffd56a] bg-[#1a1018]/90 text-4xl font-bold text-[#ffe9a8] shadow-[0_0_20px_rgba(255,213,106,0.35)]"
                style={{ left: target.x, top: target.y }}
              >
                {target.key}
              </div>
            )}
          </div>
        </div>
      </div>
    </GameShell>
  );
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string | number;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between border-b border-[#ffffff14] py-2">
      <span className="text-[#999]">{label}</span>
      <span className={`text-lg font-bold ${highlight ? "text-[#ffd56a]" : ""}`}>{value}</span>
    </div>
  );
}
