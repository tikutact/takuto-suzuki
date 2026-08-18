#!/usr/bin/env node
/**
 * Payment Link の設定を機械判定する。発売前に必ず通すこと。
 *
 *   node scripts/check-payment-link.mjs --live          # 本番リンクを検査
 *   node scripts/check-payment-link.mjs                 # テストモード
 *   node scripts/check-payment-link.mjs --live plink_x  # リンクを個別指定
 *
 * 鍵は --live なら .env.local の STRIPE_SECRET_KEY_LIVE、既定は STRIPE_SECRET_KEY。
 * 期待値は shop.ts から読むので手打ちしない。
 *
 * なぜ要るか: 売り越し・送料自腹・表示価格と請求額の食い違いは、どれも
 * 「Stripeダッシュボードの設定漏れ」だけが原因で起きる。コード側からは
 * 一切検知できないので、ここでまとめて突き合わせる。
 */

import { loadKey, loadProduct, salesCap, parseArgs, stripeGet } from "./_shop-config.mjs";

/** 入金が後から起きる決済手段。complete でも未入金のまま販売枠だけ消費するので使わない
 *  （Stripeの支払い回数上限は消費するのに、当方の集計は入金済みしか数えない＝乖離する） */
const DEFERRED_METHODS = new Set([
  "konbini", "customer_balance", "boleto", "oxxo", "multibanco",
  "sofort", "bacs_debit", "sepa_debit", "us_bank_account", "acss_debit",
]);

const results = [];
const check = (ok, label, detail) => results.push({ ok, label, detail: detail ?? "" });

