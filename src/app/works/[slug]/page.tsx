import Image from "next/image";
import { notFound } from "next/navigation";
import JsonLd from "@/components/JsonLd";
import BackLink from "@/components/BackLink";
import { seriesLd, breadcrumb } from "@/lib/structured-data";
import { getAllSeries, getSeries, type WorksLayout } from "@/lib/works";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return getAllSeries().map((s) => ({ slug: s.slug }));
}

// works.json が全シリーズを列挙する閉じた世界なので、未知のslugは即404にする
export const dynamicParams = false;

const LAYOUT: Record<
  WorksLayout,
  {
    container: string;
    list: string;
    item: string;
    image: string;
    width: number;
    height: number;
  }
> = {
  // /works/2026 と同じ2列グリッド。枚数が多いシリーズ向け
  grid: {
    container: "max-w-5xl",
    list: "space-y-10 md:grid md:grid-cols-2 md:gap-x-10 md:gap-y-12 md:space-y-0 md:items-center",
    item: "flex items-center justify-center",
    image: "max-h-[70vh] md:max-h-[62vh] max-w-full w-auto object-contain",
    width: 1800,
    height: 1200,
  },
  // /works/fade-stay と同じ1枚ずつ縦スクロール。数枚のシリーズ向け
  stack: {
    container: "max-w-3xl",
    list: "",
    item: "py-10 flex items-center justify-center",
    image: "max-h-[82vh] max-w-full w-auto object-contain",
    width: 1800,
    height: 1800,
  },
};

export default async function WorksSeriesPage({ params }: Props) {
  const { slug } = await params;
  const series = getSeries(slug);
  if (!series) notFound();
  const cfg = LAYOUT[series.layout];

  return (
    <div className="pt-8 pb-16 md:pt-24 md:pb-24">
      <JsonLd
        data={seriesLd({
          slug: series.slug,
          name: series.title,
          year: series.year,
          images: series.photos,
        })}
      />
      <JsonLd
        data={breadcrumb([
          { name: "Home", path: "/" },
          { name: "Works", path: "/works" },
          { name: series.title, path: `/works/${series.slug}` },
        ])}
      />
      <div className={`${cfg.container} mx-auto px-6`}>
        <div className="mb-16">
          <h1 className="text-2xl font-light mb-2">{series.title}</h1>
          <p className="text-xs tracking-[0.2em] text-neutral-400 uppercase">
            {series.sub}
          </p>
        </div>

        <div className={cfg.list}>
          {series.photos.map((src, i) => (
            <div key={src} className={cfg.item}>
              <Image
                src={src}
                alt={`${series.title}, ${i + 1}`}
                width={cfg.width}
                height={cfg.height}
                priority={i === 0}
                className={cfg.image}
              />
            </div>
          ))}
        </div>

        <BackLink href="/works" label="Works" />
      </div>
    </div>
  );
}
