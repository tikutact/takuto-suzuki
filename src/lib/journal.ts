// Journal — 旅・制作のフィールドノート。
// 表示順は date（"YYYY-MM" 形式）の新しい順に自動ソートされる。配列内の並びは気にしなくてよい。
// draft: true の記事は一覧・詳細・サイトマップから除外される（本番に出さない下書き用）。
// 画像の width/height は実寸を入れること（next/image の最適化・レイアウト崩れ防止）。
//   実寸の取得: `sips -g pixelWidth -g pixelHeight public/journal/xxx.jpg`

export type JournalBlock =
  | { type: "text"; value: string }
  | { type: "image"; src: string; width: number; height: number; caption?: string };

export type JournalPost = {
  slug: string;
  title: string;
  date: string; // 表示・ソート用。"2026-07" など
  location?: string; // "Lisbon, Portugal"
  excerpt?: string; // 一覧とメタ説明に使う短い導入
  cover?: string;
  draft?: boolean; // true の間は一覧・詳細・サイトマップに出さない
  body: JournalBlock[];
};

const posts: JournalPost[] = [
  {
    // ↓ これはデザイン確認用のサンプル。実際の記事に差し替えるまで draft のまま。
    draft: true,
    slug: "sample-field-note",
    title: "サンプル — フィールドノート",
    date: "2026-06",
    location: "Nagoya, Japan",
    excerpt:
      "デザイン確認用のサンプル記事です。本文と写真の出方を確かめるために置いています。",
    cover: "/images/ordinary-09.jpg",
    body: [
      {
        type: "text",
        value:
          "ここに、旅先で歩いたことをつらつらと書く。何を見て、どこで足が止まったか。文章はゆるくていい。",
      },
      {
        type: "image",
        src: "/images/ordinary-05.jpg",
        width: 1350,
        height: 1800,
        caption: "壁の影に、誰かが通り過ぎた痕跡",
      },
      {
        type: "text",
        value:
          "脱線してもいいが、最後はどこかで「で、ここで自分は何を見たか／撮ったか」に戻る。それが背骨になる。",
      },
      {
        type: "image",
        src: "/images/ordinary-09.jpg",
        width: 1800,
        height: 1350,
      },
    ],
  },
];

export function getAllPosts(): JournalPost[] {
  return posts
    .filter((p) => !p.draft)
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function getPost(slug: string): JournalPost | undefined {
  return getAllPosts().find((p) => p.slug === slug);
}
