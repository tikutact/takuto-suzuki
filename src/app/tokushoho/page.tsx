import type { Metadata } from "next";
import Link from "next/link";
import {
  products,
  COVER_PHOTO_POLICY,
  SHIPPING_DAYS,
  SHIPPING_JPY,
  SHIPPING_METHOD,
} from "@/lib/shop";
import { CONTACT_EMAIL, mailtoWithSubject } from "@/lib/structured-data";

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
      "電話番号はご請求をいただいた場合、遅滞なく開示いたします。下記のお問い合わせフォームまたはメールよりご請求ください。",
  },
  {
    label: "お問い合わせ",
    value: (
      <>
        <Link
          href="/contact"
          className="underline underline-offset-4 hover:text-black transition-colors"
        >
          お問い合わせフォーム
        </Link>
        <br />
        またはメール:{" "}
        <a
          href={mailtoWithSubject("【Fade, Stay】お問い合わせ")}
          className="underline underline-offset-4 hover:text-black transition-colors"
        >
          {CONTACT_EMAIL}
        </a>
      </>
    ),
  },
  { label: "販売価格", value: "各商品ページに表示する価格（消費税込み）" },
  {
    label: "商品代金以外の必要料金",
    value: `送料 全国一律 ${SHIPPING_JPY.toLocaleString()}円（消費税込み）。${SHIPPING_METHOD}にて発送いたします。`,
  },
  { label: "配送地域", value: "日本国内のみ" },
  // 部数は shop.ts の edition / totalEdition を参照する（手打ちすると必ず乖離するため）。
  //
  // products[0] を直に読まないこと。商品を一時的に全部下げると products が空になり、
  // このファイルは module スコープで配列を組み立てているので、**サイト全体のビルドが落ちる**。
  // 法定表示のページは商品が無くても開けなければならない。
  // 商品が増えたときに1件目しか載らない問題も同時に消える。
  ...(products.length > 0
    ? [
        {
          label: "販売数量の制限",
          value: (
            <>
              {products.map((p) => (
                <span key={p.slug} className="block">
                  『{p.title}』はエディション{p.totalEdition}部のうち、本サイトでの販売は
                  {p.edition}部です。残部は店舗での対面販売に充てているため、本サイトでは
                  {p.edition}部に達した時点で販売を終了します。
                </span>
              ))}
            </>
          ),
        },
      ]
    : []),
  { label: "お支払い方法", value: "クレジットカード決済（Stripe）" },
  { label: "お支払い時期", value: "ご注文時にお支払いが確定します" },
  {
    label: "商品の引き渡し時期",
    value: `ご注文確認後、${SHIPPING_DAYS}営業日以内に発送いたします（土日祝を除く）`,
  },
  {
    label: "返品・交換について",
    value: (
      <>
        商品の性質上、お客様のご都合による返品・交換はお受けできません。
        <br />
        <br />
        落丁・乱丁・配送中の破損など不良品の場合、
        <strong className="font-normal text-neutral-900">
          商品のご返送は不要です
        </strong>
        。商品到着後7日以内に、状態がわかる写真を添えて、上記のお問い合わせフォームまたはメールにてご連絡ください。良品と交換いたします（在庫がない場合は代金全額を返金いたします）。
        <br />
        <br />
        なお、当方から商品のご返送をお願いする場合、返送にかかる送料は当方が負担いたします。
        <br />
        <br />
        {COVER_PHOTO_POLICY}
      </>
    ),
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
