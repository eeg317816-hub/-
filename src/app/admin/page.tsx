"use client";

import { useEffect, useState } from "react";
import { apiUrl } from "@/lib/public-env";

type SessionRow = {
  id: number;
  score: number;
  apm: number;
  accuracy: number;
  maxCombo: number;
  rankLevel: string;
  isValid: boolean;
  cheatFlag: boolean;
  deviceCode: string | null;
  player: { nickname: string; phone: string };
  createdAt: string;
};

type TerminalRow = {
  id: number;
  terminalCode: string;
  status: string;
  nickname: string | null;
  phone: string | null;
  startedAt: string;
  lastHeartbeat: string;
  expiresAt: string;
  gameSessionId: number | null;
};

async function readJson(res: Response) {
  const text = await res.text();
  if (!text) throw new Error(`接口返回为空，HTTP ${res.status}`);
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`接口返回不是合法 JSON（HTTP ${res.status}）：${text.slice(0, 120)}`);
  }
}

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [map, setMap] = useState<Record<string, string>>({});
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [terminals, setTerminals] = useState<TerminalRow[]>([]);
  const [msg, setMsg] = useState("");
  const [phone, setPhone] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [tab, setTab] = useState<"config" | "sessions" | "terminals">("terminals");

  async function login(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch(apiUrl("/api/admin/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const json = await readJson(res);
      if (!json.success) {
        setMsg(json.error || "登录失败");
        return;
      }
      setAuthed(true);
      setMsg("");
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "登录失败");
    }
  }

  async function loadSessions() {
    const params = new URLSearchParams({ limit: "200" });
    if (phone.trim()) params.set("phone", phone.trim());
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const res = await fetch(apiUrl(`/api/admin/sessions?${params}`));
    const s = await readJson(res);
    if (s.success) setSessions(s.sessions || []);
  }

  async function loadTerminals() {
    const res = await fetch(apiUrl("/api/admin/terminals"));
    const json = await readJson(res);
    if (json.success) setTerminals(json.terminals || []);
  }

  async function load() {
    try {
      const res = await fetch(apiUrl("/api/admin/config"));
      const c = await readJson(res);
      if (c.success) setMap(c.map || {});
      else setMsg(c.error || "读取配置失败");
      await Promise.all([loadSessions(), loadTerminals()]);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "加载失败");
    }
  }

  useEffect(() => {
    if (authed) void load();
  }, [authed]);

  useEffect(() => {
    if (!authed || tab !== "terminals") return;
    const t = setInterval(() => void loadTerminals(), 5000);
    return () => clearInterval(t);
  }, [authed, tab]);

  async function saveConfig() {
    try {
      const res = await fetch(apiUrl("/api/admin/config"), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(map),
      });
      const json = await readJson(res);
      if (json.success) {
        if (json.map) setMap(json.map);
        setMsg("配置已保存");
      } else setMsg(json.error || "保存失败");
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "保存配置失败");
    }
  }

  async function clearBoard(type: "today" | "all") {
    try {
      const res = await fetch(apiUrl("/api/admin/leaderboard/clear"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      const json = await readJson(res);
      setMsg(json.success ? `已作废 ${json.invalidated} 条成绩` : json.error || "清榜失败");
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "清榜失败");
    }
  }

  async function removeSession(id: number) {
    try {
      const res = await fetch(apiUrl(`/api/admin/sessions?id=${id}`), { method: "DELETE" });
      const json = await readJson(res);
      setMsg(json.success ? "已删除" : json.error || "删除失败");
      void loadSessions();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "删除失败");
    }
  }

  async function forceRelease(id: number) {
    try {
      const res = await fetch(apiUrl("/api/admin/terminals"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "force_release", terminalSessionId: id }),
      });
      const json = await readJson(res);
      setMsg(json.success ? `已强制释放 ${json.terminalCode}` : json.error || "释放失败");
      void loadTerminals();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "释放失败");
    }
  }

  if (!authed) {
    return (
      <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6 bg-[#050508] text-white">
        <h1 className="mb-6 font-display text-2xl font-bold text-[#ff3b45]">运营后台</h1>
        <form onSubmit={login} className="space-y-3">
          <input
            className="hud-input"
            placeholder="管理员账号"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
          />
          <input
            type="password"
            className="hud-input"
            placeholder="密码"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
          {msg && <p className="text-[#ff7777]">{msg}</p>}
          <button type="submit" className="btn-game w-full rounded-md py-2">
            登录
          </button>
        </form>
      </main>
    );
  }

  const csvHref = (() => {
    const params = new URLSearchParams({ format: "csv", limit: "1000" });
    if (phone.trim()) params.set("phone", phone.trim());
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    return apiUrl(`/api/admin/sessions?${params}`);
  })();

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-8 text-white bg-[#050508]">
      <h1 className="mb-6 font-display text-3xl font-bold text-[#ff3b45]">运营后台</h1>
      {msg && <p className="mb-4 text-[#ffaa66]">{msg}</p>}

      <div className="mb-6 flex flex-wrap gap-2">
        {(
          [
            ["terminals", "终端管理"],
            ["config", "活动配置"],
            ["sessions", "成绩记录"],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => setTab(k)}
            className={`rounded-md px-4 py-2 ${tab === k ? "btn-game" : "hud-frame"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "terminals" && (
        <section className="hud-frame mb-8 p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl">终端管理</h2>
            <button type="button" className="text-sm underline text-[#aaa]" onClick={() => void loadTerminals()}>
              刷新
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-[#333] text-[#aaa]">
                  <th className="px-2 py-2">终端编号</th>
                  <th className="px-2 py-2">当前状态</th>
                  <th className="px-2 py-2">当前用户</th>
                  <th className="px-2 py-2">会话开始</th>
                  <th className="px-2 py-2">最后心跳</th>
                  <th className="px-2 py-2">操作</th>
                </tr>
              </thead>
              <tbody>
                {terminals.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-2 py-6 text-center text-[#666]">
                      暂无终端会话
                    </td>
                  </tr>
                )}
                {terminals.map((t) => (
                  <tr key={t.id} className="border-b border-[#222]">
                    <td className="px-2 py-2 font-tech">{t.terminalCode}</td>
                    <td className="px-2 py-2">{t.status}</td>
                    <td className="px-2 py-2">{t.nickname || "-"}</td>
                    <td className="whitespace-nowrap px-2 py-2">
                      {new Date(t.startedAt).toLocaleTimeString()}
                    </td>
                    <td className="whitespace-nowrap px-2 py-2">
                      {new Date(t.lastHeartbeat).toLocaleTimeString()}
                    </td>
                    <td className="px-2 py-2">
                      {!["EXPIRED", "ABORTED"].includes(t.status) && (
                        <button
                          type="button"
                          className="text-[#ff7777] underline"
                          onClick={() => void forceRelease(t.id)}
                        >
                          强制释放
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {tab === "config" && (
        <section className="hud-frame mb-8 p-5">
          <h2 className="mb-4 text-xl">活动配置</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {[
              ["daily_play_limit", "每日挑战次数"],
              ["default_duration_seconds", "默认时长(秒)"],
              ["life_count", "生命值"],
              ["activity_enabled", "活动开启 true/false"],
              ["leaderboard_valid_only", "仅展示有效成绩 true/false"],
            ].map(([key, label]) => (
              <label key={key} className="text-sm">
                {label}
                <input
                  className="hud-input mt-1"
                  value={map[key] ?? ""}
                  onChange={(e) => setMap({ ...map, [key]: e.target.value })}
                />
              </label>
            ))}
          </div>
          <button type="button" onClick={saveConfig} className="btn-game mt-4 rounded-md px-4 py-2">
            保存配置
          </button>
          <div className="mt-6 flex flex-wrap gap-2">
            <button type="button" className="hud-frame px-4 py-2" onClick={() => clearBoard("today")}>
              清今日榜
            </button>
            <button type="button" className="hud-frame px-4 py-2" onClick={() => clearBoard("all")}>
              清总榜
            </button>
          </div>
        </section>
      )}

      {tab === "sessions" && (
        <section className="hud-frame mb-8 p-5">
          <h2 className="mb-4 text-xl">最近成绩</h2>
          <div className="mb-4 flex flex-wrap items-end gap-3">
            <label className="text-sm">
              手机号
              <input className="hud-input mt-1" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </label>
            <label className="text-sm">
              开始日期
              <input type="date" className="hud-input mt-1" value={from} onChange={(e) => setFrom(e.target.value)} />
            </label>
            <label className="text-sm">
              结束日期
              <input type="date" className="hud-input mt-1" value={to} onChange={(e) => setTo(e.target.value)} />
            </label>
            <button type="button" className="btn-game rounded-md px-4 py-2" onClick={() => void loadSessions()}>
              查询
            </button>
            <a className="hud-frame px-4 py-2" href={csvHref}>
              导出 CSV
            </a>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-[#333] text-[#aaa]">
                  <th className="px-2 py-2">时间</th>
                  <th className="px-2 py-2">昵称</th>
                  <th className="px-2 py-2">手机号</th>
                  <th className="px-2 py-2">分数</th>
                  <th className="px-2 py-2">段位</th>
                  <th className="px-2 py-2">APM</th>
                  <th className="px-2 py-2">正确率</th>
                  <th className="px-2 py-2">连击</th>
                  <th className="px-2 py-2">设备</th>
                  <th className="px-2 py-2">状态</th>
                  <th className="px-2 py-2">操作</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => (
                  <tr key={s.id} className="border-b border-[#222]">
                    <td className="whitespace-nowrap px-2 py-2">
                      {new Date(s.createdAt).toLocaleString()}
                    </td>
                    <td className="px-2 py-2">{s.player.nickname}</td>
                    <td className="px-2 py-2">{s.player.phone}</td>
                    <td className="px-2 py-2 font-semibold">{s.score}</td>
                    <td className="px-2 py-2">{s.rankLevel}</td>
                    <td className="px-2 py-2">{s.apm}</td>
                    <td className="px-2 py-2">{s.accuracy}%</td>
                    <td className="px-2 py-2">{s.maxCombo}</td>
                    <td className="px-2 py-2">{s.deviceCode || "-"}</td>
                    <td className="px-2 py-2">
                      {s.isValid && !s.cheatFlag ? (
                        <span className="text-[#7CFFB2]">有效</span>
                      ) : (
                        <span className="text-[#888]">无效</span>
                      )}
                    </td>
                    <td className="px-2 py-2">
                      <button type="button" className="text-[#ff7777] underline" onClick={() => removeSession(s.id)}>
                        删除
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </main>
  );
}
