"use client";

import { motion } from "framer-motion";

type Props = {
  disabled?: boolean;
  onInsert: () => void;
};

/** 测试环境：仅显示可点击的卡片；点击即进入过场动画 */
export function CardInsertSlot({ disabled, onInsert }: Props) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onInsert}
      className="mt-6 inline-flex disabled:opacity-60"
      aria-label="点击卡片进入登录"
    >
      <div className="relative h-24 w-36">
        <div className="absolute inset-x-3 bottom-0 h-3 rounded-sm border border-[#e31c23]/80 bg-black/60" />
        <motion.div
          className="absolute inset-x-4 top-1 flex h-16 cursor-pointer items-center justify-center rounded-md border-2 border-[#ff3344] bg-gradient-to-b from-[#3a1010] to-[#120808] shadow-[0_0_20px_rgba(227,28,35,0.55)] transition hover:brightness-110"
          animate={
            disabled
              ? { y: 0 }
              : { y: [10, 0, 10], opacity: [0.85, 1, 0.85] }
          }
          transition={{ duration: 1.6, repeat: disabled ? 0 : Infinity, ease: "easeInOut" }}
        >
          <span className="font-tech text-xs tracking-[0.3em] text-[#ff6b73]">CARD</span>
        </motion.div>
      </div>
    </button>
  );
}
