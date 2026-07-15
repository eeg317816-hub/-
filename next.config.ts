import type { NextConfig } from "next";
import path from "path";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

const staticCache = {
  key: "Cache-Control",
  value: "public, max-age=86400, stale-while-revalidate=604800",
};

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname),
  poweredByHeader: false,
  images: {
    unoptimized: true,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        source: "/hud-bg.:ext(webp|jpg|png)",
        headers: [staticCache, { key: "X-Content-Type-Options", value: "nosniff" }],
      },
      {
        source: "/favicon.ico",
        headers: [staticCache],
      },
      {
        source: "/scenes/:path*",
        headers: [staticCache],
      },
      {
        source: "/brand/:path*",
        headers: [staticCache],
      },
      {
        source: "/media/:path*",
        headers: [staticCache],
      },
    ];
  },
};

export default nextConfig;
