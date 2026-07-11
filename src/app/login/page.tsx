"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { getSession, saveSession } from "@/lib/client";
import { GameShell } from "@/components/GameShell";
import { playSfx } from "@/lib/sfx";

export default function LoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    playSfx("whoosh", 0.2);
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { cardId, deviceCode } = getSession();
      if (!cardId) {
        router.replace("/");
        return;
      }
      const res = await fetch("/api/player/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardId, phone, nickname, deviceCode }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error || "登录失败");
        if (json.code === "NICKNAME_TAKEN") {
          setShake(true);
          setTimeout(() => setShake(false), 450);
        }
        return;
      }
      saveSession({
        cardId,
        playerId: json.playerId,
        nickname: json.nickname,
        phone: json.phone,
      });
      sessionStorage.setItem(
        "qzgs_quota",
        JSON.stringify({
          todayPlayCount: json.todayPlayCount,
          dailyPlayLimit: json.dailyPlayLimit,
          practiceOnly: json.practiceOnly,
        }),
      );
      playSfx("hit", 0.35);
      router.push("/modes");
    } catch {
      setError("网络错误");
    } finally {
      setLoading(false);
    }
  }

  return (
    <GameShell scene="stage">
      <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 py-10">
        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-display title-glow mb-2 text-4xl tracking-wider text-[#ffe9a8]"
        >
          选手登记
        </motion.h1>
        <p className="mb-8 text-sm text-[#c8c8c8]">
          请记住昵称。再次挑战需手机号与昵称一致；首次将自动注册。
        </p>
        <motion.form
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={onSubmit}
          className="panel-glow space-y-5 rounded-2xl p-6"
        >
          <label className="block">
            <span className="mb-1 block text-sm text-[#aaa]">手机号</span>
            <input
              className="w-full rounded-lg border border-[#ff334440] bg-black/35 px-4 py-3 outline-none focus:border-[#ffd56a]"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="11位手机号"
              inputMode="numeric"
              maxLength={11}
              required
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm text-[#aaa]">昵称</span>
            <input
              className={`w-full rounded-lg border border-[#ff334440] bg-black/35 px-4 py-3 outline-none focus:border-[#ffd56a] ${shake ? "shake border-[#ff3344]" : ""}`}
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="不可与他人重复"
              maxLength={50}
              required
            />
          </label>
          {error && <p className="text-[#ff7777]">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="btn-game w-full rounded-lg py-3 text-lg font-semibold"
          >
            {loading ? "提交中…" : "进入挑战"}
          </button>
        </motion.form>
      </div>
    </GameShell>
  );
}
