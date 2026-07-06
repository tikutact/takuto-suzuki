import type { MetadataRoute } from "next";
import { getAllPosts } from "@/lib/journal";
import { SITE_URL, fullDate } from "@/lib/structured-data";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes = [
    "",
    "/works",
    "/works/cast",
    "/works/trace",
    "/works/ordinary",
    "/works/nape",
    "/film",
    "/journal",
    "/biography",
    "/contact",
  ].map((path) => ({
    url: `${SITE_URL}${path}`,
  }));

  const journalRoutes = getAllPosts().map((post) => {
    const date = fullDate(post.date);
    return {
      url: `${SITE_URL}/journal/${post.slug}`,
      ...(date ? { lastModified: new Date(date) } : {}),
    };
  });

  return [...staticRoutes, ...journalRoutes];
}
