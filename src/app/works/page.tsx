import Image from "next/image";
import Link from "next/link";

const series = [
  {
    slug: "cast",
    title: "cast",
    year: "2026",
    cover: "/images/cast-02.jpg",
  },
  {
    slug: "sway",
    title: "sway",
    year: "2026",
    cover: "/images/sway-11.jpg",
  },
  {
    slug: "ordinary",
    title: "ordinary",
    year: "2026",
    cover: "/images/ordinary-09.jpg",
  },
];

export default function Works() {
  return (
    <div className="pt-6 pb-16 md:pt-16 md:pb-24">
      <div className="space-y-16">
        {series.map(({ slug, title, year, cover }) => (
          <Link key={slug} href={`/works/${slug}`} className="group block px-4 md:pl-0 md:pr-8">
            <div className="relative w-[90%] aspect-[3/2] overflow-hidden bg-neutral-100">
              {cover && (
                <Image
                  src={cover}
                  alt={title}
                  fill
                  priority
                  className="object-cover transition-transform duration-700 group-hover:scale-[1.02]"
                />
              )}
            </div>
            <div className="px-6 mt-4 space-y-1">
              <p className="text-lg font-light">{title}</p>
              <p className="text-xs text-neutral-400">{year}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
