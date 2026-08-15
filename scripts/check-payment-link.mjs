#!/usr/bin/env node
/**
 * Payment Link の設定を機械判定する。発売前に必ず通すこと。
 *
 *   node scripts/check-payment-link.mjs
 *
 * STRIPE_SECRET_KEY は .env.local から読む（引数で plink_... を渡すと個別指定）。
 *
 * なぜ要るか: 売り越し・送料自腹・表示価格と請求額の食い違いは、どれも
 * 「Stripeダッシュボードの設定漏れ」だけが原因で起きる。コード側からは
 * 一切検知できないので、ここでまとめて突き合わせる。
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function loadEnv() {
  if (process.env.STRIPE_SECRET_KEY) return process.env.STRIPE_SECRET_KEY;
  try {
    const raw = readFileSync(join(root, ".env.local"), "utf8");
    const m = raw.match(/^STRIPE_SECRET_KEY=(.+)$/m);
    if (m) return m[1].trim();
  } catch {}
  return null;
}

/** shop.ts から期待値を読む（正規表現で足りる程度の単純な構造） */
function loadExpectations() {
  const src = readFileSync(join(root, "src/lib/shop.ts"), "utf8");
  const pick = (re) => {
    const m = src.match(re);
    return m ? m[1] : null;
  };
  return {
    price: Number(pick(/^\s*price:\s*(\d+),/m)),
    edition: Number(pick(/^\s*edition:\s*(\d+),/m)),
    shipping: Number(pick(/SHIPPING_JPY\s*=\s*(\d+)/)),
    paymentLinkId: pick(/^\s*paymentLinkId:\s*"([^"]+)"/m),
  };
}

const key = loadEnv();
if (!key) {
  console.error("STRIPE_SECRET_KEY が見つかりません（.env.local か環境変数）");
  process.exit(2);
}

const exp = loadExpectations();
const plinkId = process.argv[2] || exp.paymentLinkId;
if (!plinkId) {
  console.error(
    "Payment Link ID が未設定です。shop.ts の paymentLinkId を埋めるか、引数で plink_... を渡してください。"
  );
  process.exit(2);
}

async function stripe(path, params = {}) {
  const q = new URLSearchParams(params);
  const url = `https://api.stripe.com/v1/${path}${q.toString() ? `?${q}` : ""}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${key}` } });
  const json = await res.json();
  if (!res.ok) throw new Error(`${res.status} ${json.error?.message ?? ""}`);
  return json;
}

const results = [];
const check = (ok, label, detail) =>
  results.push({ ok, label, detail: detail ?? "" });

const link = await stripe(`payment_links/${plinkId}`, {
  "expand[]": "line_items",
});

// --- 1. モードの一致（テストキーで本番リンクを見に行く事故の検出） ---
const keyLive = key.startsWith("sk_live_") || key.startsWith("rk_live_");
check(
  keyLive === link.livemode,
  "キーとPayment Linkのモードが一致",
  `key=${keyLive ? "live" : "test"} / link=${link.livemode ? "live" : "test"}`
);
if (!link.livemode)
  check(false, "本番モードのリンクである", "テストモードのリンクです");

// --- 2. リンクが有効 ---
// 上限に達すると自動で active:false になり、**上限を上げても復活しない**（実測）。
// 枠を広げた時・返品で1冊戻した時は active=true を明示すること。URLは変わらない。
check(
  link.active,
  "リンクが有効（active）",
  link.active
    ? ""
    : "無効化されています。上限を上げただけでは復活しないので active=true を明示してください"
);

// --- 3. 価格がサイト表示と一致（税別＋Stripe Tax の罠の検出） ---
const item = link.line_items?.data?.[0];
check(
  item?.amount_total === exp.price,
  `決済額がサイト表示と一致（¥${exp.price}）`,
  `Stripe側=¥${item?.amount_total ?? "?"}`
);
check(
  link.automatic_tax?.enabled !== true,
  "Stripe Tax が無効（税込価格で登録済み）",
  link.automatic_tax?.enabled ? "有効になっており上乗せ請求されます" : ""
);

// --- 4. 数量固定（開けると「支払い回数上限」が冊数を守れなくなる） ---
check(
  !item?.adjustable_quantity?.enabled,
  "数量変更が不可（1固定）",
  item?.adjustable_quantity?.enabled ? "数量変更が有効＝上限を超えて売れます" : ""
);
check(item?.quantity === 1, "数量が1", `quantity=${item?.quantity ?? "?"}`);

// --- 5. 支払い回数の上限＝オンライン枠 ---
const limit = link.restrictions?.completed_sessions?.limit ?? null;
check(
  limit === exp.edition,
  `支払い回数の上限が ${exp.edition}（shop.ts の edition と一致）`,
  `Stripe側=${limit ?? "未設定"}`
);

// --- 6. 配送先住所を収集し、日本のみ ---
const countries = link.shipping_address_collection?.allowed_countries ?? null;
check(
  Array.isArray(countries) && countries.length > 0,
  "配送先住所を収集する",
  countries ? "" : "未設定＝住所が取れず発送できません"
);
check(
  Array.isArray(countries) &&
    countries.length === 1 &&
    countries[0] === "JP",
  "配送先が日本のみ",
  countries ? `allowed=${countries.join(",")}` : ""
);

// --- 7. 送料が設定され、サイト表示と一致 ---
const rates = link.shipping_options ?? [];
check(
  rates.length > 0,
  `送料が設定されている（¥${exp.shipping}）`,
  rates.length ? "" : "未設定＝送料0円で売れて自腹になります"
);
if (rates.length) {
  const amounts = [];
  for (const r of rates) {
    const rate = await stripe(`shipping_rates/${r.shipping_rate}`);
    amounts.push(rate.fixed_amount?.amount);
  }
  check(
    amounts.every((a) => a === exp.shipping),
    `送料の額がサイト表示と一致（¥${exp.shipping}）`,
    `Stripe側=${amounts.map((a) => `¥${a}`).join(", ")}`
  );
}

// --- 8. 現在の販売数 ---
try {
  const sessions = await stripe("checkout/sessions", {
    payment_link: plinkId,
    status: "complete",
    limit: "100",
  });
  const paid = sessions.data.filter((s) => s.payment_status === "paid").length;
  check(true, `現在の販売数: ${paid} / ${exp.edition}`, "");
} catch (e) {
  check(false, "販売数の取得", String(e.message));
}

// --- 出力 ---
console.log(`\nPayment Link: ${plinkId}`);
console.log(`URL: ${link.url}\n`);
for (const r of results) {
  console.log(
    `${r.ok ? "✓" : "✗"} ${r.label}${r.detail ? `  — ${r.detail}` : ""}`
  );
}
const failed = results.filter((r) => !r.ok).length;
console.log(
  `\n${failed === 0 ? "すべて OK。発売して問題ありません。" : `${failed} 件が未設定または不一致です。直してから発売してください。`}\n`
);
console.log(
  "※ このスクリプトで確認できないもの: 支払い成功の通知メールがONか、\n" +
    "   リンク無効時のメッセージ、Vercel本番の STRIPE_SECRET_KEY。\n"
);
process.exit(failed === 0 ? 0 : 1);
