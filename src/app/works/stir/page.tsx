import Image from "next/image";
import Link from "next/link";

// reordered: mix portrait/landscape, white-surface branch shots separated
// silhouette (12) opens, yellow line (10) as mid-punctuation
const photos = [
  "/images/stir-12.jpg",
  "/images/stir-01.jpg",
  "/images/stir-03.jpg",
  "/images/stir-05.jpg",
  "/images/stir-10.jpg",
  "/images/stir-07.jpg",
  "/images/stir-04.jpg",
  "/images/stir-02.jpg",
  "/images/stir-11.jpg",
  "/images/stir-06.jpg",
  "/images/stir-08.jpg",
  "/images/stir-09.jpg",
];

export default function Stir() {
  return (
    <div className="pt-8 pb-16 md:pt-24 md:pb-24">
      <div className="max-w-4xl mx-auto px-6">
        <div className="mb-16">
          <h1 className="text-2xl font-light mb-2">stir</h1>
          <p className="text-xs tracking-[0.2em] text-neutral-400 uppercase">
            {photos.length} photographs — 2026
          </p>
        </div>

        <div className="space-y-10">
          {photos.map((src, i) => (
            <div key={i} className="flex items-center justify-center py-10 px-6">
              <Image
                src={src}
                alt={`stir ${i + 1}`}
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
