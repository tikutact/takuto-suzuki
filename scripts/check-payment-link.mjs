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

/** テストモードで走らせたか。合格しても「発売してよい」とは言わせない */
let isRehearsal = false;

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
  const verdict =
    failed !== 0
      ? `${failed} 件が未設定または不一致です。直してから発売してください。`
      : isRehearsal
        ? "すべて OK。ただし**テストモードのリハーサル**です。\n" +
          "   本番のリンクは別物なので、発売前に `--live` で必ず通し直してください。"
        : "すべて OK。発売して問題ありません。";
  console.log(`\n${verdict}\n`);
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
  // ここで無条件に失敗させると、テストモードでのリハーサルに「全項目OK」の状態が
  // 存在しなくなる。本物の設定漏れが1件混ざっても件数が増えるだけで見分けられない。
  // 失敗にはせず、最後に「これはリハーサルである」と大きく出す（report側）。
  if (!link.livemode) isRehearsal = true;

  // --- 2. リンクが有効 ---
  // 上限に達すると自動で active:false になり、上限を上げても復活しない（実測）。
  // 手動 soldOut はサイトの表示を消すだけで、Stripe のリンクには何も伝わらない。
  // Payment Link の URL は過去のタブ・ブックマーク・共有先に残るので、
  // active のままだと在庫が無いのに決済が通る（受けられない注文が入る）。
  check(!(product.soldOut && link.active),
    "shop.ts の soldOut と Stripe リンクの状態が整合",
    product.soldOut && link.active
      ? "shop.ts は soldOut:true ですが Payment Link が active のままです。URLを直接開けば購入できてしまいます（ダッシュボードでリンクを無効化してください）"
      : "");

  // active であるべきかは「まだ売る状態か」で変わる。ここを一律 active 必須にすると、
  // **正しく完売した日にチェッカーを回すと「active=true にしろ」と言われる**
  // （＝在庫ゼロで決済が通る状態に戻せ、という指示になる）。
  // 完売は2経路ある: 手動の soldOut と、上限到達でStripeが自動で落とす方。両方見る。
  const soldSoFar = link.restrictions?.completed_sessions?.count ?? null;
  const capReached = soldSoFar !== null && soldSoFar >= salesCap(product);
  if (product.soldOut || capReached) {
    check(!link.active, "完売状態に合わせてリンクが無効（active=false）",
      link.active
        ? `完売（${product.soldOut ? "shop.ts の soldOut" : `上限到達 ${soldSoFar}/${salesCap(product)}`}）なのにリンクが生きています。ダッシュボードで無効化してください`
        : "");
  } else {
    check(link.active, "リンクが有効（active）",
      link.active ? "" : "無効化されています。上限を上げただけでは復活しないので active=true を明示してください");
  }

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
    `支払い回数の上限が ${cap}（edition ${product.edition} + 再販分 ${product.restocked}）`,
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
  // 1回100件までしか返らないので最後までページ送りする。ここを1ページで止めると、
  // 増刷して枠が100を超えたときに販売数が黙って過少になる。
  const allSessions = [];
  let after;
  for (;;) {
    const page = await stripeGet(key, "checkout/sessions", {
      payment_link: plinkId, status: "complete", limit: "100",
      "expand[]": "data.line_items",
      ...(after ? { starting_after: after } : {}),
    });
    allSessions.push(...page.data);
    if (!page.has_more || page.data.length === 0) break;
    after = page.data[page.data.length - 1].id;
  }

  // サイト（src/lib/stripe.ts）は Payment Link 自身の completed_sessions.count を
  // 見るようになったので、ここは**突き合わせ用の別勘定**。
  const isPaid = (s) =>
    s.payment_status === "paid" || s.payment_status === "no_payment_required";
  const copies = (s) => {
    const items = s.line_items?.data;
    if (!items || items.length === 0) return 1;
    return items.reduce((q, i) => q + (i.quantity ?? 1), 0);
  };
  const paid = allSessions.filter(isPaid).reduce((sum, s) => sum + copies(s), 0);
  const unpaid = allSessions.length - allSessions.filter(isPaid).length;
  const stripeCount = link.restrictions?.completed_sessions?.count ?? null;

  check(true, `販売数: 入金済み ${paid}冊 / 枠 ${cap}`,
    stripeCount !== null ? `サイトが見る件数（Stripeの上限判定と同じ値）=${stripeCount}` : "");

  // ズレは2方向あって、原因も対処も逆。まとめて1つの判定にすると誤診する。
  // ・冊数 > 件数 … 1回のチェックアウトで複数冊出ている（上限が冊数を守れない）
  // ・冊数 < 件数 … 完了したが未入金のセッションが枠だけ食っている（後払い系）
  check(stripeCount === null || paid <= stripeCount,
    "1セッションあたり1冊（冊数がStripeの件数を超えていない）",
    stripeCount !== null && paid > stripeCount
      ? `入金済み${paid}冊 に対しStripeの件数は${stripeCount}。1回で複数冊売れており、支払い回数の上限では冊数を守れていません`
      : "");
  check(unpaid === 0, "未入金のまま枠を食っているセッションが無い",
    unpaid > 0
      ? `完了したが未入金のセッションが${unpaid}件あります。Stripeの上限は消費されるのに冊数には数えません`
      : "");

  report();
}

main().catch((e) => report(e.message));
