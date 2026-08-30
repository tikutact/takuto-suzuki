import manifest from "@/content/works.json";

// Works セクションの唯一のソースオブトゥルース。works/page.tsx・works/[slug]/page.tsx・
// Nav.tsx・sitemap.ts が全部ここから読む（2026-08-19〜29に4箇所バラバラだった反省）。
// シリーズの並べ替え・追加・削除はローカルツール「works-desk」から works.json を
// 直接編集する運用（このファイル自体は書き換えない）。

export type WorksLayout = "grid" | "stack";

type RawSeries = {
  slug: string;
  title: string;
  layout: WorksLayout;
  year: string;
  photos: string[];
  sub?: string;
  cover?: string;
};

export type Series = {
  slug: string;
  title: string;
  layout: WorksLayout;
  year: string;
  photos: string[];
  sub: string;
  cover: string;
};

const LAYOUTS: WorksLayout[] = ["grid", "stack"];

function resolve(raw: RawSeries): Series {
  if (!raw.slug || typeof raw.slug !== "string") {
    throw new Error(`works.json: a series is missing a valid "slug"`);
  }
  if (!raw.title || typeof raw.title !== "string") {
    throw new Error(`works.json: series "${raw.slug}" is missing a "title"`);
  }
  if (!LAYOUTS.includes(raw.layout)) {
    throw new Error(
      `works.json: series "${raw.slug}" has unknown layout "${raw.layout}" (expected ${LAYOUTS.join(" | ")})`
    );
  }
  if (!Array.isArray(raw.photos) || raw.photos.length === 0) {
    throw new Error(`works.json: series "${raw.slug}" has no photos`);
  }
  return {
    ...raw,
    sub: raw.sub ?? `${raw.photos.length} photographs`,
    cover: raw.cover ?? raw.photos[0],
  };
}

// 2026シリーズの並び順は撮影日順ではなく編集した順（意図的な設計）:
//   1  膜の中の丸い光＝この年の語彙を最初に置く
//   2-6  静かな影 → 一点色（黄）で目を覚まし → 膜（車窓）へ
//   7-8  屋内へ入る（光の矩形・生活）
//   9-12  面に落ちる影のまとまり＝この年の主旋律
//   13   一人称は「自分の影」1枚だけ中盤に置く
//   14-17 外へ出て引きの街へ
//   18-20 人が現れ、赤でつなぐ
//   21   唯一の直接光（夕日）で閉じる
// 変更するときは works-desk の並べ替えUIか、直接 works.json を編集する。

export function getAllSeries(): Series[] {
  const series = (manifest as RawSeries[]).map(resolve);
  const seen = new Set<string>();
  for (const s of series) {
    if (seen.has(s.slug)) {
      throw new Error(`works.json: duplicate slug "${s.slug}"`);
    }
    seen.add(s.slug);
  }
  return series;
}

export function getSeries(slug: string): Series | undefined {
  return getAllSeries().find((s) => s.slug === slug);
}
