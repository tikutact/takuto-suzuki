export type Product = {
  slug: string;
  title: string;
  /** 税込価格。null の間は「PRICE TBD」表示で購入ボタンも無効になる */
  price: number | null;
  /** Stripe Payment Link のURL。null の間は購入ボタンが無効になる */
  paymentLink: string | null;
  /** Payment LinkのID（plink_...）。設定するとStripeの販売数で自動Sold Out判定 */
  paymentLinkId: string | null;
  /** 販売部数。Stripeの販売数がここに達すると自動でSold Out表示 */
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
    title: "fade, stay",
    price: 2500,
    paymentLink: null,
    paymentLinkId: null,
    edition: 50,
    soldOut: false,
    specs: [
      "Photo zine",
      "B5 / 32 pages",
      "Saddle-stitched with silver thread",
      "Edition of 50",
    ],
    description:
      "消えかけている光と、そこに留まるもの。日常の中で見過ごされていく一瞬を綴じた2冊目のZINE。",
    images: [],
  },
];

export function getProduct(slug: string): Product | undefined {
  return products.find((p) => p.slug === slug);
}
