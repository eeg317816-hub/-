import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "全职高手 · 测手速",
  description: "展会手速挑战 · 荣耀职业水准",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Orbitron:wght@600;800&family=ZCOOL+KuaiLe&family=Noto+Sans+SC:wght@400;700;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
