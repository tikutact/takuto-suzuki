import Image from "next/image";
import Link from "next/link";
import JsonLd from "@/components/JsonLd";
import { breadcrumb } from "@/lib/structured-data";
import { getAllSeries } from "@/lib/works";

export default function Works() {
  const series = getAllSeries();
  return (
    <div className="pt-6 pb-16 md:pt-16 md:pb-24">
      <JsonLd
        data={breadcrumb([
          { name: "Home", path: "/" },
          { name: "Works", path: "/works" },
        ])}
      />
      <div className="space-y-16">
        {series.map(({ slug, title, sub, cover }, i) => (
          <Link key={slug} href={`/works/${slug}`} className="group block px-4 md:pl-0 md:pr-8">
            <div className="relative w-[90%] aspect-[3/2] overflow-hidden bg-neutral-100">
              {cover && (
                <Image
                  src={cover}
                  alt={title}
                  fill
                  // 先読みするのは最初の1枚だけ（Next 16 で priority は preload に改名・非推奨）。
                  preload={i === 0}
                  // 表示幅: スマホ (100vw - 2rem) の 90%、md 以上は (60vw - 2rem) の 90%。
                  sizes="(min-width: 768px) 54vw, 90vw"
                  className="object-cover transition-transform duration-700 group-hover:scale-[1.02] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                />
              )}
            </div>
            <div className="px-6 mt-4 space-y-1">
              <p className="text-lg font-light">{title}</p>
              <p className="text-xs text-neutral-400">{sub}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
