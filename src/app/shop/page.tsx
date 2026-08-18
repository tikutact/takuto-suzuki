import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import JsonLd from "@/components/JsonLd";
import { breadcrumb } from "@/lib/structured-data";
import { products, salesCap, SHIPPING_JPY } from "@/lib/shop";
import { getSoldCount } from "@/lib/stripe";

// Stripeの販売数を定期的に取り直して自動Sold Out判定する
export const revalidate = 60;

export const metadata: Metadata = {
  title: "Shop — TAKUTO SUZUKI",
  description:
    "Photo books and printed works by Takuto Suzuki. Fade, Stay — first photo book, edition of 50.",
};

export default async function Shop() {
  const soldOutFlags = await Promise.all(
    products.map(async (product) => {
      if (product.soldOut) return true;
      if (!product.paymentLinkId) return false;
      const sold = await getSoldCount(product.paymentLinkId);
      return sold !== null && sold >= salesCap(product);
    })
  );

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

        {/* モバイルは1カラムに潰れるので、写真がPurchaseボタンより後ろに回ると
            誰も辿り着かない。並び順を 表紙 → 中の写真 → 文章・価格 に固定する。
            デスクトップは col-start / row-start で明示配置して従来のままにする。 */}
        <div className="space-y-24">
          {products.map((product, i) => (
            <section
              key={product.slug}
              className="flex flex-col md:grid md:grid-cols-[5fr_6fr] md:gap-x-12 md:items-start"
            >
              <div className="order-1 md:order-none md:col-start-1 md:row-start-1 relative aspect-[182/257] bg-neutral-100 overflow-hidden mb-8 md:mb-0">
                {product.images[0] && (
                  <Image
                    src={product.images[0].src}
                    alt={product.images[0].alt}
                    fill
                    priority
                    sizes="(min-width: 768px) 400px, 100vw"
                    className="object-cover"
                  />
                )}
              </div>

              {/* 2枚目以降。表紙だけでは中身が分からないので、見開き・綴じ・厚みを原寸比率のまま見せる */}
              {product.images.length > 1 && (
                <div className="order-2 md:order-none md:col-start-1 md:col-span-2 md:row-start-2 md:mt-16 space-y-6 md:space-y-8 mb-12 md:mb-0">
                  {product.images.slice(1).map((image) => (
                    <Image
                      key={image.src}
                      src={image.src}
                      alt={image.alt}
                      width={image.width}
                      height={image.height}
                      sizes="(min-width: 896px) 896px, 100vw"
                      className="w-full h-auto"
                    />
                  ))}
                </div>
              )}

              <div className="order-3 md:order-none md:col-start-2 md:row-start-1">
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

              {soldOutFlags[i] ? (
                <div className="w-full border border-neutral-200 py-3 text-xs tracking-[0.3em] uppercase text-neutral-300 text-center">
                  Sold Out
                </div>
              ) : product.paymentLink && product.price !== null ? (
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
            </section>
          ))}
        </div>

        <div className="mt-24 pt-8 border-t border-neutral-100 space-y-2">
          <p className="text-xs text-neutral-400 leading-relaxed">
            送料は全国一律 ¥{SHIPPING_JPY.toLocaleString()}
            （レターパックライト・追跡あり）。
            <br />
            お届けは日本国内のみです。
            <br />
            ご注文確認後、5営業日以内に発送します（土日祝を除く）。
          </p>
          <p className="text-xs text-neutral-400 leading-relaxed">
            表紙の写真は1冊ずつ手作業で貼っています。経年で剥がれることを
            想定した設計のため、剥がれや浮きは不良ではありません。
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
