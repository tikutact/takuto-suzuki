import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getAllPosts, getPost } from "@/lib/journal";
import JsonLd from "@/components/JsonLd";
import BackLink from "@/components/BackLink";
import { articleLd, breadcrumb } from "@/lib/structured-data";

type Props = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  const slugs = new Set(getAllPosts().map((post) => post.slug));
  return Array.from(slugs, (slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return {};

  return {
    title: `${post.title} — Takuto Suzuki`,
    description: post.excerpt ?? undefined,
    openGraph: post.cover ? { images: [post.cover] } : undefined,
  };
}

export default async function JournalPost({ params }: Props) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();

  return (
    <div className="pt-8 pb-16 md:pt-24 md:pb-24">
      <JsonLd data={articleLd(post)} />
      <JsonLd
        data={breadcrumb([
          { name: "Home", path: "/" },
          { name: "Journal", path: "/journal" },
          { name: post.title, path: `/journal/${post.slug}` },
        ])}
      />
      <article className="max-w-2xl mx-auto px-6">
        <header className="mb-12">
          <h1 className="text-2xl font-light mb-2">{post.title}</h1>
          <p className="text-xs tracking-[0.2em] text-neutral-400 uppercase">
            {post.date}
            {post.location && ` — ${post.location}`}
          </p>
        </header>

        <div className="space-y-8">
          {post.body.map((block, i) =>
            block.type === "text" ? (
              <p key={i} className="text-base leading-loose text-neutral-800">
                {block.value}
              </p>
            ) : (
              <figure key={i} className="py-4">
                <Image
                  src={block.src}
                  alt={block.caption ?? `${post.title} ${i + 1}`}
                  width={block.width}
                  height={block.height}
                  className="w-full h-auto"
                />
                {block.caption && (
                  <figcaption className="mt-3 text-xs text-neutral-400">
                    {block.caption}
                  </figcaption>
                )}
              </figure>
            )
          )}
        </div>

        <BackLink href="/journal" label="Journal" />
      </article>
    </div>
  );
}
