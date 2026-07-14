"use client";

import { useEffect, useRef } from "react";
import { canAcceptCardScan, getTerminalState } from "@/lib/terminal-state";

export const SCAN_MAX_INTERVAL = 80;
export const SCAN_RESET_TIMEOUT = 300;
export const MIN_SCAN_LENGTH = 4;

type Options = {
  /** 仅 WAITING_CARD 页面应传 true；离开该页必须 false / 卸载 */
  enabled: boolean;
  onScan: (raw: string) => void;
};

function isImeComposing(e: KeyboardEvent): boolean {
  return Boolean(e.isComposing || e.keyCode === 229);
}

function isFormFieldTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  );
}

/**
 * 读卡器 = 楔形键盘。连续字符间隔 ≤80ms，静默 ≥300ms 判定结束。
 * 不依赖回车；不把卡号写入 storage / 日志。
 * 仅 WAITING_CARD 启用；表单输入 / IME 组合期间一律忽略。
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
      if (resetTimerRef.current != null) {
        window.clearTimeout(resetTimerRef.current);
        resetTimerRef.current = null;
      }
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

      // 中文输入法拼音组合中：不拦截、不拼接
      if (isImeComposing(e)) return;

      // 焦点在表单控件上：完全让出键盘（登录页等）
      if (isFormFieldTarget(e.target)) return;

      if (e.metaKey || e.ctrlKey || e.altKey) return;

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

    // 冒泡阶段足够；表单控件已在 handler 内忽略，避免 capture 抢 IME
    window.addEventListener("keydown", onKeyDown, false);
    return () => {
      window.removeEventListener("keydown", onKeyDown, false);
      clearResetTimer();
      bufferRef.current = "";
    };
  }, [enabled]);

  return { scannerLockedRef };
}
