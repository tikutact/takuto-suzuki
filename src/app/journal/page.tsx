import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { getAllPosts } from "@/lib/journal";
import JsonLd from "@/components/JsonLd";
import { breadcrumb } from "@/lib/structured-data";

export const metadata: Metadata = {
  title: "Journal — Takuto Suzuki",
  description:
    "旅と制作のフィールドノート。Takuto Suzuki が歩いた場所と、そこで見たものの記録。",
};

export default function Journal() {
  const posts = getAllPosts();

  return (
    <div className="pt-6 pb-16 md:pt-16 md:pb-24">
      <JsonLd
        data={breadcrumb([
          { name: "Home", path: "/" },
          { name: "Journal", path: "/journal" },
        ])}
      />
      <div className="px-4 md:pl-0 md:pr-8 mb-12 md:mb-16">
        <h1 className="text-xs tracking-[0.4em] uppercase text-neutral-400">
          Journal
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-neutral-500 max-w-md">
          旅と制作のフィールドノート。歩いた場所と、そこで足が止まった瞬間の記録。
        </p>
      </div>

      {posts.length === 0 ? (
        <p className="px-4 md:px-0 text-sm text-neutral-400">Coming soon.</p>
      ) : (
        <div className="space-y-16">
          {posts.map((post) => (
            <Link
              key={post.slug}
              href={`/journal/${post.slug}`}
              className="group block px-4 md:pl-0 md:pr-8"
            >
              {post.cover && (
                <div className="relative w-[90%] aspect-[3/2] overflow-hidden bg-neutral-100">
                  <Image
                    src={post.cover}
                    alt={post.title}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-[1.02]"
                  />
                </div>
              )}
              <div className="px-6 mt-4 space-y-1">
                <p className="text-lg font-light">{post.title}</p>
                <p className="text-xs text-neutral-400">
                  {post.date}
                  {post.location && ` — ${post.location}`}
                </p>
                {post.excerpt && (
                  <p className="text-sm leading-relaxed text-neutral-500 max-w-md pt-1">
                    {post.excerpt}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