function report(extraError) {
  for (const r of results) {
    console.log(`${r.ok ? "✓" : "✗"} ${r.label}${r.detail ? `  — ${r.detail}` : ""}`);
  }
  if (extraError) {
    console.log(`\n途中で失敗しました: ${extraError}`);
    console.log("ここまでの結果だけ表示しています。\n");
    process.exit(2);
  }
  const failed = results.filter((r) => !r.ok).length;
  console.log(
    `\n${failed === 0 ? "すべて OK。発売して問題ありません。" : `${failed} 件が未設定または不一致です。直してから発売してください。`}\n`
  );
  console.log(
    "※ このスクリプトで確認できないもの: 支払い成功の通知メールがONか、\n" +
      "   購入者への領収書メールがONか、Vercel本番の STRIPE_SECRET_KEY。\n"
  );
  process.exit(failed === 0 ? 0 : 1);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const { key, isLive } = loadKey({ live: args.live });
  const product = loadProduct(args.slug);
  const plinkId = args.rest[0] || product.paymentLinkId;
  if (!plinkId) {
    console.error(
      "Payment Link ID が未設定です。shop.ts の paymentLinkId を埋めるか、引数で plink_... を渡してください。"
    );
    process.exit(2);
  }

  const link = await stripeGet(key, `payment_links/${plinkId}`, { "expand[]": "line_items" });

  console.log(`\n商品: ${product.title}（${product.slug}）`);
  console.log(`Payment Link: ${plinkId}`);
  console.log(`URL: ${link.url}\n`);

  // --- 1. モードの一致 ---
  check(isLive === link.livemode, "キーとPayment Linkのモードが一致",
    `key=${isLive ? "live" : "test"} / link=${link.livemode ? "live" : "test"}`);
  if (!link.livemode) check(false, "本番モードのリンクである", "テストモードのリンクです");

  // --- 2. リンクが有効 ---
  // 上限に達すると自動で active:false になり、上限を上げても復活しない（実測）。
  check(link.active, "リンクが有効（active）",
    link.active ? "" : "無効化されています。上限を上げただけでは復活しないので active=true を明示してください");

  // --- 3. shop.ts の URL と、このリンクの URL が一致 ---
  // ID だけ貼り替えて URL を旧リンクのまま残すと、買い手は旧価格のページへ飛び、
  // 売れた数は新リンク（0件）を見るので永久に Sold Out にならない。
  if (product.paymentLink) {
    check(product.paymentLink === link.url, "shop.ts の paymentLink がこのリンクと同一",
      product.paymentLink === link.url ? "" : `shop.ts=${product.paymentLink}`);
  } else {
    check(true, "shop.ts の paymentLink は未設定（発売前）", "");
  }

  // --- 4. 価格 ---
  const item = link.line_items?.data?.[0];
  check(item != null, "リンクの明細を取得できた", item ? "" : "line_items が取れず、以下の明細系の判定は無効です");
  check(item?.amount_total === product.price, `決済額がサイト表示と一致（¥${product.price}）`,
    `Stripe側=¥${item?.amount_total ?? "?"}`);
  check(link.automatic_tax?.enabled !== true, "Stripe Tax が無効（税込価格で登録済み）",
    link.automatic_tax?.enabled ? "有効になっており上乗せ請求されます" : "");

  // --- 5. 数量固定 ---
  check(item != null && !item.adjustable_quantity?.enabled, "数量変更が不可（1固定）",
    item?.adjustable_quantity?.enabled ? "数量変更が有効＝上限を超えて売れます" : "");
  check(item?.quantity === 1, "数量が1", `quantity=${item?.quantity ?? "?"}`);

  // --- 6. 決済手段に後払い系が混ざっていない ---
  const methods = link.payment_method_types;
  if (Array.isArray(methods) && methods.length > 0) {
    const deferred = methods.filter((m) => DEFERRED_METHODS.has(m));
    check(deferred.length === 0, "後払い・遅延入金の決済手段が無い",
      deferred.length ? `${deferred.join(",")} が有効＝未入金のまま販売枠を消費します` : `有効=${methods.join(",")}`);
  } else {
    check(false, "決済手段が明示的に固定されている",
      "未指定＝ダッシュボードの既定に従うので、後からコンビニ払い等が混ざりうる");
  }

  // --- 7. 支払い回数の上限 = 販売枠（返品分を含む） ---
  const cap = salesCap(product);
  const limit = link.restrictions?.completed_sessions?.limit ?? null;
  check(limit === cap,
    `支払い回数の上限が ${cap}（edition ${product.edition} + 返品 ${product.refunded}）`,
    `Stripe側=${limit ?? "未設定"}`);

  // --- 8. 配送先 ---
  const countries = link.shipping_address_collection?.allowed_countries ?? null;
  check(Array.isArray(countries) && countries.length > 0, "配送先住所を収集する",
    countries ? "" : "未設定＝住所が取れず発送できません");
  check(Array.isArray(countries) && countries.length === 1 && countries[0] === "JP",
    "配送先が日本のみ", countries ? `allowed=${countries.join(",")}` : "");

  // --- 9. 送料 ---
  const rates = link.shipping_options ?? [];
  check(rates.length > 0, `送料が設定されている（¥${product.shipping}）`,
    rates.length ? "" : "未設定＝送料0円で売れて自腹になります");
  if (rates.length) {
    const amounts = [];
    for (const r of rates) {
      const rate = await stripeGet(key, `shipping_rates/${r.shipping_rate}`);
      amounts.push(rate.fixed_amount?.amount);
    }
    check(amounts.every((a) => a === product.shipping), `送料の額がサイト表示と一致（¥${product.shipping}）`,
      `Stripe側=${amounts.map((a) => `¥${a}`).join(", ")}`);
  }

  // --- 10. 販売数（サイトと同じ数え方 + Stripeが上限判定に使っている値） ---
  const sessions = await stripeGet(key, "checkout/sessions", {
    payment_link: plinkId, status: "complete", limit: "100",
  });
  // サイト側（src/lib/stripe.ts）と同じ条件にする。ここがズレると
  // 「サイトは売り切れ、スクリプトはまだ在庫あり」と 食い違う数字が出る。
  const paid = sessions.data.filter(
    (s) => s.payment_status === "paid" || s.payment_status === "no_payment_required"
  ).length;
  const stripeCount = link.restrictions?.completed_sessions?.count ?? null;
  check(!sessions.has_more, "完了セッションが100件以内（1回で数え切れている）",
    sessions.has_more ? "100件を超えており、この販売数は過少です" : "");
  check(true, `販売数: 入金済み ${paid} / 枠 ${cap}`,
    stripeCount !== null ? `Stripeが上限判定に使う件数=${stripeCount}` : "");

  report();
}

main().catch((e) => report(e.message));
