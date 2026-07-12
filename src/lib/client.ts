import { clearTerminalSession } from "@/lib/terminal-state";

export function getDeviceCode() {
  if (typeof window === "undefined") return "PC01";
  const q = new URLSearchParams(window.location.search);
  const code =
    q.get("device") ||
    q.get("deviceCode") ||
    q.get("terminal") ||
    localStorage.getItem("qzgs_device") ||
    "PC01";
  localStorage.setItem("qzgs_device", code);
  return code;
}

export function saveSession(data: {
  cardId?: number;
  playerId?: number;
  nickname?: string;
  phone?: string;
  terminalSessionId?: number;
}) {
  if (data.cardId != null && data.cardId > 0) {
    localStorage.setItem("qzgs_card_id", String(data.cardId));
  }
  if (data.playerId != null) localStorage.setItem("qzgs_player_id", String(data.playerId));
  if (data.nickname) localStorage.setItem("qzgs_nickname", data.nickname);
  if (data.phone) localStorage.setItem("qzgs_phone", data.phone);
  if (data.terminalSessionId != null && data.terminalSessionId > 0) {
    sessionStorage.setItem("qzgs_terminal_session_id", String(data.terminalSessionId));
  }
}

export function getSession() {
  return {
    cardId: Number(localStorage.getItem("qzgs_card_id") || 0),
    playerId: Number(localStorage.getItem("qzgs_player_id") || 0),
    nickname: localStorage.getItem("qzgs_nickname") || "",
    phone: localStorage.getItem("qzgs_phone") || "",
    deviceCode: getDeviceCode(),
    terminalSessionId: Number(sessionStorage.getItem("qzgs_terminal_session_id") || 0),
  };
}

/** 退出登录：清会话，不产生新对局，不占用次数 */
export function clearSession() {
  localStorage.removeItem("qzgs_card_id");
  localStorage.removeItem("qzgs_player_id");
  localStorage.removeItem("qzgs_nickname");
  localStorage.removeItem("qzgs_phone");
  sessionStorage.removeItem("qzgs_quota");
  sessionStorage.removeItem("qzgs_play");
  sessionStorage.removeItem("qzgs_result_payload");
  sessionStorage.removeItem("qzgs_card_token");
  sessionStorage.removeItem("qzgs_player_token");
  sessionStorage.removeItem("qzgs_player");
  clearTerminalSession();
}
