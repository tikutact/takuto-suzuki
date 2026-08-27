import type { Product } from "@/lib/shop";
import { salesCap } from "@/lib/shop";
import { getPaymentLinkState } from "@/lib/stripe";

/** 購入ボタンの出しどころ。
 *
 *  「Sold Out」と「一時的に買えない」を分けるのが肝。**Sold Out は客が二度と
 *  戻ってこない表示**なので、まだ在庫があるのに出してはいけない。逆に、
 *  死んでいるリンクに Purchase で客を送るのも避ける。だから3状態にする。 */
export type SaleStatus = "purchase" | "sold_out" | "unavailable";

export async function saleStatus(product: Product): Promise<SaleStatus> {
  if (product.soldOut) return "sold_out";
  if (!product.paymentLink || !product.paymentLinkId || product.price === null) {
    return "unavailable";
  }

  const state = await getPaymentLinkState(product.paymentLinkId);

  // API障害・鍵ミス・タイムアウト。この場合 Stripe 側の支払い回数上限は生きているので、
  // 売り止めずに任せる（押しても上限を超えていれば Stripe が弾く）。
  if (state === null) return "purchase";

  // 砦そのものが消えている2つ。ここだけは売り止める。
  // Sold Out ではなく unavailable にするのは、完売した事実が無いから
  // （設定ミスで「完売」と言ってしまうと取り返しがつかない）。
  if (state.soldCount === null) return "unavailable";
  if (!state.oneCopyPerSession) return "unavailable";

  if (state.soldCount >= salesCap(product)) return "sold_out";

  // 完売していないのに止まっている＝価格や送料を直すための一時停止など。
  // ここで Sold Out を出すと、在庫があるのに客を失う。
  if (!state.active) return "unavailable";

  return "purchase";
}

