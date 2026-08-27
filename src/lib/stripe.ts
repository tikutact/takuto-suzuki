type CheckoutSession = {
  payment_status?: string;
  line_items?: { data?: { quantity: number | null }[] };
};

/**
 * Payment Link経由で完了した販売冊数をStripeに問い合わせる。
 * キー未設定・API失敗時はnull（呼び出し側は手動soldOutフラグのみで判定）。
 *
 * 売り越しの最後の砦は Stripe 側の設定であって、ここではない。
 * **Payment Link に「支払い回数の上限 = edition」と「数量変更を不可」の
 * 両方が設定されていることが前提**。数量変更を許可すると上限は「回数」
 * しか止められないので、1回で複数冊売れて上限を超える。
 *
 * 失敗はすべて null に倒れる＝「売り切れていない」扱いになるので、
 * 気づけるように必ずログを出す。
 */
export async function getSoldCount(
  paymentLinkId: string
): Promise<number | null> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    console.error(
      "[shop] STRIPE_SECRET_KEY が未設定です。自動Sold Out判定は行われません。"
    );
    return null;
  }

  try {
    const params = new URLSearchParams({
      payment_link: paymentLinkId,
      status: "complete",
      limit: "100",
    });
    params.append("expand[]", "data.line_items");
    const res = await fetch(
      `https://api.stripe.com/v1/checkout/sessions?${params}`,
      {
        headers: { Authorization: `Bearer ${key}` },
        signal: AbortSignal.timeout(8000),
      }
    );
    if (!res.ok) {
      // status だけだと「テストキーで本番リンクを引いた」「plink_ の打ち間違い」
      // 「リンクを消した」がどれも 400 で見分けられない。Stripeは本文に
      // "No such payment link: '...'" のように理由を書いてくるので必ず一緒に出す。
      let detail = "";
      try {
        const body = (await res.json()) as { error?: { message?: string; code?: string } };
        detail = [body.error?.code, body.error?.message].filter(Boolean).join(" / ");
      } catch {
        detail = "(エラー本文を読めませんでした)";
      }
      console.error(
        `[shop] Stripe API が ${res.status} を返しました（${paymentLinkId}）: ${detail}` +
          ` — 自動Sold Out判定を行いません。`
      );
      return null;
    }
    const json: { data: CheckoutSession[]; has_more?: boolean } =
      await res.json();

    // 100件を超えたら数え落としが出る。ここで null を返すと「売り切れていない」
    // 扱いになり、以後この商品は何冊売れても永久にSold Outにならない＝逆に危ない。
    // 販売枠は shop.ts の assertProducts で100未満を強制しているので、
    // 完了セッションが100件を超えている時点で枠は確実に埋まっている。売り止める。
    if (json.has_more) {
      console.error(
        "[shop] 完了セッションが100件を超えました。枠（<100）は確実に超えているのでSold Outにします。"
      );
      return Number.MAX_SAFE_INTEGER;
    }

    return json.data
      // status=complete は入金完了を意味しない（コンビニ払い等を有効にすると
      // 未入金のまま complete になる）。入金済みだけを冊数に数える。
      .filter(
        (s) =>
          s.payment_status === "paid" ||
          s.payment_status === "no_payment_required"
      )
      .reduce((sum, session) => {
        const items = session.line_items?.data;
        // 数量は Payment Link 側で1固定にしてある前提。
        // 取れなかった場合も1セッション=1冊として数える。
        if (!items || items.length === 0) return sum + 1;
        return sum + items.reduce((q, item) => q + (item.quantity ?? 1), 0);
      }, 0);
  } catch (e) {
    console.error("[shop] Stripe への問い合わせに失敗しました:", e);
    return null;
  }
}
