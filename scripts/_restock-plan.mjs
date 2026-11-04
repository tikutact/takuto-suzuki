/**
 * bump-restock.mjs の判定部分（通信しない純粋関数。テストは _restock-plan.test.mjs）。
 *
 * 以前は「Stripe側の上限が shop.ts と一致しない」ときに
 * 「想定と違う場合はCtrl+Cで中断してください」と表示した**直後に**更新していた
 * （待ち時間が無いので中断できない）。その結果、
 *   - 同じコマンドを2回打つ
 *   - docs/shop-emails.md の手順どおり shop.ts の restocked を先に +1 してから実行する
 * のどちらでも上限が +2 になり、本当の在庫より1冊多く売れる状態になった。
 * 不一致は「既に誰かが上げた」可能性が高いので、--force が無い限り止める。
 */
export function planRestockBump({ shop, plinkId, by, beforeLimit, force }) {
  const currentCap = shop.edition + shop.restocked;
  const newCap = currentCap + by;
  if (force) return { currentCap, newCap };

  if (shop.paymentLinkId && plinkId !== shop.paymentLinkId) {
    return {
      currentCap,
      newCap,
      error:
        `指定されたリンク ${plinkId} は shop.ts の ${shop.slug} の paymentLinkId（${shop.paymentLinkId}）と違います。` +
        `別商品・旧リンク・テスト用リンクの上限を書き換えるおそれがあるので止めました（意図的なら --force）。`,
    };
  }
  if (shop.soldOut) {
    return {
      currentCap,
      newCap,
      error:
        `shop.ts の ${shop.slug} は soldOut:true です。再販枠を増やしてリンクを再有効化すると、` +
        `サイトは Sold Out のまま URL を知っている人だけが買える状態になります。先に soldOut を見直してください。`,
    };
  }
  if (beforeLimit !== currentCap) {
    const hint =
      beforeLimit === currentCap - by
        ? `shop.ts の restocked を先に上げた状態に見えます。その場合このスクリプトは不要で、` +
          `Stripe の上限を ${currentCap} にすれば揃います（--force は使わない）。`
        : beforeLimit === newCap
          ? `Stripe 側は既に ${newCap} です（このスクリプトを実行済み？）。残りは shop.ts の restocked の更新です。`
          : `どちらが正しいか確認してから、意図的に進めるなら --force を付けてください。`;
    return {
      currentCap,
      newCap,
      error:
        `Stripe側の上限(${beforeLimit ?? "未設定"})が shop.ts から計算した現在値(${currentCap})と一致しません。` +
        `このまま +${by} すると枠が二重に増えるおそれがあるので止めました。\n${hint}`,
    };
  }
  return { currentCap, newCap };
}
