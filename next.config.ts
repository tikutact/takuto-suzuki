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
  // /shop の商品写真は本の紙面そのものを見せるので、既定の q=75 より上げている。
  //
  // Next 16 で images.qualities の既定が「全部許可」から [75] だけに変わった。
  // ここに無い値を <Image quality> に書いても**エラーにはならず、黙って
  // 一番近い許可値に丸められる**（quality={82} は 75 になる）。ビルドも
  // コンソールも無言なので、quality を足すときは必ずこの配列にも足すこと。
  // 400 が出るのは /_next/image?q=... を直に叩いたときだけ。
  images: {
    qualities: [75, 90],
  },
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
