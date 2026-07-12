"use client";

import { useEffect, useRef } from "react";
import { canAcceptCardScan, getTerminalState } from "@/lib/terminal-state";

export const SCAN_MAX_INTERVAL = 80;
export const SCAN_RESET_TIMEOUT = 300;
export const MIN_SCAN_LENGTH = 4;

type Options = {
  enabled: boolean;
  onScan: (raw: string) => void;
};

/**
 * 读卡器 = 楔形键盘。连续字符间隔 ≤80ms，静默 ≥300ms 判定结束。
 * 不依赖回车；不把卡号写入 storage / 日志。
 */
export function useCardScanner({ enabled, onScan }: Options) {
  const bufferRef = useRef("");
  const lastKeyAtRef = useRef(0);
  const resetTimerRef = useRef<number | null>(null);
  const scannerLockedRef = useRef(false);
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  useEffect(() => {
    if (!enabled) {
      bufferRef.current = "";
      scannerLockedRef.current = false;
      return;
    }

    function clearResetTimer() {
      if (resetTimerRef.current != null) {
        window.clearTimeout(resetTimerRef.current);
        resetTimerRef.current = null;
      }
    }

    function flush() {
      const raw = bufferRef.current;
      bufferRef.current = "";
      clearResetTimer();
      if (scannerLockedRef.current) return;
      if (!canAcceptCardScan(getTerminalState())) return;
      if (raw.length < MIN_SCAN_LENGTH) return;
      scannerLockedRef.current = true;
      onScanRef.current(raw);
    }

    function onKeyDown(e: KeyboardEvent) {
      if (!enabled || scannerLockedRef.current) return;
      if (!canAcceptCardScan(getTerminalState())) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      const now = Date.now();
      if (now - lastKeyAtRef.current > SCAN_MAX_INTERVAL) {
        bufferRef.current = "";
      }
      lastKeyAtRef.current = now;

      if (e.key === "Enter") {
        e.preventDefault();
        flush();
        return;
      }
      if (e.key.length !== 1) return;
      e.preventDefault();
      e.stopPropagation();
      bufferRef.current += e.key;

      clearResetTimer();
      resetTimerRef.current = window.setTimeout(() => {
        flush();
      }, SCAN_RESET_TIMEOUT);
    }

    window.addEventListener("keydown", onKeyDown, true);
    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
      clearResetTimer();
      bufferRef.current = "";
    };
  }, [enabled]);

  return { scannerLockedRef };
}
