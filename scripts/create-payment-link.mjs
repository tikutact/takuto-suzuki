#!/usr/bin/env node
/**
 * Payment Link を作る（商品・価格・配送料レートごと）。
 *
 *   node scripts/create-payment-link.mjs --live   # 本番に作る
 *   node scripts/create-payment-link.mjs          # テストモードで練習
 *
 * 鍵は --live なら .env.local の STRIPE_SECRET_KEY_LIVE、既定は STRIPE_SECRET_KEY。
 * **コマンドラインに sk_live_ を書かないこと**（シェル履歴に平文で残る）。
 * 設定値は shop.ts（price / edition / restocked / totalEdition / SHIPPING_* ）から読むので手打ちしない。
 * 作ったあとは必ず `node scripts/check-payment-link.mjs --live <plink_...>` を通す。
 *
 * なぜスクリプトにするか: 売価を変えるとPayment Linkは作り直しになる（既存リンクの
 * 金額は変えられない）。そのたびにダッシュボードで10項目を手で設定し直すのは
 * 設定漏れの温床で、実際に「送料レートなし＝送料0円で売れる」を一度踏んでいる。
 *
 * **冪等キーはStripe側で24時間で失効する。** 「二度と増えない」保証ではないので、
 * 実行前に同じ商品の有効なリンクが既にないかを必ず確認する（下の重複チェック）。
 * 意図的に作り直すときだけ --force を付ける。
 */

import { createHash } from "node:crypto";
import { loadKey, loadProduct, salesCap, parseArgs } from "./_shop-config.mjs";

/** 冪等キーの版。
 *
 *  手で上げる運用にはしない。**設定は shop.ts 側にあり、あちらを変えた人が
 *  こちらを上げてくれるとは限らない**（実際、価格・送料・発送日数・部数・配送方法は
 *  すべて shop.ts の定数から引くようになったので、トリガーが別ファイルに移った）。
 *  同じキーで違うパラメータを送ると Stripe は 400 idempotency_error を返し、
 *  スクリプトは「途中まで作られたオブジェクトが残っているかも」としか言えない。
 *
 *  そこで送る値そのものから導出する。値が1つでも変われば別のキーになるので、
 *  作り直しは自然に通り、同じ設定での再実行は今までどおり冪等になる。 */
function idempotencyKeyFor(shop, cap, step) {
  const fingerprint = [
    shop.slug, shop.price, shop.shipping, shop.shippingDays,
    shop.shippingMethod, shop.totalEdition, cap,
  ].join("|");
  const hash = createHash("sha256").update(fingerprint).digest("hex").slice(0, 12);
  return `${shop.slug}-${hash}-${step}`;
}

