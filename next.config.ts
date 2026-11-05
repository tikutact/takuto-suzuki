import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  // HTTPS 以外で開かせない（2年）。この値はこのホスト（www.takutosuzuki.com）だけに効き、
  // 購入ボタンの遷移先 buy.stripe.com・Formspree など他のホストには影響しない。
  // includeSubDomains / preload は付けていない: 付けると takutosuzuki.com の全サブドメインが
  // 2年間 HTTPS 必須になり、後から外せない。付けるなら全サブドメインの HTTPS 化を確認してから。
  { key: "Strict-Transport-Security", value: "max-age=63072000" },
  // CSP は未設定。入れるときの許可先の洗い出しは docs/review-2026-11-audit.md 4-12。
];

const nextConfig: NextConfig = {
  // 応答に X-Powered-By: Next.js を付けない（使っているフレームワークを外に出さない）。
  poweredByHeader: false,
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
