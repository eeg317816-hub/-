"use client";

import { ReactNode } from "react";

type Props = {
  children: ReactNode;
  scene?: "arena" | "stage";
  className?: string;
};

export function GameShell({ children, scene = "arena", className = "" }: Props) {
  return (
    <main
      className={`relative min-h-screen overflow-hidden text-white ${className}`}
      style={{
        backgroundImage: `
          linear-gradient(180deg, rgba(6,4,10,0.72), rgba(8,6,14,0.88)),
          url(/scenes/${scene}.jpg)
        `,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(227,28,35,0.28),transparent_55%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] [background-size:36px_36px]" />
      <div className="scanlines pointer-events-none absolute inset-0" />
      <div className="relative z-10">{children}</div>
    </main>
  );
}
