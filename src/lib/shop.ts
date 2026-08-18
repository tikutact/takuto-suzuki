/**
 * 販売設定。「発売中」は price / paymentLink / paymentLinkId が3つとも揃った状態だけ。
 *
 * paymentLinkId（plink_...）は Payment Link のURLに含まれないため、
 * ダッシュボードを見に行かないと分からない＝入れ忘れやすい。入れ忘れると
 * 自動Sold Out判定が一度も走らないまま完売後も購入ボタンが出続けるので、
 * 「URLだけ入れてIDはnull」をユニオン型で禁止してビルドで落とす。
 */
type SaleConfig =
  | {
      /** 未発売。価格だけ先に決めてもよいが、リンク系は必ず両方 null */
      price: number | null;
      paymentLink: null;
      paymentLinkId: null;
    }
  | {
      /** 発売中。税込価格・Payment LinkのURL・そのIDが3つとも必須 */
      price: number;
      paymentLink: string;
      paymentLinkId: string;
    };

export type Product = SaleConfig & {
  slug: string;
  title: string;
  /** オンライン販売枠。Stripeの販売数がここに達すると自動でSold Out表示
   *（作品の総エディション数はspecsの表記。店頭販売分はここに含めない。
   *  Payment Linkの支払い回数上限もこの数に合わせる）
   *
   *  枠を動かすとき・返品で1冊戻ってきたときの手順（すべて実測で確認済み）:
   *   1. ここの edition を変える
   *   2. Stripe の支払い回数上限を同じ数にする
   *   3. **リンクを明示的に再度有効化する**（上限を上げるだけでは active:false のまま）
   *  URLは変わらないので、コードの再デプロイは要らない。
   *  なお返金してもStripeの完了セッション数は戻らないので、
   *  返品1件につき上限を +1 する必要がある。
   *  上記3点は `node scripts/check-payment-link.mjs` で機械判定できる。 */
  edition: number;
  /** 手動の売り切れフラグ（自動判定と併用・どちらかが真ならSold Out） */
  soldOut: boolean;
  specs: string[];
  description: string;
  /** 1枚目が一覧のヒーロー（B5比率の枠にobject-coverで収まる）。
   *  2枚目以降は本文の下に原寸比率のまま縦に積む。空の間はプレースホルダー表示 */
  images: ShopImage[];
};

/** 写真集は中身が見えないと買う判断がつかないので、表紙の1枚では足りない。
 *  幅と高さを持たせるのは、読み込み前に縦の場所を確保してガタつきを防ぐため。
 *  値は実ファイルから測って入れる（`sips -g pixelWidth -g pixelHeight <file>`）。 */
export type ShopImage = {
  /** public/ 配下のパス */
  src: string;
  width: number;
  height: number;
  /** 何が写っているかを書く（装飾的な言い換えではなく内容） */
  alt: string;
};

/** 送料（全国一律・税込）。レターパックライトの実額。
 *  変更時は Stripe の配送料レートも作り直すこと（サイト表示とStripeの二重管理）。 */
export const SHIPPING_JPY = 430;

export const products: Product[] = [
  {
    slug: "fade-stay",
    title: "Fade, Stay",
    price: 2500,
    paymentLink: null,
    paymentLinkId: null,
    edition: 30,
    soldOut: false,
    specs: [
      "Photo zine",
      "B5 / 32 pages",
      "Saddle-stitched with silver thread",
      "Edition of 50",
    ],
    description: [
      "家を出て、太陽にあたって、雨に降られて、",
      "また家に帰ってくる。",
      "",
      "その行き来のあいだで、街も同じように動いている。",
      "今まであったものがなくなっていたり、",
      "何もなかったところに何かが芽生えたり。",
      "僕たちが知らないところで、ぶつかったり、寄り添ったり。",
      "",
      "いつからか、そんな街を見つめるようになった。",
      "歩きながら目に映る、動きの断片が愛おしい。",
      "消えていくものと、そこに残り続けるもの。",
      "",
      "僕たちも等しく消えていく。残っていく。",
      "一緒に時間を過ごしている、その美しい姿を。",
    ].join("\n"),
    images: [],
  },
];

export function getProduct(slug: string): Product | undefined {
  return products.find((p) => p.slug === slug);
}
