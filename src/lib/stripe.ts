type CheckoutSession = {
  line_items?: { data?: { quantity: number | null }[] };
};

/**
 * Payment Link経由で完了した販売冊数をStripeに問い合わせる。
 * キー未設定・API失敗時はnull（呼び出し側は手動soldOutフラグのみで判定）。
 * 売り越し自体はPayment Link側の支払い回数上限で防いでいるため、
 * ここが取れなくても在庫超過は起きない。
 */
export async function getSoldCount(
  paymentLinkId: string
): Promise<number | null> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;

  try {
    const params = new URLSearchParams({
      payment_link: paymentLinkId,
      status: "complete",
      limit: "100",
    });
    params.append("expand[]", "data.line_items");
    const res = await fetch(
      `https://api.stripe.com/v1/checkout/sessions?${params}`,
      { headers: { Authorization: `Bearer ${key}` } }
    );
    if (!res.ok) return null;
    const json: { data: CheckoutSession[] } = await res.json();
    return json.data.reduce(
      (sum, session) =>
        sum +
        (session.line_items?.data?.reduce(
          (q, item) => q + (item.quantity ?? 1),
          0
        ) ?? 1),
      0
    );
  } catch {
    return null;
  }
}
