import { jsonLd } from "@/lib/structured-data";

// Renders only a <script type="application/ld+json"> tag (no visual/DOM impact)
export default function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: jsonLd(data) }}
    />
  );
}
