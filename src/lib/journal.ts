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
    // fade, stay 発売記録。8/11 実物到着後に写真4点を撮影して image ブロックを差し込み、
    // draft を外して公開する（下書き正本: ~/journal-drafts/takuto-drafts/fade-stay-journal.md）。
    // 写真の予定: 1)表紙(手貼りが見える寄り) → 本文1段落目の後
    //            2)静かな対の見開き(p6-7など) 3)中央見開きp16-17 4)糸or貼り込みの寄り → 本文末尾に連続配置
    // TODO(公開時): 末尾の「オンラインは Shop から」を /shop へのリンクにする
    //（text ブロックはプレーン描画のため、link 対応ブロックの追加 or 文中リンクの実装が必要）。
    // TODO(公開時): cover に表紙写真を設定・sitemap.ts に /journal/fade-stay を追加・SC登録リクエスト
    draft: true,
    slug: "fade-stay",
    title: "Fade, Stay",
    date: "2026-08",
    excerpt:
      "初めての写真集『Fade, Stay』を作りました。B5・32ページ、ミシン綴じ。",
    body: [
      {
        type: "text",
        value: "初めての写真集を作りました。",
      },
      {
        type: "text",
        value:
          "タイトルは『Fade, Stay』。この一年、家と外との行き来のなかで撮っていた写真をまとめたものです。",
      },
      {
        type: "text",
        value:
          "はじめから写真集にするつもりで撮っていたわけではありません。一年分の写真を見返したとき、同じものばかり撮っていることに気づきました。塀を越えてくる植物、シャッターに絡まる蔓、置き去りにされたままの椅子。街と、そこに入り込んでくるもの。家を出て、太陽にあたって、雨に降られて、また家に帰ってくる。その繰り返しのあいだに、街も同じように動いていて、僕はその動きの断片ばかり集めていたようです。",
      },
      {
        type: "text",
        value:
          "今まであったものがなくなっていたり、何もなかったところに何かが芽生えたり。消えていくものと、そこに残り続けるもの。相反するふたつの動詞をカンマでつないで、タイトルにしました。",
      },
      {
        type: "text",
        value:
          "Fade, Stay — B5 / 32 pages / ミシン綴じ（シルバーの糸）/ Edition of 50 / ¥2,500",
      },
      {
        type: "text",
        value:
          "オンラインは Shop から。名古屋・大須の LIGHT LEAK 店頭でも手に取っていただけます。",
      },
    ],
  },
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
