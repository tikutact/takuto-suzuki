import Image from "next/image";
import JsonLd from "@/components/JsonLd";
import BackLink from "@/components/BackLink";
import { seriesLd, breadcrumb } from "@/lib/structured-data";

// 写真集『Fade, Stay』（B5・32P・ミシン綴じ・Edition of 50）からの抜粋。
// 全26枚ではなく本人セレクトの8枚のみ。先頭は表紙に貼り込んだ写真そのもの
// （本文には未収録・表紙専用のA7C03193）。並びは本の掲載順のまま。
const photos = [
  "/images/fade-stay-cover-photo.jpg",
  "/images/fade-stay-01.jpg",
  "/images/fade-stay-02.jpg",
  "/images/fade-stay-03.jpg",
  "/images/fade-stay-04.jpg",
  "/images/fade-stay-05.jpg",
  "/images/fade-stay-06.jpg",
  "/images/fade-stay-07.jpg",
  "/images/fade-stay-08.jpg",
];

export default function WorksFadeStay() {
  return (
    <div className="pt-8 pb-16 md:pt-24 md:pb-24">
      <JsonLd
        data={seriesLd({
          slug: "fade-stay",
          name: "Fade, Stay",
          year: "2026",
          images: photos,
        })}
      />
      <JsonLd
        data={breadcrumb([
          { name: "Home", path: "/" },
          { name: "Works", path: "/works" },
          { name: "Fade, Stay", path: "/works/fade-stay" },
        ])}
      />
      <div className="max-w-3xl mx-auto px-6">
        <div className="mb-16">
          <h1 className="text-2xl font-light mb-2">Fade, Stay</h1>
          <p className="text-xs tracking-[0.2em] text-neutral-400 uppercase">
            Photo zine, 2026
          </p>
        </div>

        {photos.map((src, i) => (
          <div key={src} className="py-10 flex items-center justify-center">
            <Image
              src={src}
              alt={i === 0 ? "Fade, Stay — cover" : `Fade, Stay, ${i}`}
              width={1800}
              height={1800}
              priority={i === 0}
              className="max-h-[82vh] max-w-full w-auto object-contain"
            />
          </div>
        ))}

        <BackLink href="/works" label="Works" />
      </div>
    </div>
  );
}
