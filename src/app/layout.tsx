import type { Metadata } from "next";
import localFont from "next/font/local";
import Nav from "@/components/Nav";
import PageTransition from "@/components/PageTransition";
import JsonLd from "@/components/JsonLd";
import { personLd, webSiteLd } from "@/lib/structured-data";
import "./globals.css";

// next/font/google はビルドのたびに Google Fonts へ取りに行くため、ビルドが
// 外部依存になる。実際に lightleak で Vercel のビルドが取得失敗で落ちた
// （2026-08-12）。厄介なのは、落ちても公開サイトは前のデプロイのまま200を
// 返すので見た目では気づけないこと。→ woff2 を同梱して外部依存をなくす。
//
// 同梱しているのは latin サブセットのみ（ソースに latin-ext の文字が0件
// であることを確認済み）。アクセント付きラテン・† ・₫ などを使うように
// なったら latin-ext の woff2 も同梱すること。
const ebGaramond = localFont({
  src: "./fonts/EBGaramond-latin.woff2",
  variable: "--font-eb-garamond",
  // 可変フォントで軸は 400–800。font-light(300) は400にクランプされる
  weight: "400 800",
  display: "swap",
  // localFont は書体の分類を知らずフォールバックに Arial（サンセリフ）を当てる。
  // next/font/google 時代は Times New Roman だったので明示して揃える。
  // これを外すと読込中に明朝→ゴシックのちらつきが出て、CLSの指標もズレる。
  adjustFontFallback: "Times New Roman",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.takutosuzuki.com"),
  title: "TAKUTO SUZUKI — Photographer",
  description: "Photography portfolio of Takuto Suzuki.",
  verification: {
    google: "eTUWPhodK0Lv2sK970oRWlhWy9QHQpbodWo0R1cHCq0",
  },
  // ページ側で openGraph/twitter を上書きしなければこれが使われる（既定値ゼロ対策）。
  // 個別ページで images だけ差し替えたい場合は openGraph: { images: [...] } のみ書けば
  // title/description/siteName/locale/type はここから継承される。
  openGraph: {
    title: "TAKUTO SUZUKI — Photographer",
    description: "Photography portfolio of Takuto Suzuki.",
    siteName: "TAKUTO SUZUKI",
    locale: "ja_JP",
    type: "website",
    images: [{ url: "/og/default.jpg", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "TAKUTO SUZUKI — Photographer",
    description: "Photography portfolio of Takuto Suzuki.",
    images: ["/og/default.jpg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className={`${ebGaramond.variable} h-full antialiased`}>
      <body className={`min-h-full bg-white ${ebGaramond.className}`}>
        <JsonLd data={personLd()} />
        <JsonLd data={webSiteLd()} />
        <Nav />
        <div className="md:pl-[40vw] pt-14 md:pt-0">
          <PageTransition>{children}</PageTransition>
        </div>
      </body>
    </html>
  );
}
