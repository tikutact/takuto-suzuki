/**
 * Payment Link の販売状態を Stripe に問い合わせる。
 *
 * **数え方を自前で持たない。** 以前はセッション一覧を100件取ってきて
 * payment_status で絞り、数量を合算していたが、それは
 * 「Stripeが上限判定に使っている値」とは別ルールの再実装だった。
 * 数え方が2つある以上いつか必ずズレる（実際、後払いを有効にすると
 * Stripeの上限だけが消費されてサイトは数えない、という乖離が起きる）。
 *
 * ここでは Payment Link 自身が持っている2つの値だけを読む:
 *   - active                              … 上限到達でStripeが自動で false にする。
 *                                            手動で停止したときも false。
 *                                            **false なら決済は通らない**
 *   - restrictions.completed_sessions.count … Stripeが上限判定に使う件数そのもの
 *
 * これで100件ページネーションの問題も、数え方の乖離も消える。
 *
 * 通信・認証の失敗時は null（＝判定不能）。呼び出し側は売り止めない方に倒す。
 * 売り越しの最後の砦が Stripe 側の支払い回数上限だからで、API障害や鍵ミスでは
 * その砦は生きている。
 *
 * **ただし砦そのものが消える2つの状態は、ここで検出して売り止める側に倒す**:
 *   - 支払い回数の上限が外されている（数える対象が無い＝Stripeも止めない）
 *   - 数量変更が開いている／数量が1でない（上限は「回数」しか止められないので、
 *     1回のチェックアウトで何冊でも出ていく）
 * どちらも発売前は check-payment-link.mjs が弾くが、**発売後にダッシュボードで
 * 変えられると実行時には何の防御も残らない**。だから毎回ここで見る。
 *
 * 気づけるように失敗は必ず理由つきでログに出す。
 */
export type PaymentLinkState = {
  /** Stripeが上限判定に使っている完了セッション数。上限未設定なら null */
  soldCount: number | null;
  /** false なら決済は通らない（上限到達の自動停止／手動停止のどちらでも） */
  active: boolean;
  /** 1セッション＝1冊が保証されているか。
   *  false だと soldCount（＝セッション件数）が冊数を表さなくなる。 */
  oneCopyPerSession: boolean;
};

export async function getPaymentLinkState(
  paymentLinkId: string
): Promise<PaymentLinkState | null> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    console.error(
      "[shop] STRIPE_SECRET_KEY が未設定です。自動Sold Out判定は行われません。"
    );
    return null;
  }

  try {
    const res = await fetch(
      // line_items を展開して「1セッション=1冊」かどうかも同じ1リクエストで見る
      `https://api.stripe.com/v1/payment_links/${encodeURIComponent(paymentLinkId)}` +
        `?expand[]=line_items`,
      {
        headers: { Authorization: `Bearer ${key}` },
        signal: AbortSignal.timeout(8000),
      }
    );
    if (!res.ok) {
      // status だけだと「テストキーで本番リンクを引いた」「plink_ の打ち間違い」
      // 「リンクを消した」がどれも 404/400 で見分けられない。Stripeは本文に
      // "No such payment link: '...'" のように理由を書いてくるので必ず一緒に出す。
      let detail = "";
      try {
        const body = (await res.json()) as {
          error?: { message?: string; code?: string };
        };
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

    const link = (await res.json()) as {
      active?: boolean;
      restrictions?: { completed_sessions?: { count?: number } };
      line_items?: {
        data?: { quantity?: number; adjustable_quantity?: { enabled?: boolean } | null }[];
      };
    };

    // active が読めないレスポンスは形が想定と違う＝信用しない
    if (typeof link.active !== "boolean") {
      console.error(
        `[shop] Payment Link の応答に active がありません（${paymentLinkId}）。自動Sold Out判定を行いません。`
      );
      return null;
    }

    const count = link.restrictions?.completed_sessions?.count;
    if (typeof count !== "number") {
      // 支払い回数の上限が外れている。数える対象が無いうえにStripeも止めない＝砦がゼロ。
      console.error(
        `[shop] Payment Link に支払い回数の上限が設定されていません（${paymentLinkId}）。` +
          `売り越しを止めるものが無い状態です。ダッシュボードで上限を設定してください。`
      );
    }

    // 明細が取れなかった場合は「1冊とは言い切れない」側に倒す（黙って売らない）
    const items = link.line_items?.data;
    const item = items?.[0];
    const oneCopyPerSession =
      items !== undefined &&
      items.length === 1 &&
      item?.quantity === 1 &&
      item?.adjustable_quantity?.enabled !== true;
    if (!oneCopyPerSession) {
      console.error(
        `[shop] Payment Link が「1セッション=1冊」になっていません（${paymentLinkId}）: ` +
          `明細${items?.length ?? "取得不可"}件 / quantity=${item?.quantity ?? "?"} / ` +
          `数量変更=${item?.adjustable_quantity?.enabled === true ? "可" : "不可"}。` +
          `支払い回数の上限では冊数を守れないので販売を止めます。`
      );
    }

    return {
      soldCount: typeof count === "number" ? count : null,
      active: link.active,
      oneCopyPerSession,
    };
  } catch (e) {
    console.error("[shop] Stripe への問い合わせに失敗しました:", e);
    return null;
  }
}
