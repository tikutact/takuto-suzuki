#!/usr/bin/env node
/**
 * 既存の Payment Link に「決済ボタンの近くに出す文」（custom_text[submit][message]）を入れる。
 *
 *   node scripts/set-checkout-notice.mjs --live            # shop.ts の paymentLinkId に入れる
 *   node scripts/set-checkout-notice.mjs --live plink_...  # リンクを指定
 *   node scripts/set-checkout-notice.mjs                   # テストモードで練習
 *
 * 文面は _shop-config.mjs の checkoutNotice()（特商法の最終確認画面・発送日数は shop.ts から）。
 * 新しく作るリンクには create-payment-link.mjs が最初から入れるので、これは既存リンク用。
 * 入れたあとは `node scripts/check-payment-link.mjs --live` で ✓ になるのを確かめる。
 *
 * 書き換えるのはこの1項目だけ（上限・価格・有効/無効には触らない）。
 * 既に同じ文が入っていれば何もしない。
 */

import { loadKey, loadProduct, parseArgs, stripeGet, checkoutNotice } from "./_shop-config.mjs";

async function stripePost(key, path, params) {
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/x-www-form-urlencoded",
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
  const plinkId = args.rest[0] || shop.paymentLinkId;
  if (!plinkId || !plinkId.startsWith("plink_")) {
    console.error("Payment Link ID が未設定です。shop.ts の paymentLinkId を埋めるか、引数で plink_... を渡してください。");
    process.exit(1);
  }
  // 別商品・旧リンクの文を書き換えないよう、shop.ts の現行リンク以外は --force が要る
  if (shop.paymentLinkId && plinkId !== shop.paymentLinkId && !args.force) {
    console.error(`指定されたリンク ${plinkId} は shop.ts の paymentLinkId（${shop.paymentLinkId}）と違います。意図的なら --force。`);
    process.exit(2);
  }

  const message = checkoutNotice(shop);
  const before = await stripeGet(key, `payment_links/${plinkId}`);
  const current = before.custom_text?.submit?.message ?? "";

  console.log(`モード: ${isLive ? "本番(live)" : "テスト(test)"}`);
  console.log(`商品: ${shop.title}（${shop.slug}）`);
  console.log(`Payment Link: ${plinkId}${before.active ? "" : "（現在 inactive）"}`);
  console.log(`今の文: ${current || "（なし）"}`);
  console.log(`入れる文: ${message}\n`);

  if (current === message) {
    console.log("✓ 既に同じ文が入っています。何もしません。");
    return;
  }

  const updated = await stripePost(key, `payment_links/${plinkId}`, {
    "custom_text[submit][message]": message,
  });
  if (updated.custom_text?.submit?.message !== message) {
    throw new Error("更新後の文が一致しません。ダッシュボードで確認してください。");
  }
  console.log("✓ 決済ボタンの近くに文を入れました。");
  console.log(`\n確認: node scripts/check-payment-link.mjs ${isLive ? "--live " : ""}${plinkId}`);
}

main().catch((err) => {
  console.error(`失敗しました: ${err.message}`);
  process.exit(1);
});
