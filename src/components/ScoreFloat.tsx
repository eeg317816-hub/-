"use client";

import { AnimatePresence, motion } from "framer-motion";

export type FloatItem = {
  id: string;
  x: number;
  y: number;
  text: string;
  kind: "plus" | "minus" | "combo";
};

export function ScoreFloatLayer({ items }: { items: FloatItem[] }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-50 overflow-hidden">
      <AnimatePresence>
        {items.map((it) => (
          <motion.div
            key={it.id}
            initial={{ opacity: 0, y: 8, scale: 0.7 }}
            animate={{ opacity: 1, y: -48, scale: it.kind === "combo" ? 1.25 : 1 }}
            exit={{ opacity: 0, y: -80, scale: 0.9 }}
            transition={{ duration: it.kind === "combo" ? 0.7 : 0.55, ease: "easeOut" }}
            className={`absolute -translate-x-1/2 font-black tracking-wide drop-shadow-[0_0_10px_rgba(0,0,0,0.8)] ${
              it.kind === "minus"
                ? "text-2xl text-[#ff6b6b]"
                : it.kind === "combo"
                  ? "text-3xl text-[#ffd56a]"
                  : "text-2xl text-[#7CFFB2]"
            }`}
            style={{ left: it.x, top: it.y }}
          >
            {it.text}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
