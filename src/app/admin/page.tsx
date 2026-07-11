"use client";

import { useEffect, useState } from "react";

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

async function readJson(res: Response) {
  const text = await res.text();
  if (!text) {
    throw new Error(`接口返回为空，HTTP ${res.status}`);
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`接口返回不是合法 JSON（HTTP ${res.status}）：${text.slice(0, 120)}`);
  }
}

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin123");
  const [map, setMap] = useState<Record<string, string>>({});
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [msg, setMsg] = useState("");
  const [phone, setPhone] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  async function login(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch("/api/admin/login", {
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
    const res = await fetch(`/api/admin/sessions?${params}`);
    const s = await readJson(res);
    if (s.success) setSessions(s.sessions || []);
  }

  async function load() {
    try {
      const res = await fetch("/api/admin/config");
      const c = await readJson(res);
      if (c.success) setMap(c.map || {});
      else setMsg(c.error || "读取配置失败");
      await loadSessions();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "加载失败");
    }
  }

  useEffect(() => {
    if (authed) void load();
  }, [authed]);

  async function saveConfig() {
    try {
      const res = await fetch("/api/admin/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(map),
      });
      const json = await readJson(res);
      if (json.success) {
        if (json.map) setMap(json.map);
        setMsg("配置已保存");
      } else {
        setMsg(json.error || "保存失败");
      }
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "保存配置失败");
    }
  }

  async function clearBoard(type: "today" | "all") {
    try {
      const res = await fetch("/api/admin/leaderboard/clear", {
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
      const res = await fetch(`/api/admin/sessions?id=${id}`, { method: "DELETE" });
      const json = await readJson(res);
      setMsg(json.success ? "已删除" : json.error || "删除失败");
      void loadSessions();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "删除失败");
    }
  }

  if (!authed) {
    return (
      <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
        <h1 className="mb-6 text-2xl font-bold text-[#ff3344]">后台登录</h1>
        <form onSubmit={login} className="space-y-3">
          <input className="w-full rounded border border-[#333] bg-[#121220] px-3 py-2" value={username} onChange={(e) => setUsername(e.target.value)} />
          <input type="password" className="w-full rounded border border-[#333] bg-[#121220] px-3 py-2" value={password} onChange={(e) => setPassword(e.target.value)} />
          {msg && <p className="text-[#ff7777]">{msg}</p>}
          <button type="submit" className="w-full rounded bg-[#ff3344] py-2">登录</button>
        </form>
      </main>
    );
  }

  const csvHref = (() => {
    const params = new URLSearchParams({ format: "csv", limit: "1000" });
    if (phone.trim()) params.set("phone", phone.trim());
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    return `/api/admin/sessions?${params}`;
  })();

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-8 text-white">
      <h1 className="mb-6 text-3xl font-bold text-[#ff3344]">运营后台</h1>
      {msg && <p className="mb-4 text-[#ffaa66]">{msg}</p>}

      <section className="mb-8 rounded-xl border border-[#333] bg-[#121220] p-5">
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
                className="mt-1 w-full rounded border border-[#333] bg-[#0a0a12] px-3 py-2"
                value={map[key] ?? ""}
                onChange={(e) => setMap({ ...map, [key]: e.target.value })}
              />
            </label>
          ))}
        </div>
        <button type="button" onClick={saveConfig} className="mt-4 rounded bg-[#ff3344] px-4 py-2">
          保存配置
        </button>
      </section>

      <section className="mb-4 flex flex-wrap gap-2">
        <button type="button" className="rounded bg-[#333] px-4 py-2" onClick={() => clearBoard("today")}>
          清今日榜
        </button>
        <button type="button" className="rounded bg-[#333] px-4 py-2" onClick={() => clearBoard("all")}>
          清总榜
        </button>
        <a className="rounded bg-[#333] px-4 py-2" href={csvHref}>
          导出 CSV
        </a>
      </section>

      <section className="mb-8 rounded-xl border border-[#333] bg-[#121220] p-5">
        <h2 className="mb-4 text-xl">最近成绩</h2>
        <div className="mb-4 flex flex-wrap items-end gap-3">
          <label className="text-sm">
            手机号
            <input
              className="mt-1 block rounded border border-[#333] bg-[#0a0a12] px-3 py-2"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="支持模糊匹配"
            />
          </label>
          <label className="text-sm">
            开始日期
            <input
              type="date"
              className="mt-1 block rounded border border-[#333] bg-[#0a0a12] px-3 py-2"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </label>
          <label className="text-sm">
            结束日期
            <input
              type="date"
              className="mt-1 block rounded border border-[#333] bg-[#0a0a12] px-3 py-2"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </label>
          <button
            type="button"
            className="rounded bg-[#ff3344] px-4 py-2"
            onClick={() => void loadSessions()}
          >
            查询
          </button>
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
              {sessions.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-2 py-6 text-center text-[#666]">
                    暂无数据
                  </td>
                </tr>
              )}
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
                    {!s.isValid && <span className="text-[#888]">无效 </span>}
                    {s.cheatFlag && <span className="text-[#ff7777]">作弊</span>}
                    {s.isValid && !s.cheatFlag && <span className="text-[#7CFFB2]">有效</span>}
                  </td>
                  <td className="px-2 py-2">
                    <button
                      type="button"
                      className="text-[#ff7777] underline"
                      onClick={() => removeSession(s.id)}
                    >
                      删除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
