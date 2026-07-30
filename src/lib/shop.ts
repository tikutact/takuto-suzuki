export type Product = {
  slug: string;
  title: string;
  /** 税込価格。null の間は「PRICE TBD」表示で購入ボタンも無効になる */
  price: number | null;
  /** Stripe Payment Link のURL。null の間は購入ボタンが無効になる */
  paymentLink: string | null;
  /** Payment LinkのID（plink_...）。設定するとStripeの販売数で自動Sold Out判定 */
  paymentLinkId: string | null;
  /** オンライン販売枠。Stripeの販売数がここに達すると自動でSold Out表示
   *（作品の総エディション数はspecsの表記。店頭販売分はここに含めない。
   *  Payment Linkの支払い回数上限もこの数に合わせる） */
  edition: number;
  /** 手動の売り切れフラグ（自動判定と併用・どちらかが真ならSold Out） */
  soldOut: boolean;
  specs: string[];
  description: string;
  /** public/ 配下のパス。空の間はプレースホルダー表示 */
  images: string[];
};

export const products: Product[] = [
  {
    slug: "fade-stay",
    title: "Fade, Stay",
    price: 2500,
    paymentLink: null,
    paymentLinkId: null,
    edition: 20,
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
