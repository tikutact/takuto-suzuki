#!/usr/bin/env node
/**
 * 返品・返金で戻ってきた1冊を再販可能にする（Stripe側だけ）。
 *
 *   node scripts/bump-restock.mjs --live plink_...          # +1
 *   node scripts/bump-restock.mjs --live plink_... --by=2   # +2
 *
 * 鍵は --live なら .env.local の STRIPE_SECRET_KEY_LIVE、既定は STRIPE_SECRET_KEY。
 *
 * shop.ts の `restocked` はこのスクリプトが自動で書き換えない
 * （法定表示に出る値なので、上げていい状況か人が確認する前提を残す）。
 * このスクリプトが行うのは Stripe Payment Link 側の支払い回数上限を
 * `salesCap(product)`（= 更新後の想定 restocked を反映した値）に合わせて
 * 引き上げること。上限到達で自動的に active:false になっている場合は
 * 再有効化もあわせて行う（上限を上げるだけでは復活しないため）。
 *
 * 実行後にやること: shop.ts の restocked を実際に +by し、
 * `node scripts/check-payment-link.mjs --live` で整合を確認してから push。
 */

import { loadKey, loadProduct, salesCap, parseArgs } from "./_shop-config.mjs";

async function stripeGet(key, path) {
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    headers: { Authorization: `Bearer ${key}` },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status} ${json.error?.message ?? ""}`);
  return json;
}

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
  const plinkId = args.rest[0];
  if (!plinkId || !plinkId.startsWith("plink_")) {
    console.error("使い方: node scripts/bump-restock.mjs --live plink_... [--by=1]");
    process.exit(1);
  }
  const byFlag = process.argv.find((a) => a.startsWith("--by="));
  const by = byFlag ? Number(byFlag.slice("--by=".length)) : 1;
  if (!Number.isInteger(by) || by <= 0) {
    console.error(`--by は正の整数で指定してください（受け取った値: ${byFlag ?? "未指定"}）`);
    process.exit(1);
  }

  const { key } = loadKey({ live: args.live });
  const shop = loadProduct(args.slug);
  const currentCap = salesCap(shop); // shop.ts の現在値ベース
  const newCap = currentCap + by;

  const before = await stripeGet(key, `payment_links/${plinkId}`);
  const beforeLimit = before.restrictions?.completed_sessions?.limit ?? null;

  console.log(`商品: ${shop.title}（${shop.slug}）`);
  console.log(`Payment Link: ${plinkId}${before.active ? "" : "（現在 inactive）"}`);
  console.log(`shop.ts現在値: edition=${shop.edition} + restocked=${shop.restocked} = ${currentCap}`);
  console.log(`Stripe側の現在の上限: ${beforeLimit}`);
  console.log(`→ ${newCap} に更新します（+${by}）\n`);

  if (beforeLimit !== currentCap) {
    console.log(
      `⚠ Stripe側の上限(${beforeLimit})がshop.tsから計算した現在値(${currentCap})と一致していません。` +
        `そのまま+${by}した${newCap}に更新します。想定と違う場合はCtrl+Cで中断してください。\n`
    );
  }

  const updated = await stripePost(key, `payment_links/${plinkId}`, {
    "restrictions[completed_sessions][limit]": String(newCap),
  });
  console.log(`✓ 上限を ${updated.restrictions?.completed_sessions?.limit} に更新しました`);

  if (!updated.active) {
    const reactivated = await stripePost(key, `payment_links/${plinkId}`, { active: "true" });
    console.log(`✓ 上限到達でinactiveになっていたため再有効化しました（active=${reactivated.active}）`);
  }

  console.log(
    `\n残作業: shop.ts の restocked を ${shop.restocked} → ${shop.restocked + by} に更新して` +
      ` push し、node scripts/check-payment-link.mjs --live ${plinkId} で整合を確認してください。`
  );
}

main().catch((err) => {
  console.error(`失敗しました: ${err.message}`);
  process.exit(1);
});
