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
      console.error(
        `[shop] Stripe API が ${res.status} を返しました（${paymentLinkId}）。自動Sold Out判定を行いません。`
      );
      return null;
    }
    const json: { data: CheckoutSession[]; has_more?: boolean } =
      await res.json();

    // 100件を超えると古い分を数え落として過少カウント＝売り越しになる。
    // ページネーション未対応なので、その場合は数えずに諦める（安全側）。
    if (json.has_more) {
      console.error(
        "[shop] 完了セッションが100件を超えました。過少カウントを避けるため判定を中止します。"
      );
      return null;
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
