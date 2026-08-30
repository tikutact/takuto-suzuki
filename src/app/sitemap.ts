import type { MetadataRoute } from "next";
import { getAllPosts } from "@/lib/journal";
import { getAllSeries } from "@/lib/works";
import { SITE_URL, fullDate } from "@/lib/structured-data";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes = ["", "/works", "/film", "/shop", "/biography", "/contact"].map(
    (path) => ({
      url: `${SITE_URL}${path}`,
    })
  );

  const seriesRoutes = getAllSeries().map((series) => ({
    url: `${SITE_URL}/works/${series.slug}`,
  }));

  const journalRoutes = getAllPosts().map((post) => {
    const date = fullDate(post.date);
    return {
      url: `${SITE_URL}/journal/${post.slug}`,
      ...(date ? { lastModified: new Date(date) } : {}),
    };
  });

  return [...staticRoutes, ...seriesRoutes, ...journalRoutes];
}
