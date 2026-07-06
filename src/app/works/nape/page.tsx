import JsonLd from "@/components/JsonLd";
import BackLink from "@/components/BackLink";
import { seriesLd, breadcrumb } from "@/lib/structured-data";

export default function Nape() {
  return (
    <div className="pt-8 pb-16 md:pt-24 md:pb-24">
      <JsonLd data={seriesLd({ slug: "nape", name: "nape", year: "2026" })} />
      <JsonLd
        data={breadcrumb([
          { name: "Home", path: "/" },
          { name: "Works", path: "/works" },
          { name: "nape", path: "/works/nape" },
        ])}
      />
      <div className="max-w-4xl mx-auto px-6">
        <div className="mb-16">
          <h1 className="text-2xl font-light mb-2">nape</h1>
          <p className="text-xs tracking-[0.2em] text-neutral-400 uppercase">
            2026 — upcoming
          </p>
        </div>

        <BackLink href="/works" label="Works" />
      </div>
    </div>
  );
}
