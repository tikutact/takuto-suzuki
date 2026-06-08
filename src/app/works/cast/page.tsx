import Image from "next/image";
import Link from "next/link";

// reordered: mix portrait/landscape, frosted glass (08/06) separated
const photos = [
  "/images/cast-01.jpg",
  "/images/cast-04.jpg",
  "/images/cast-07.jpg",
  "/images/cast-02.jpg",
  "/images/cast-09.jpg",
  "/images/cast-05.jpg",
  "/images/cast-08.jpg",
  "/images/cast-03.jpg",
  "/images/cast-06.jpg",
];

export default function Cast() {
  return (
    <div className="pt-8 pb-16 md:pt-24 md:pb-24">
      <div className="max-w-4xl mx-auto px-6">
        <div className="mb-16">
          <h1 className="text-2xl font-light mb-2">cast</h1>
          <p className="text-xs tracking-[0.2em] text-neutral-400 uppercase">
            {photos.length} photographs — 2026
          </p>
        </div>

        <div className="space-y-10">
          {photos.map((src, i) => (
            <div key={i} className="flex items-center justify-center py-10 px-6">
              <Image
                src={src}
                alt={`cast ${i + 1}`}
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
