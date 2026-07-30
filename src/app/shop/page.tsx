import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import JsonLd from "@/components/JsonLd";
import { breadcrumb } from "@/lib/structured-data";
import { products } from "@/lib/shop";
import { getSoldCount } from "@/lib/stripe";

// Stripeの販売数を定期的に取り直して自動Sold Out判定する
export const revalidate = 60;

export const metadata: Metadata = {
  title: "Shop — TAKUTO SUZUKI",
  description: "Photo zines and printed works by Takuto Suzuki.",
  // 販売開始まで非公開（公開時に外し、sitemap/Navへ追加する）
  robots: { index: false, follow: false },
};

export default async function Shop() {
  const soldOutFlags = await Promise.all(
    products.map(async (product) => {
      if (product.soldOut) return true;
      if (!product.paymentLinkId) return false;
      const sold = await getSoldCount(product.paymentLinkId);
      return sold !== null && sold >= product.edition;
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
      <div className="max-w-xl mx-auto px-6">
        <h1 className="text-xs tracking-[0.4em] uppercase text-neutral-400 mb-16">
          Shop
        </h1>

        <div className="space-y-24">
          {products.map((product, i) => (
            <section key={product.slug}>
              <div className="relative aspect-[182/257] bg-neutral-100 overflow-hidden mb-8">
                {product.images[0] && (
                  <Image
                    src={product.images[0]}
                    alt={product.title}
                    fill
                    sizes="(min-width: 768px) 576px, 100vw"
                    className="object-cover"
                  />
                )}
              </div>

              <h2 className="text-lg tracking-wide mb-4">{product.title}</h2>

              <ul className="space-y-1 mb-6">
                {product.specs.map((spec) => (
                  <li key={spec} className="text-xs text-neutral-400 tracking-wide">
                    {spec}
                  </li>
                ))}
              </ul>

              <p className="text-sm text-neutral-600 leading-relaxed mb-8">
                {product.description}
              </p>

              <p className="text-sm tracking-wide mb-8">
                {product.price !== null
                  ? `¥${product.price.toLocaleString()} (tax included)`
                  : "Price TBD"}
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
            </section>
          ))}
        </div>

        <div className="mt-24 pt-8 border-t border-neutral-100 space-y-2">
          <p className="text-xs text-neutral-400 leading-relaxed">
            ご注文から5営業日以内に発送します。送料は購入手続き画面に表示されます。
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
