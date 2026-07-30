export type Product = {
  slug: string;
  title: string;
  /** 税込価格。null の間は「PRICE TBD」表示で購入ボタンも無効になる */
  price: number | null;
  /** Stripe Payment Link のURL。null の間は購入ボタンが無効になる */
  paymentLink: string | null;
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
    price: null,
    paymentLink: null,
    soldOut: false,
    specs: [
      "Photo zine",
      "B5 / 32 pages",
      "Saddle-stitched with silver thread",
      "Edition of 10",
    ],
    description:
      "消えかけている光と、そこに留まるもの。日常の中で見過ごされていく一瞬を綴じた2冊目のZINE。",
    images: [],
  },
];

export function getProduct(slug: string): Product | undefined {
  return products.find((p) => p.slug === slug);
}
