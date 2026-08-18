/**
 * 決済スクリプト2本の共通部分（鍵の選択と shop.ts の読み取り）。
 *
 * ここを分けた理由: 同じ処理を2本に写経していたため、
 * 「shop.ts の1件目だけ読む」「0 を読み取り失敗と誤判定する」といった不具合が
 * 片方だけ直る形になっていた。
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

export const root = join(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * 鍵の選択は「フラグで明示的に選ぶ」。
 *
 * 以前は --test がガードを外すだけで鍵を切り替えず、live キーが環境変数に
 * 入ったまま --test を打つと本番に商品と決済リンクが作られる状態だった。
 * また本番キーは .env.local に STRIPE_SECRET_KEY_LIVE として置いてあるのに
 * どのスクリプトも読まず、コマンドラインに sk_live_ を書く手順になっていた
 * （シェル履歴に平文で残る）。両方ともここで閉じる。
 */
export function loadKey({ live }) {
  const varName = live ? "STRIPE_SECRET_KEY_LIVE" : "STRIPE_SECRET_KEY";
  const key = readEnv(varName) ?? (live ? null : readEnv("STRIPE_SECRET_KEY"));
  if (!key) {
    throw new Error(
      `${varName} が見つかりません（.env.local か環境変数）。` +
        (live ? "\n本番キーは .env.local に STRIPE_SECRET_KEY_LIVE= の行で置く。" : "")
    );
  }
  const isLive = key.startsWith("sk_live_") || key.startsWith("rk_live_");
  // 名前と中身の食い違いを検出する（LIVE 変数にテストキーを入れた等）
  if (live && !isLive) throw new Error("--live なのにテストキーです。STRIPE_SECRET_KEY_LIVE の中身を確認してください。");
  if (!live && isLive) {
    throw new Error(
      "本番キーが読み込まれました。本番を操作するなら --live を明示してください。"
    );
  }
  return { key, isLive };
}

function readEnv(name) {
  const fromProcess = process.env[name];
  if (fromProcess) return unquote(fromProcess);
  try {
    const raw = readFileSync(join(root, ".env.local"), "utf8");
    const m = raw.match(new RegExp(`^${name}=(.+)$`, "m"));
    if (m) return unquote(m[1]);
  } catch {}
  return null;
}

/** `KEY="value"` と書かれていても剥がす（剥がさないと Bearer に引用符が混じって401になる） */
function unquote(v) {
  return v.trim().replace(/^["'](.*)["']$/, "$1");
}

/**
 * shop.ts から1商品ぶんの設定を読む。
 *
 * 以前は正規表現でファイル全体の「最初のマッチ」を取っていたため、
 * 商品が2点になった瞬間に別の商品の価格・部数を期待値として
 * 検査してしまう（しかも無警告）状態だった。slug でブロックを切り出す。
 */
export function loadProduct(slug) {
  const src = readFileSync(join(root, "src/lib/shop.ts"), "utf8");
  const marker = `slug: "${slug}"`;
  const start = src.indexOf(marker);
  if (start === -1) throw new Error(`shop.ts に slug "${slug}" の商品がありません`);
  const nextStart = src.indexOf('slug: "', start + marker.length);
  const block = src.slice(start, nextStart === -1 ? src.length : nextStart);

  return {
    slug,
    title: str(block, /^\s*title:\s*"([^"]+)"/m, "title"),
    price: numOrNull(block, /^\s*price:\s*(\d+|null),/m, "price"),
    edition: num(block, /^\s*edition:\s*(\d+),/m, "edition"),
    refunded: num(block, /^\s*refunded:\s*(\d+),/m, "refunded"),
    paymentLink: strOrNull(block, /^\s*paymentLink:\s*("([^"]*)"|null),/m),
    paymentLinkId: strOrNull(block, /^\s*paymentLinkId:\s*("([^"]*)"|null),/m),
    // 送料は商品ごとではなくファイル全体の定数
    shipping: num(src, /SHIPPING_JPY\s*=\s*(\d+)/, "SHIPPING_JPY"),
  };
}

/** 販売を止める閾値。返品が出ると完了セッションは戻らないので、その分だけ上限を広げる。
 *  edition（＝購入者への約束・特商法ページの表示）は動かさない。 */
export function salesCap(product) {
  return product.edition + product.refunded;
}

function str(src, re, name) {
  const m = src.match(re);
  if (!m) throw new Error(`shop.ts から ${name} を読めませんでした`);
  return m[1];
}

function num(src, re, name) {
  const m = src.match(re);
  const v = m ? Number(m[1]) : NaN;
  // Number(null) は 0 になる。0 は正当な値（送料無料・枠を閉じる）なので
  // 「読めなかった」と混同しないよう isFinite で判定する
  if (!Number.isFinite(v)) throw new Error(`shop.ts から ${name} を読めませんでした`);
  return v;
}

function numOrNull(src, re, name) {
  const m = src.match(re);
  if (!m) throw new Error(`shop.ts から ${name} を読めませんでした`);
  return m[1] === "null" ? null : Number(m[1]);
}

function strOrNull(src, re) {
  const m = src.match(re);
  if (!m || m[1] === "null") return null;
  return m[2];
}

/** 共通の引数解析。--live / --test / --force / --slug=xxx */
export function parseArgs(argv) {
  const flags = argv.filter((a) => a.startsWith("--"));
  const rest = argv.filter((a) => !a.startsWith("--"));
  const slugFlag = flags.find((f) => f.startsWith("--slug="));
  return {
    live: flags.includes("--live"),
    force: flags.includes("--force"),
    slug: slugFlag ? slugFlag.slice("--slug=".length) : "fade-stay",
    rest,
  };
}

/** Stripe REST（GET）。鍵は絶対に出力しない */
export async function stripeGet(key, path, params = {}) {
  const q = new URLSearchParams(params);
  const url = `https://api.stripe.com/v1/${path}${q.toString() ? `?${q}` : ""}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${key}` } });
  const json = await res.json();
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status} ${json.error?.message ?? ""}`);
  return json;
}
