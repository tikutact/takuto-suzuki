import Image from "next/image";
import Link from "next/link";
import JsonLd from "@/components/JsonLd";
import { seriesLd, breadcrumb } from "@/lib/structured-data";

// reordered: mix portrait/landscape, white-surface branch shots separated
// silhouette (12) opens, yellow line (10) as mid-punctuation
const photos = [
  "/images/trace-12.jpg",
  "/images/trace-01.jpg",
  "/images/trace-03.jpg",
  "/images/trace-05.jpg",
  "/images/trace-10.jpg",
  "/images/trace-07.jpg",
  "/images/trace-04.jpg",
  "/images/trace-02.jpg",
  "/images/trace-11.jpg",
  "/images/trace-06.jpg",
  "/images/trace-08.jpg",
  "/images/trace-09.jpg",
];

export default function Trace() {
  return (
    <div className="pt-8 pb-16 md:pt-24 md:pb-24">
      <JsonLd data={seriesLd({ slug: "trace", name: "trace", year: "2026", images: photos })} />
      <JsonLd
        data={breadcrumb([
          { name: "Home", path: "/" },
          { name: "Works", path: "/works" },
          { name: "trace", path: "/works/trace" },
        ])}
      />
      <div className="max-w-4xl mx-auto px-6">
        <div className="mb-16">
          <h1 className="text-2xl font-light mb-2">trace</h1>
          <p className="text-xs tracking-[0.2em] text-neutral-400 uppercase">
            {photos.length} photographs — 2026
          </p>
        </div>

        <div className="space-y-10">
          {photos.map((src, i) => (
            <div key={i} className="flex items-center justify-center py-10 px-6">
              <Image
                src={src}
                alt={`trace ${i + 1}`}
                width={1800}
                height={1200}
                className="max-h-[82vh] max-w-full w-auto object-contain"
              />
            </div>
          ))}
        </div>

        <div className="mt-20 border-t border-neutral-100 pt-8">
          <Link
            href="/works"
            className="text-xs tracking-[0.2em] uppercase text-neutral-400 hover:text-black transition-colors"
          >
            ← Works
          </Link>
        </div>
      </div>
    </div>
  );
}
