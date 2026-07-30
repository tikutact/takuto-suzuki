import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "特定商取引法に基づく表記 — TAKUTO SUZUKI",
  description: "特定商取引法に基づく表記",
  // sitemap/Navには載せず/shopからのリンクのみ
};

const entries: { label: string; value: React.ReactNode }[] = [
  { label: "販売事業者", value: "鈴木 拓人" },
  {
    label: "所在地",
    value: "〒460-0011 愛知県名古屋市中区大須2-11-18 UI大須ビル3F（LIGHT LEAK内）",
  },
  {
    label: "電話番号",
    value:
      "電話番号はご請求をいただいた場合、遅滞なく開示いたします。お問い合わせフォームよりご請求ください。",
  },
  {
    label: "お問い合わせ",
    value: (
      <Link
        href="/contact"
        className="underline underline-offset-4 hover:text-black transition-colors"
      >
        お問い合わせフォーム
      </Link>
    ),
  },
  { label: "販売価格", value: "各商品ページに表示する価格（消費税込み）" },
  {
    label: "商品代金以外の必要料金",
    value: "送料（購入手続き画面に表示します）",
  },
  { label: "お支払い方法", value: "クレジットカード決済（Stripe）" },
  { label: "お支払い時期", value: "ご注文時にお支払いが確定します" },
  {
    label: "商品の引き渡し時期",
    value: "ご注文確認後、5営業日以内に発送いたします",
  },
  {
    label: "返品・交換について",
    value:
      "商品の性質上、お客様のご都合による返品・交換はお受けできません。落丁・乱丁・配送中の破損など不良品については、商品到着後7日以内にお問い合わせフォームよりご連絡ください。良品と交換、または在庫がない場合は返金にて対応いたします。",
  },
];

export default function Tokushoho() {
  return (
    <div className="pt-8 pb-16 md:pt-24 md:pb-24">
      <div className="max-w-xl mx-auto px-6">
        <h1 className="text-xs tracking-[0.4em] uppercase text-neutral-400 mb-4">
          Legal Notice
        </h1>
        <p className="text-sm text-neutral-600 mb-16">特定商取引法に基づく表記</p>

        <dl className="space-y-8">
          {entries.map(({ label, value }) => (
            <div key={label} className="border-t border-neutral-100 pt-4">
              <dt className="text-xs tracking-[0.2em] text-neutral-400 mb-2">
                {label}
              </dt>
              <dd className="text-sm text-neutral-600 leading-relaxed">
                {value}
              </dd>
            </div>
          ))}
        </dl>

        <div className="mt-16">
          <Link
            href="/shop"
            className="text-xs text-neutral-400 underline underline-offset-4 hover:text-black transition-colors"
          >
            ← Back to Shop
          </Link>
        </div>
      </div>
    </div>
  );
}
