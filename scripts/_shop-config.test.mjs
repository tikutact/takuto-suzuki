// node --test 'scripts/*.test.mjs'（Stripe には接続しない。架空のリンク一覧で判定する）
import { test } from "node:test";
import assert from "node:assert/strict";
import { findDuplicateLinks } from "./_shop-config.mjs";

const shop = { slug: "fade-stay", paymentLinkId: "plink_TEST_LIVE" };

test("metadata.slug が同じ有効なリンクは重複として拾う", () => {
  const dup = findDuplicateLinks({ ok: true, body: { data: [{ id: "plink_X", metadata: { slug: "fade-stay" } }] } }, shop);
  assert.deepEqual(dup.map((l) => l.id), ["plink_X"]);
});

test("metadata が無くても shop.ts の paymentLinkId と同じリンクは重複として拾う（ダッシュボードで作ったリンク）", () => {
  const dup = findDuplicateLinks({ ok: true, body: { data: [{ id: "plink_TEST_LIVE", metadata: {} }] } }, shop);
  assert.deepEqual(dup.map((l) => l.id), ["plink_TEST_LIVE"]);
});

test("一覧の取得に失敗したら「重複なし」と扱わずに落とす", () => {
  assert.throws(() => findDuplicateLinks({ ok: false, status: 429, body: { error: { message: "rate limited" } } }, shop));
});

test("一覧が100件で打ち切られている（has_more）なら確認しきれないので落とす", () => {
  assert.throws(() => findDuplicateLinks({ ok: true, body: { data: [], has_more: true } }, shop));
});

test("別商品のリンクは拾わない", () => {
  const dup = findDuplicateLinks({ ok: true, body: { data: [{ id: "plink_Y", metadata: { slug: "other" } }] } }, shop);
  assert.equal(dup.length, 0);
});
