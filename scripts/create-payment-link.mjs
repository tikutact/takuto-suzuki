#!/usr/bin/env node
/**
 * Payment Link を作る（商品・価格・配送料レートごと）。
 *
 *   STRIPE_SECRET_KEY=sk_live_... node scripts/create-payment-link.mjs
 *   node scripts/create-payment-link.mjs --test   # .env.local のテストキーで練習
 *
 * 設定値は shop.ts（price / edition / SHIPPING_JPY）から読むので手打ちしない。
 * 作ったあとは必ず `node scripts/check-payment-link.mjs <plink_...>` で機械判定する。
 *
 * なぜスクリプトにするか: 売価を変えるとPayment Linkは作り直しになる（既存リンクの
 * 金額は変えられない）。そのたびにダッシュボードで10項目を手で設定し直すのは
 * 設定漏れの温床で、実際に「送料レートなし＝送料0円で売れる」を一度踏んでいる。
 *
 * 冪等キーを固定してあるので、同じ設定で二重に走らせても増えない。
 * 設定を変えて作り直すときは IDEMPOTENCY_TAG を上げること。
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

/** 設定を変えて作り直すときはここを v2, v3... と上げる */
const IDEMPOTENCY_TAG = "fade-stay-v1";

const useTest = process.argv.includes("--test");

function loadKey() {
  if (process.env.STRIPE_SECRET_KEY) return process.env.STRIPE_SECRET_KEY;
  try {
    const raw = readFileSync(join(root, ".env.local"), "utf8");
    const m = raw.match(/^STRIPE_SECRET_KEY=(.+)$/m);
    if (m) return m[1].trim();
  } catch {}
  return null;
}

function loadShop() {
  const src = readFileSync(join(root, "src/lib/shop.ts"), "utf8");
  const pick = (re) => {
    const m = src.match(re);
    return m ? m[1] : null;
  };
  return {
    title: pick(/^\s*title:\s*"([^"]+)"/m),
    price: Number(pick(/^\s*price:\s*(\d+),/m)),
    edition: Number(pick(/^\s*edition:\s*(\d+),/m)),
    shipping: Number(pick(/SHIPPING_JPY\s*=\s*(\d+)/)),
  };
}

const key = loadKey();
if (!key) {
  console.error("STRIPE_SECRET_KEY が見つかりません（環境変数か .env.local）");
  process.exit(2);
}
const isLive = key.startsWith("sk_live_") || key.startsWith("rk_live_");
if (!useTest && !isLive) {
  console.error(
    "テストキーです。本番リンクを作るなら sk_live_ を渡してください。\n" +
      "テストで練習するなら --test を付けてください。"
  );
  process.exit(2);
}

const shop = loadShop();
for (const [k, v] of Object.entries(shop)) {
  if (!v) {
    console.error(`shop.ts から ${k} を読めませんでした`);
    process.exit(2);
  }
}

async function stripe(path, params, idempotencyKey) {
  const body = new URLSearchParams(params);
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/x-www-form-urlencoded",
      ...(idempotencyKey
        ? { "Idempotency-Key": `${IDEMPOTENCY_TAG}-${idempotencyKey}` }
        : {}),
    },
    body,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`${path}: ${res.status} ${json.error?.message ?? ""}`);
  return json;
}

console.log(
  `\nモード: ${isLive ? "本番(live)" : "テスト(test)"}\n` +
    `売価 ¥${shop.price} / 送料 ¥${shop.shipping} / オンライン枠 ${shop.edition}部\n`
);

// --- 1. 商品 ---
const product = await stripe(
  "products",
  {
    name: shop.title,
    description: "写真集 / Photo zine, B5, 32 pages, edition of 50",
    shippable: "true",
    "metadata[slug]": "fade-stay",
  },
  "product"
);
console.log(`✓ 商品        ${product.id}  ${product.name}`);

// --- 2. 価格（税込・JPYは最小単位＝円） ---
const price = await stripe(
  "prices",
  {
    product: product.id,
    currency: "jpy",
    unit_amount: String(shop.price),
    tax_behavior: "inclusive",
  },
  "price"
);
console.log(`✓ 価格        ${price.id}  ¥${price.unit_amount}`);

// --- 3. 配送料レート（レターパックライト・全国一律） ---
const rate = await stripe(
  "shipping_rates",
  {
    display_name: "レターパックライト（全国一律）",
    type: "fixed_amount",
    "fixed_amount[amount]": String(shop.shipping),
    "fixed_amount[currency]": "jpy",
    tax_behavior: "inclusive",
  },
  "shipping_rate"
);
console.log(`✓ 配送料      ${rate.id}  ¥${rate.fixed_amount.amount}`);

// --- 4. Payment Link ---
// 数量は1固定（adjustable_quantity を開けると支払い回数上限が冊数を守れなくなる）。
// restrictions で上限＝オンライン枠。上限到達でリンクは自動的に active:false になる。
const linkParams = {
  "line_items[0][price]": price.id,
  "line_items[0][quantity]": "1",
  "restrictions[completed_sessions][limit]": String(shop.edition),
  "shipping_address_collection[allowed_countries][0]": "JP",
  "shipping_options[0][shipping_rate]": rate.id,
  "automatic_tax[enabled]": "false",
  inactive_message:
    "完売しました。お求めいただきありがとうございました。",
  "after_completion[type]": "hosted_confirmation",
  "after_completion[hosted_confirmation][custom_message]":
    "ご注文ありがとうございます。ご注文確認後、5営業日以内に発送します。",
  "metadata[slug]": "fade-stay",
};

// コンビニ払い・銀行振込は使わない前提（後払い系は payment_status=unpaid で
// 完了扱いになり、販売数の集計と支払い回数上限の両方が狂う）。明示して固定する。
async function createLink(methods) {
  const params = { ...linkParams };
  methods.forEach((m, i) => {
    params[`payment_method_types[${i}]`] = m;
  });
  return stripe("payment_links", params, `link-${methods.join("-")}`);
}

let link;
try {
  link = await createLink(["card", "link"]);
} catch (e) {
  console.log(`  （card+link は不可: ${e.message} → card のみで作成）`);
  link = await createLink(["card"]);
}

console.log(`✓ Payment Link ${link.id}`);
console.log(`\nURL: ${link.url}\n`);
console.log("shop.ts に入れる値:");
console.log(`  paymentLink: ${JSON.stringify(link.url)},`);
console.log(`  paymentLinkId: ${JSON.stringify(link.id)},`);
console.log(
  `\n次: node scripts/check-payment-link.mjs ${link.id}  で設定を機械判定する\n`
);
