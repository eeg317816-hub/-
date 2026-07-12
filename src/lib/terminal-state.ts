export type TerminalState =
  | "WAITING_CARD"
  | "LOGIN"
  | "READY"
  | "PLAYING"
  | "SUBMITTING"
  | "RESULT"
  | "RANKING";

const KEY = "qzgs_terminal_state";
const SESSION_KEY = "qzgs_terminal_session_id";

export function getTerminalState(): TerminalState {
  if (typeof window === "undefined") return "WAITING_CARD";
  const v = sessionStorage.getItem(KEY) as TerminalState | null;
  const allowed: TerminalState[] = [
    "WAITING_CARD",
    "LOGIN",
    "READY",
    "PLAYING",
    "SUBMITTING",
    "RESULT",
    "RANKING",
  ];
  if (v && allowed.includes(v)) return v;
  return "WAITING_CARD";
}

export function setTerminalState(state: TerminalState) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(KEY, state);
  window.dispatchEvent(new CustomEvent("qzgs-terminal-state", { detail: state }));
}

export function getTerminalSessionId(): number {
  if (typeof window === "undefined") return 0;
  return Number(sessionStorage.getItem(SESSION_KEY) || 0);
}

export function setTerminalSessionId(id: number) {
  if (typeof window === "undefined") return;
  if (id > 0) sessionStorage.setItem(SESSION_KEY, String(id));
  else sessionStorage.removeItem(SESSION_KEY);
}

export function clearTerminalSession() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(SESSION_KEY);
  sessionStorage.setItem(KEY, "WAITING_CARD");
}

/** 仅 WAITING_CARD 允许刷卡 */
export function canAcceptCardScan(state?: TerminalState): boolean {
  return (state ?? getTerminalState()) === "WAITING_CARD";
}
