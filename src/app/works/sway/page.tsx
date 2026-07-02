import Image from "next/image";
import Link from "next/link";
import JsonLd from "@/components/JsonLd";
import { seriesLd, breadcrumb } from "@/lib/structured-data";

// reordered: mix portrait/landscape, white-surface branch shots separated
// silhouette (12) opens, yellow line (10) as mid-punctuation
const photos = [
  "/images/sway-12.jpg",
  "/images/sway-01.jpg",
  "/images/sway-03.jpg",
  "/images/sway-05.jpg",
  "/images/sway-10.jpg",
  "/images/sway-07.jpg",
  "/images/sway-04.jpg",
  "/images/sway-02.jpg",
  "/images/sway-11.jpg",
  "/images/sway-06.jpg",
  "/images/sway-08.jpg",
  "/images/sway-09.jpg",
];

export default function Stir() {
  return (
    <div className="pt-8 pb-16 md:pt-24 md:pb-24">
      <JsonLd data={seriesLd({ slug: "sway", name: "sway", year: "2026", images: photos })} />
      <JsonLd
        data={breadcrumb([
          { name: "Home", path: "/" },
          { name: "Works", path: "/works" },
          { name: "sway", path: "/works/sway" },
        ])}
      />
      <div className="max-w-4xl mx-auto px-6">
        <div className="mb-16">
          <h1 className="text-2xl font-light mb-2">sway</h1>
          <p className="text-xs tracking-[0.2em] text-neutral-400 uppercase">
            {photos.length} photographs — 2026
          </p>
        </div>

        <div className="space-y-10">
          {photos.map((src, i) => (
            <div key={i} className="flex items-center justify-center py-10 px-6">
              <Image
                src={src}
                alt={`sway ${i + 1}`}
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
