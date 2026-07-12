"use client";

import { useEffect } from "react";
import { apiUrl, heartbeatIntervalMs } from "@/lib/public-env";
import { getTerminalSessionId, setTerminalState } from "@/lib/terminal-state";
import { clearSession } from "@/lib/client";

export function useHeartbeat(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const ms = heartbeatIntervalMs();
    let stopped = false;

    async function beat() {
      const id = getTerminalSessionId();
      if (!id || stopped) return;
      try {
        const res = await fetch(apiUrl("/api/terminal/heartbeat"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ terminalSessionId: id }),
        });
        const json = await res.json();
        if (!json.success || json.expired) {
          clearSession();
          setTerminalState("WAITING_CARD");
          window.location.href = "/";
        }
      } catch {
        // ignore transient network errors
      }
    }

    void beat();
    const t = window.setInterval(beat, ms);
    return () => {
      stopped = true;
      window.clearInterval(t);
    };
  }, [enabled]);
}
