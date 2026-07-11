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
  cardId: number;
  playerId?: number;
  nickname?: string;
  phone?: string;
}) {
  localStorage.setItem("qzgs_card_id", String(data.cardId));
  if (data.playerId != null) localStorage.setItem("qzgs_player_id", String(data.playerId));
  if (data.nickname) localStorage.setItem("qzgs_nickname", data.nickname);
  if (data.phone) localStorage.setItem("qzgs_phone", data.phone);
}

export function getSession() {
  return {
    cardId: Number(localStorage.getItem("qzgs_card_id") || 0),
    playerId: Number(localStorage.getItem("qzgs_player_id") || 0),
    nickname: localStorage.getItem("qzgs_nickname") || "",
    phone: localStorage.getItem("qzgs_phone") || "",
    deviceCode: getDeviceCode(),
  };
}
