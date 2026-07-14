"use client";

import { motion } from "framer-motion";

type Props = {
  disabled?: boolean;
  onInsert: () => void;
};

/** 测试环境：模拟卡片插入读卡器 */
export function CardInsertSlot({ disabled, onInsert }: Props) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onInsert}
      className="group mt-6 w-full text-left disabled:opacity-60"
      aria-label="点击模拟插入卡片"
    >
      <div className="hud-frame relative overflow-hidden px-5 py-6 transition hover:border-[#ff3344] hover:shadow-[0_0_28px_rgba(227,28,35,0.45)]">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-[#e31c23] to-transparent opacity-70" />

        <div className="flex items-center gap-4">
          <div className="relative h-20 w-28 shrink-0">
            <div className="absolute inset-x-2 bottom-0 h-3 rounded-sm border border-[#e31c23]/80 bg-black/60" />
            <motion.div
              className="absolute inset-x-3 top-2 h-14 rounded-md border border-[#ff3344]/90 bg-gradient-to-b from-[#3a1010] to-[#120808] shadow-[0_0_16px_rgba(227,28,35,0.5)]"
              animate={
                disabled
                  ? { y: 0 }
                  : { y: [8, 0, 8], opacity: [0.85, 1, 0.85] }
              }
              transition={{ duration: 1.6, repeat: disabled ? 0 : Infinity, ease: "easeInOut" }}
            >
              <div className="mt-2 text-center font-tech text-[10px] tracking-widest text-[#ff6b73]">
                CARD
              </div>
            </motion.div>
          </div>

          <div className="flex-1">
            <p className="font-display text-lg text-[#ffe9e9]">请将卡片插入读卡器</p>
            <p className="mt-1 text-sm text-[#e31c23]/90">
              测试环境：点击此区域模拟插卡
            </p>
            <p className="mt-2 font-tech text-xs tracking-[0.25em] text-[#888]">
              INSERT CARD · TAP TO SIMULATE
            </p>
          </div>
        </div>
      </div>
    </button>
  );
}