async function stripe(key, path, params, idempotencyKey) {
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/x-www-form-urlencoded",
      ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
    },
    body: new URLSearchParams(params),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status} ${json.error?.message ?? ""}`);
  return json;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const { key, isLive } = loadKey({ live: args.live });
  const shop = loadProduct(args.slug);
  // 冪等キーは商品ごと・設定ごとに別物にする
  // （slug を含めないと2商品目で衝突し、設定を含めないと作り直しが400になる）
  const idem = (step) => idempotencyKeyFor(shop, salesCap(shop), step);
  if (shop.price === null) throw new Error("shop.ts の price が null です。先に売価を決めてください。");

  const cap = salesCap(shop);
  console.log(
    `\nモード: ${isLive ? "本番(live)" : "テスト(test)"}\n` +
      `商品: ${shop.title}（${shop.slug}）\n` +
      `売価 ¥${shop.price} / 送料 ¥${shop.shipping} / 販売枠 ${cap}（edition ${shop.edition} + 再販分 ${shop.restocked}）\n`
  );

  // --- 0. 重複チェック ---
  // 冪等キーは24時間で失効するので、後日の再実行は「もう1本の有効なリンク」を生む。
  // 古いリンクが生きたまま新しいリンクを貼ると、上限30の枠が2本ぶん（実質60）になる。
  const existing = await fetch(
    `https://api.stripe.com/v1/payment_links?active=true&limit=100`,
    { headers: { Authorization: `Bearer ${key}` } }
  ).then((r) => r.json());
  const dup = (existing.data ?? []).filter((l) => l.metadata?.slug === shop.slug);
  if (dup.length && !args.force) {
    console.error(
      `この商品の有効なPayment Linkが既に ${dup.length} 本あります:\n` +
        dup.map((l) => `  ${l.id}  ${l.url}`).join("\n") +
        `\n\n作り直すなら、先に古い方を無効化してから --force を付けてください。` +
        `\n（有効なリンクが2本あると、それぞれが独立に販売枠を持つので売り越します）\n`
    );
    process.exit(2);
  }

  const product = await stripe(key, "products", {
    name: shop.title,
    description: `写真集 / Photo zine, B5, 32 pages, edition of ${shop.totalEdition}`,
    shippable: "true",
    "metadata[slug]": shop.slug,
  }, idem("product"));
  console.log(`✓ 商品        ${product.id}  ${product.name}`);

  const price = await stripe(key, "prices", {
    product: product.id,
    currency: "jpy",
    unit_amount: String(shop.price),
    tax_behavior: "inclusive",
  }, idem("price"));
  console.log(`✓ 価格        ${price.id}  ¥${price.unit_amount}`);

  const rate = await stripe(key, "shipping_rates", {
    display_name: `${shop.shippingMethod}（全国一律）`,
    type: "fixed_amount",
    "fixed_amount[amount]": String(shop.shipping),
    "fixed_amount[currency]": "jpy",
    tax_behavior: "inclusive",
  }, idem("shipping_rate"));
  console.log(`✓ 配送料      ${rate.id}  ¥${rate.fixed_amount.amount}`);

  // 数量は1固定（adjustable_quantity を開けると支払い回数上限が冊数を守れなくなる）。
  // コンビニ払い・銀行振込は使わない（complete でも未入金のまま販売枠を消費する）。
  const linkParams = {
    "line_items[0][price]": price.id,
    "line_items[0][quantity]": "1",
    "restrictions[completed_sessions][limit]": String(cap),
    "shipping_address_collection[allowed_countries][0]": "JP",
    "shipping_options[0][shipping_rate]": rate.id,
    "automatic_tax[enabled]": "false",
    inactive_message: "完売しました。お求めいただきありがとうございました。",
    "after_completion[type]": "hosted_confirmation",
    // 日数は shop.ts の SHIPPING_DAYS から引く。ここに直書きすると、
    // サイト2ページだけ新しい日数に変わり、決済完了直後に購入者が見る画面
    // ＝手元に残る最後の約束だけが古いまま再生産される。
    "after_completion[hosted_confirmation][custom_message]":
      `ご注文ありがとうございます。ご注文確認後、${shop.shippingDays}営業日以内に発送します。`,
    "metadata[slug]": shop.slug,
  };

  const createLink = (methods) => {
    const params = { ...linkParams };
    methods.forEach((m, i) => { params[`payment_method_types[${i}]`] = m; });
    return stripe(key, "payment_links", params, idem(`link-${methods.join("-")}`));
  };

  let link;
  try {
    link = await createLink(["card", "link"]);
  } catch (e) {
    console.log(`  （card+link は不可: ${e.message} → card のみで作成）`);
    link = await createLink(["card"]);
  }

  console.log(`✓ Payment Link ${link.id}`);
  console.log(`\nURL: ${link.url}\n`);
  console.log("shop.ts に入れる値（**必ず両方セットで貼る**。片方だけだと検査を通っても壊れる）:");
  console.log(`  paymentLink: ${JSON.stringify(link.url)},`);
  console.log(`  paymentLinkId: ${JSON.stringify(link.id)},`);
  // --slug を引き継がないと、次のコマンドが既定の fade-stay の価格・枠・送料で
  // 別商品のリンクを検査する。価格が偶然同じなら「すべて OK」と出てしまう。
  const slugFlag = args.slug === "fade-stay" ? "" : `--slug=${args.slug} `;
  console.log(
    `\n次: node scripts/check-payment-link.mjs ${isLive ? "--live " : ""}${slugFlag}${link.id}\n`
  );
}

main().catch((e) => {
  console.error(`\n失敗しました: ${e.message}`);
  console.error("途中まで作られたオブジェクトがStripeに残っている可能性があります。");
  console.error("ダッシュボードで確認し、不要なものは無効化してから再実行してください。\n");
  process.exit(2);
});
