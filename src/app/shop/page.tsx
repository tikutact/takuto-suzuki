import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import JsonLd from "@/components/JsonLd";
import { breadcrumb } from "@/lib/structured-data";
import {
  products,
  COVER_PHOTO_POLICY,
  SHIPPING_DAYS,
  SHIPPING_JPY,
  SHIPPING_METHOD,
} from "@/lib/shop";
import { saleStatus } from "@/lib/sale-status";

// Stripeの販売数を定期的に取り直して自動Sold Out判定する
export const revalidate = 60;

// 部数は shop.ts から引く。ここに手打ちすると、増刷で totalEdition を変えたときに
// 検索結果のスニペットとOGPだけ古い部数のまま残る（specs と特商法ページは自動追従する）。
//
// 「first photo book」は Fade, Stay だけの事実なので slug で縛る。products[0] に
// 無条件で付けると、新刊を配列の先頭に足した瞬間にその本が「first」を名乗る。
const featured = products.find((p) => p.slug === "fade-stay");

const description = featured
  ? `Photo books and printed works by Takuto Suzuki. ${featured.title} — first photo book, edition of ${featured.totalEdition}.`
  : "Photo books and printed works by Takuto Suzuki.";

export const metadata: Metadata = {
  title: "Shop — TAKUTO SUZUKI",
  description,
  openGraph: {
    title: "Shop — TAKUTO SUZUKI",
    description,
    images: [{ url: "/og/shop.jpg", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Shop — TAKUTO SUZUKI",
    description,
    images: ["/og/shop.jpg"],
  },
};

export default async function Shop() {
  const statuses = await Promise.all(products.map(saleStatus));

  return (
    <div className="pt-8 pb-16 md:pt-24 md:pb-24">
      <JsonLd
        data={breadcrumb([
          { name: "Home", path: "/" },
          { name: "Shop", path: "/shop" },
        ])}
      />
      <div className="max-w-4xl mx-auto px-6">
        <h1 className="text-xs tracking-[0.4em] uppercase text-neutral-400 mb-16">
          Shop
        </h1>

        {/* 並び順は 表紙 → 説明・価格 → 中の写真 でモバイルもデスクトップも揃える。
            **JSXの順番そのものをこの順にしてある**。CSSの order で見た目だけ
            入れ替えると、スクリーンリーダーはDOM順に読むので「表紙のあと
            見開き5枚の説明を全部聞かされてから値段とPurchaseに着く」ことになる。
            2カラムに割るのは xl（1280px）から。左ナビが md:pl-[40vw] で40vw固定のため、
            768〜1279px で2カラムにすると表紙が166〜236pxまで潰れる（実測）。
            1カラム側では表紙を max-w-[420px] で止める（1024px前後で566pxまで肥大するため）。 */}
        <div className="space-y-24">
          {products.map((product, i) => (
            <section
              key={product.slug}
              className="flex flex-col xl:grid xl:grid-cols-[5fr_6fr] xl:gap-x-12 xl:items-start"
            >
              <div className="xl:col-start-1 xl:row-start-1 relative w-full max-w-[420px] xl:max-w-none aspect-[182/257] bg-neutral-100 overflow-hidden mb-8 xl:mb-0">
                {product.images[0] && (
                  <Image
                    src={product.images[0].src}
                    alt={product.images[0].alt}
                    fill
                    priority
                    sizes="(min-width: 1280px) calc((min(896px, 60vw) - 96px) * 5 / 11), (min-width: 768px) min(420px, calc(min(896px, 60vw) - 48px)), min(420px, calc(100vw - 48px))"
                    quality={90}
                    className="object-cover"
                  />
                )}
              </div>

              <div className="xl:col-start-2 xl:row-start-1">
              <h2 className="text-lg tracking-wide mb-4">{product.title}</h2>

              <ul className="space-y-1 mb-6">
                {product.specs.map((spec) => (
                  <li key={spec} className="text-xs text-neutral-400 tracking-wide">
                    {spec}
                  </li>
                ))}
              </ul>

              {/* 折り返しは読点単位（inline-block）に制御し、行末に助詞だけ残る事故を防ぐ */}
              <p className="text-sm text-neutral-600 leading-loose mb-8">
                {product.description.split("\n\n").map((stanza, si) => (
                  <span key={si} className="block mb-6 last:mb-0">
                    {stanza.split("\n").map((line, li) => (
                      <span key={li} className="block">
                        {line.split(/(?<=、)/).map((seg, j) => (
                          <span key={j} className="inline-block">
                            {seg}
                          </span>
                        ))}
                      </span>
                    ))}
                  </span>
                ))}
              </p>

              <p className="text-sm tracking-wide mb-8">
                {product.price !== null
                  ? `¥${product.price.toLocaleString()} (tax included)`
                  : "Price TBD"}
                {product.price !== null && (
                  <span className="block text-xs text-neutral-400 mt-2">
                    ＋ 送料 ¥{SHIPPING_JPY.toLocaleString()}（全国一律）
                  </span>
                )}
              </p>

              {statuses[i] === "sold_out" ? (
                <div className="w-full border border-neutral-200 py-3 text-xs tracking-[0.3em] uppercase text-neutral-300 text-center">
                  Sold Out
                </div>
              ) : statuses[i] === "purchase" && product.paymentLink ? (
                <a
                  href={product.paymentLink}
                  className="block w-full border border-black py-3 text-xs tracking-[0.3em] uppercase text-center hover:bg-black hover:text-white transition-colors duration-300"
                >
                  Purchase
                </a>
              ) : (
                <div className="w-full border border-neutral-200 py-3 text-xs tracking-[0.3em] uppercase text-neutral-300 text-center">
                  Available Soon
                </div>
              )}
              </div>

              {/* 2枚目以降。表紙だけでは中身が分からないので、見開き・綴じ・厚みを原寸比率のまま見せる。
                  sizes は「ナビが左40vwを占め、本体は max-w-4xl から px-6 を引いた幅」という
                  実測どおりの式にしてある。ここを 896px と書くと 768px幅の端末で
                  表示413pxの枠に w=1920 を取りに行く（実測）。
                  見開きは1カラム/2カラムどちらでも本文幅いっぱいなので xl 分岐は不要 */}
              {product.images.length > 1 && (
                <div className="xl:col-start-1 xl:col-span-2 xl:row-start-2 mt-12 xl:mt-16 space-y-6 xl:space-y-8">
                  {product.images.slice(1).map((image) => (
                    <Image
                      key={image.src}
                      src={image.src}
                      alt={image.alt}
                      width={image.width}
                      height={image.height}
                      sizes="(min-width: 768px) calc(min(896px, 60vw) - 48px), calc(100vw - 48px)"
                      quality={90}
                      className="w-full h-auto"
                    />
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>

        <div className="mt-24 pt-8 border-t border-neutral-100 space-y-2">
          {/* 発送・返品まわりの数字と可否は shop.ts の定数から引く。
              ここと /tokushoho（法定表示）で食い違うと、書いてある方が正になってしまう */}
          <p className="text-xs text-neutral-400 leading-relaxed">
            送料は全国一律 ¥{SHIPPING_JPY.toLocaleString()}（{SHIPPING_METHOD}
            ・追跡あり）。
            <br />
            お届けは日本国内のみです。
            <br />
            ご注文確認後、{SHIPPING_DAYS}営業日以内に発送します（土日祝を除く）。
          </p>
          <p className="text-xs text-neutral-400 leading-relaxed">
            1冊ずつ手作業で写真を貼っています。{COVER_PHOTO_POLICY}
          </p>
          <Link
            href="/tokushoho"
            className="inline-block text-xs text-neutral-400 underline underline-offset-4 hover:text-black transition-colors"
          >
            特定商取引法に基づく表記
          </Link>
        </div>
      </div>
    </div>
  );
}
