// Schema.org JSON-LD helpers (TAKUTO SUZUKI portfolio)
// URLs are absolute with www, matching the existing metadataBase.

export const SITE_URL = "https://www.takutosuzuki.com";

export function jsonLd(data: Record<string, unknown>): string {
  return JSON.stringify(data);
}

function absoluteUrl(path: string): string {
  return path.startsWith("http") ? path : `${SITE_URL}${path}`;
}

const person = {
  "@type": "Person",
  "@id": `${SITE_URL}/#person`,
  name: "Takuto Suzuki",
  jobTitle: "Photographer",
  url: SITE_URL,
} as const;

export function personLd(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    ...person,
    email: "tikutact@gmail.com",
    sameAs: ["https://www.instagram.com/_suzukitakuto_/"],
  };
}

export function webSiteLd(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "TAKUTO SUZUKI",
    url: SITE_URL,
    author: { "@id": `${SITE_URL}/#person` },
    inLanguage: "ja",
  };
}

export type BreadcrumbItem = { name: string; path?: string };

export function breadcrumb(items: BreadcrumbItem[]): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      ...(item.path ? { item: absoluteUrl(item.path) } : {}),
    })),
  };
}

// Works series page. With images → ImageGallery, without (upcoming) → CreativeWork.
export function seriesLd(series: {
  slug: string;
  name: string;
  year: string;
  images?: string[];
  description?: string;
}): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": series.images?.length ? "ImageGallery" : "CreativeWork",
    name: series.name,
    url: `${SITE_URL}/works/${series.slug}`,
    creator: person,
    dateCreated: series.year,
    ...(series.images?.length
      ? { image: series.images.map(absoluteUrl) }
      : {}),
    ...(series.description ? { description: series.description } : {}),
  };
}

// Journal posts (src/lib/journal.ts). "YYYY-MM" is padded to "YYYY-MM-01",
// a full "YYYY-MM-DD" passes through as-is. Anything else returns undefined
// rather than emitting a non-ISO date into JSON-LD / the sitemap.
export function fullDate(date: string): string | undefined {
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
  if (/^\d{4}-\d{2}$/.test(date)) return `${date}-01`;
  return undefined;
}

// Structurally matches JournalPost (src/lib/journal.ts) without importing it
type ArticleLdInput = {
  slug: string;
  title: string;
  date: string;
  excerpt?: string;
  cover?: string;
  body: ({ type: "text"; value: string } | { type: "image"; src: string })[];
};

export function articleLd(post: ArticleLdInput): Record<string, unknown> {
  const url = `${SITE_URL}/journal/${post.slug}`;
  const firstImage = post.body.find((b) => b.type === "image");
  const image = post.cover ?? (firstImage?.type === "image" ? firstImage.src : undefined);
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    ...(image ? { image: absoluteUrl(image) } : {}),
    ...(fullDate(post.date) ? { datePublished: fullDate(post.date) } : {}),
    ...(post.excerpt ? { description: post.excerpt } : {}),
    author: person,
    publisher: person,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    url,
    inLanguage: "ja",
  };
}
