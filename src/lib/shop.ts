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
  /** 作品の総エディション数（店頭販売分を含む）。
   *  specs の "Edition of ◯" と特商法ページの「エディション◯部のうち」が
   *  同じ数を指すので、両方この値から作る（手打ちすると必ず片方だけ古くなる）。 */
  totalEdition: number;
  /** 返品・返金した件数。
   *
   *  返金してもStripeの完了セッションは戻らないので、返品が出ると
   *  「売れた数」が実売より多いまま固定される。その差をここで吸収する
   *  （販売を止める閾値 = edition + refunded。`salesCap()` を使うこと）。
   *
   *  **edition を +1 して代用してはいけない。** edition は購入者への約束で、
   *  特定商取引法のページに「本サイトでの販売は◯部」として表示されるため、
   *  返品のたびに法定表示の部数が勝手に増えることになる。 */
  refunded: number;
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

/* 以下は /shop（商品ページ）と /tokushoho（法定表示）の両方に出る事実。
 * 片方だけ直すと「サイトの表示」と「特定商取引法に基づく表記」が食い違うので、
 * 必ずここから引く。語尾は各ページの文体に合わせてよいが、数字と可否は動かさない。
 * なお発送メールの定型文 `docs/shop-emails.md` にも同じ内容が書いてある。
 * あれは人が読んで貼るテキストなのでコードからは生成しない＝ここを変えたら手で直す。 */

/** 発送までの営業日数（ご注文確認後・土日祝を除く）。 */
export const SHIPPING_DAYS = 5;

/** 配送方法。 */
export const SHIPPING_METHOD = "レターパックライト";

/** 表紙写真の剥がれ・浮きの扱い。返品可否に直結する保証範囲の言明なので、
 *  両ページで**同一文**にする（語尾だけ違うと、どちらが正なのか読めなくなる）。 */
export const COVER_PHOTO_POLICY =
  "表紙に貼り付けた写真の剥がれ・浮きは、経年での変化を想定した仕様であり、不良品には該当しません。";

/** 販売を止める閾値。返金分は完了セッションから戻らないので、その件数だけ広げる。
 *  edition は購入者への約束なので動かさない（[[特商法ページ]]がこの値を表示している）。 */
export function salesCap(product: Product): number {
  return product.edition + product.refunded;
}

/** 『Fade, Stay』の総エディション数。specs と特商法ページの両方がこれを使う。 */
const FADE_STAY_EDITION = 50;

export const products: Product[] = [
  {
    slug: "fade-stay",
    title: "Fade, Stay",
    price: 2500,
    paymentLink: null,
    paymentLinkId: null,
    edition: 30,
    totalEdition: FADE_STAY_EDITION,
    refunded: 0,
    soldOut: false,
    specs: [
      "Photo zine",
      "B5 / 32 pages",
      "Saddle-stitched with silver thread",
      `Edition of ${FADE_STAY_EDITION}`,
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
    images: [
      {
        src: "/images/shop/cover.jpg",
        width: 1800,
        height: 2400,
        alt: "コンクリートの壁に置かれた Fade, Stay の表紙。白い表紙の中央に写真が1枚貼られている",
      },
      {
        src: "/images/shop/spread-01.jpg",
        width: 1800,
        height: 2400,
        alt: "見開きいっぱいに広がる、ブラインドと小さな葉の写真",
      },
      {
        src: "/images/shop/spread-02.jpg",
        width: 1800,
        height: 2400,
        alt: "壁に落ちた木の影と、自分の影が写り込んだ写真の見開き",
      },
      {
        src: "/images/shop/spread-03.jpg",
        width: 1800,
        height: 2400,
        alt: "窓辺の手と、白い花の茂みの写真が向かい合う見開き",
      },
      {
        src: "/images/shop/spread-04.jpg",
        width: 1800,
        height: 2400,
        alt: "室内のテーブルと、逆光のボトルの写真が向かい合う見開き",
      },
      {
        src: "/images/shop/statement-card.jpg",
        width: 1800,
        height: 2400,
        alt: "本に添えられた、ステートメントを印刷したカード",
      },
    ],
  },
];

/** 型では表せない設定の矛盾をビルドで落とす。
 *
 *  ここを通る条件は「間違えても画面は普通に出るが、売れなくなる／表示が嘘になる」もの。
 *  静かに壊れて気づけない類なので、黙って表示するより落とした方が安い。 */
function assertProducts(list: Product[]): void {
  for (const p of list) {
    // 購入リンクを入れた瞬間に salesCap が 0 になり、公開初日から Sold Out になる。
    // 「リンクを入れたのに買えない」は原因が見えにくいので、ここで止める。
    if (p.paymentLinkId !== null && p.edition < 1) {
      throw new Error(
        `shop.ts: ${p.slug} は購入リンクが入っているのに edition が ${p.edition} です。` +
          `販売枠が0なので、公開した瞬間から Sold Out 表示になります。`
      );
    }
    if (p.refunded < 0) {
      throw new Error(`shop.ts: ${p.slug} の refunded が負の値です（${p.refunded}）。`);
    }
    // オンライン枠が総エディション数を超えていたら、どちらかの数字が古い。
    if (p.edition > p.totalEdition) {
      throw new Error(
        `shop.ts: ${p.slug} のオンライン販売枠 ${p.edition} が総エディション数 ${p.totalEdition} を超えています。`
      );
    }
  }
}

assertProducts(products);

export function getProduct(slug: string): Product | undefined {
  return products.find((p) => p.slug === slug);
}
