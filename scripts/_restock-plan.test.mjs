// node --test scripts/  （Stripe には接続しない。架空の値だけで判定ロジックを確かめる）
import { test } from "node:test";
import assert from "node:assert/strict";
import { planRestockBump } from "./_restock-plan.mjs";

const shop = {
  slug: "fade-stay",
  edition: 30,
  restocked: 1,
  soldOut: false,
  paymentLinkId: "plink_TEST_A",
};

test("Stripe側の上限が shop.ts と一致していれば +by した値で更新する", () => {
  const r = planRestockBump({ shop, plinkId: "plink_TEST_A", by: 1, beforeLimit: 31, force: false });
  assert.equal(r.error, undefined);
  assert.equal(r.newCap, 32);
});

test("2回目の実行（Stripeだけ既に上がっている）は止める＝二重に枠を増やさない", () => {
  const r = planRestockBump({ shop, plinkId: "plink_TEST_A", by: 1, beforeLimit: 32, force: false });
  assert.ok(r.error);
});

test("shop.ts の restocked を先に上げてから実行した場合も止める（+1 が二重になる）", () => {
  const edited = { ...shop, restocked: 2 }; // cap 32, Stripe はまだ 31
  const r = planRestockBump({ shop: edited, plinkId: "plink_TEST_A", by: 1, beforeLimit: 31, force: false });
  assert.ok(r.error);
});

test("shop.ts の paymentLinkId と違うリンクには触らない", () => {
  const r = planRestockBump({ shop, plinkId: "plink_OTHER", by: 1, beforeLimit: 31, force: false });
  assert.ok(r.error);
});

test("soldOut:true の商品は再販の上限を上げない", () => {
  const r = planRestockBump({ shop: { ...shop, soldOut: true }, plinkId: "plink_TEST_A", by: 1, beforeLimit: 31, force: false });
  assert.ok(r.error);
});

test("--force なら不一致でも進める（明示的な上書き）", () => {
  const r = planRestockBump({ shop, plinkId: "plink_OTHER", by: 1, beforeLimit: 40, force: true });
  assert.equal(r.error, undefined);
  assert.equal(r.newCap, 32);
});
