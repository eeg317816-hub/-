"use client";

import { FormEvent, KeyboardEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { clearSession, getSession, saveSession } from "@/lib/client";
import { GameShell } from "@/components/GameShell";
import { playSfx } from "@/lib/sfx";
import { NICKNAME_HINT, sanitizeNicknameInput, validateNickname } from "@/lib/nickname";
import { apiUrl } from "@/lib/public-env";
import { useHeartbeat } from "@/hooks/useHeartbeat";
import { getTerminalSessionId, setTerminalState } from "@/lib/terminal-state";

export default function LoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isComposing, setIsComposing] = useState(false);

  useEffect(() => {
    // LOGIN 页：绝不挂载读卡监听；状态切离 WAITING_CARD
    setTerminalState("LOGIN");
    playSfx("whoosh", 0.2);
    if (!getTerminalSessionId()) router.replace("/");
  }, [router]);

  useHeartbeat(true);

  function applyNicknameFinal(raw: string) {
    setNickname(sanitizeNicknameInput(raw));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    // 拼音组合未完成：禁止提交
    if (isComposing) return;
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
      const { deviceCode, cardId } = getSession();
      const terminalSessionId = getTerminalSessionId();
      if (!terminalSessionId) {
        router.replace("/");
        return;
      }
      const res = await fetch(apiUrl("/api/player/register"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone,
          nickname: nickname.trim(),
          deviceCode,
          terminalSessionId,
          cardId: cardId || undefined,
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
        playerId: json.playerId,
        nickname: json.nickname,
        phone: json.phone,
        terminalSessionId: json.terminalSessionId,
      });
      sessionStorage.setItem(
        "qzgs_quota",
        JSON.stringify({
          todayPlayCount: json.todayPlayCount,
          dailyPlayLimit: json.dailyPlayLimit,
          practiceOnly: json.practiceOnly,
        }),
      );
      setTerminalState("READY");
      playSfx("hit", 0.35);
      router.push("/modes");
    } catch {
      setError("网络错误");
    } finally {
      setLoading(false);
    }
  }

  function onFormKeyDown(e: KeyboardEvent<HTMLFormElement>) {
    if (e.nativeEvent.isComposing || e.keyCode === 229) {
      // 组合态 Enter / Space 只用于选词，不提交
      if (e.key === "Enter") e.preventDefault();
      return;
    }
  }

  function logout() {
    clearSession();
    playSfx("whoosh", 0.25);
    router.replace("/");
  }

  return (
    <GameShell scene="hud">
      <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 py-10">
        <div className="mb-2 flex items-start justify-between gap-3">
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-display title-glow text-4xl tracking-wider text-[#ff3b45]"
          >
            选手登记
          </motion.h1>
          <button
            type="button"
            onClick={logout}
            className="hud-frame px-4 py-2 text-sm text-[#ddd] hover:text-white"
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
          onKeyDown={onFormKeyDown}
          className="hud-frame space-y-5 p-6"
        >
          <label className="block">
            <span className="mb-1 block text-sm text-[#aaa]">手机号</span>
            <input
              className="hud-input"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 11))}
              placeholder="11位手机号"
              inputMode="numeric"
              maxLength={11}
              autoComplete="tel"
              required
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm text-[#aaa]">昵称</span>
            <input
              className={`hud-input ${shake ? "shake border-[#ff3344]" : ""}`}
              value={nickname}
              onCompositionStart={() => setIsComposing(true)}
              onCompositionEnd={(e) => {
                setIsComposing(false);
                applyNicknameFinal(e.currentTarget.value);
              }}
              onChange={(e) => {
                const v = e.target.value;
                // 组合中只同步原始值，不 trim/replace/校验
                if (isComposing) {
                  setNickname(v.slice(0, 20));
                  return;
                }
                applyNicknameFinal(v);
              }}
              onKeyDown={(e) => {
                if (e.nativeEvent.isComposing || e.keyCode === 229) return;
              }}
              placeholder="2-10个字符"
              maxLength={isComposing ? 20 : 10}
              autoComplete="off"
              required
            />
            <p className="mt-2 text-xs leading-relaxed text-[#e31c23]/90">
              {NICKNAME_HINT}
            </p>
          </label>
          {error && <p className="text-[#ff7777]">{error}</p>}
          <button
            type="submit"
            disabled={loading || isComposing}
            className="btn-game w-full rounded-md py-3 text-lg font-semibold"
          >
            {loading ? "提交中…" : "进入测手速挑战"}
          </button>
        </motion.form>
      </div>
    </GameShell>
  );
}
