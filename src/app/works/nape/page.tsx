import Link from "next/link";

export default function Nape() {
  return (
    <div className="pt-8 pb-16 md:pt-24 md:pb-24">
      <div className="max-w-4xl mx-auto px-6">
        <div className="mb-16">
          <h1 className="text-2xl font-light mb-2">nape</h1>
          <p className="text-xs tracking-[0.2em] text-neutral-400 uppercase">
            2026 — upcoming
          </p>
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
