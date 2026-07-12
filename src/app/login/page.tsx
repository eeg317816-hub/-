"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { clearSession, getSession, saveSession } from "@/lib/client";
import { GameShell } from "@/components/GameShell";
import { playSfx } from "@/lib/sfx";
import { NICKNAME_HINT, validateNickname } from "@/lib/nickname";

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

  function onNicknameChange(value: string) {
    // 仅保留中文/字母/数字，最长 10
    setNickname(value.replace(/[^\u4e00-\u9fffA-Za-z0-9]/g, "").slice(0, 10));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    const nickErr = validateNickname(nickname);
    if (nickErr) {
      setError(nickErr);
      setShake(true);
      setTimeout(() => setShake(false), 450);
      return;
    }
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
        body: JSON.stringify({
          cardId,
          phone,
          nickname: nickname.trim(),
          deviceCode,
        }),
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

  function logout() {
    clearSession();
    playSfx("whoosh", 0.25);
    router.replace("/");
  }

  return (
    <GameShell scene="stage">
      <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 py-10">
        <div className="mb-2 flex items-start justify-between gap-3">
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-display title-glow text-4xl tracking-wider text-[#ffe9a8]"
          >
            选手登记
          </motion.h1>
          <button
            type="button"
            onClick={logout}
            className="rounded-lg border border-[#666] bg-black/30 px-4 py-2 text-sm text-[#ddd] hover:border-[#ff3344] hover:text-white"
          >
            退出
          </button>
        </div>
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
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 11))}
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
              onChange={(e) => onNicknameChange(e.target.value)}
              placeholder="2-10个字符"
              maxLength={10}
              required
            />
            <p className="mt-2 text-xs leading-relaxed text-[#888]">{NICKNAME_HINT}</p>
          </label>
          {error && <p className="text-[#ff7777]">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="btn-game w-full rounded-lg py-3 text-lg font-semibold"
          >
            {loading ? "提交中…" : "进入测手速挑战"}
          </button>
        </motion.form>
      </div>
    </GameShell>
  );
}
