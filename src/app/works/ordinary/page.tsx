import Image from "next/image";
import Link from "next/link";
import JsonLd from "@/components/JsonLd";
import { seriesLd, breadcrumb } from "@/lib/structured-data";

// reordered: wall light patterns (02/03/05) separated, still life (07/09) separated
const photos = [
  "/images/ordinary-01.jpg",
  "/images/ordinary-10.jpg",
  "/images/ordinary-07.jpg",
  "/images/ordinary-03.jpg",
  "/images/ordinary-06.jpg",
  "/images/ordinary-09.jpg",
  "/images/ordinary-05.jpg",
  "/images/ordinary-04.jpg",
  "/images/ordinary-02.jpg",
  "/images/ordinary-08.jpg",
];

export default function Ordinary() {
  return (
    <div className="pt-8 pb-16 md:pt-24 md:pb-24">
      <JsonLd data={seriesLd({ slug: "ordinary", name: "ordinary", year: "2026", images: photos })} />
      <JsonLd
        data={breadcrumb([
          { name: "Home", path: "/" },
          { name: "Works", path: "/works" },
          { name: "ordinary", path: "/works/ordinary" },
        ])}
      />
      <div className="max-w-4xl mx-auto px-6">
        <div className="mb-16">
          <h1 className="text-2xl font-light mb-2">ordinary</h1>
          <p className="text-xs tracking-[0.2em] text-neutral-400 uppercase">
            {photos.length} photographs — 2026
          </p>
        </div>

        <div className="space-y-10">
          {photos.map((src, i) => (
            <div key={i} className="flex items-center justify-center py-10 px-6">
              <Image
                src={src}
                alt={`ordinary ${i + 1}`}
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
