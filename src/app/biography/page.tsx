import Image from "next/image";

export default function About() {
  return (
    <div className="min-h-[calc(100svh-3.5rem)] md:min-h-screen flex items-center py-10">
      <div className="max-w-2xl mx-auto px-6 w-full">
        <h1 className="text-xs tracking-[0.4em] uppercase text-neutral-400 mb-8">
          Biography
        </h1>

        <div className="relative aspect-[3/4] bg-neutral-100 overflow-hidden mb-8 max-w-[200px]">
          <Image
            src="/images/portrait.jpg"
            alt="Takuto Suzuki"
            fill
            className="object-cover"
          />
        </div>

        <div className="space-y-4 text-sm leading-relaxed">
          <div className="flex gap-8 border-t border-neutral-100 pt-4">
            <span className="text-neutral-400 shrink-0 w-12">1994</span>
            <span>Born in Taketoyo, Aichi, Japan.</span>
          </div>
          <div className="flex gap-8 border-t border-neutral-100 pt-4">
            <span className="text-neutral-400 shrink-0 w-12">Now</span>
            <span>Based in Nagoya, Aichi.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
