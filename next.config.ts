import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

const nextConfig: NextConfig = {
  // 2026-08-19: シリーズ名（cast/trace/ordinary）をやめて年でまとめた。
  // 3つとも公開済みでサイトマップにも載っていたURLなので、消さずに転送する。
  async redirects() {
    return ["cast", "trace", "ordinary"].map((slug) => ({
      source: `/works/${slug}`,
      destination: "/works/2026",
      permanent: true,
    }));
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
