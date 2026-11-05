import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/structured-data";

// 全ページのクロールを許可し、sitemap の場所だけ伝える。
//
// noindex の /journal を Disallow にしないこと。robots.txt で塞ぐとクローラーは
// ページを取得できず、<meta name="robots" content="noindex"> を読めなくなる
// （リンクだけで URL が検索結果に載ることがある）。noindex は各ページの metadata、
// 下書きの除外は src/lib/journal.ts（一覧・詳細・sitemap に出さない＝404）が受け持つ。
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
