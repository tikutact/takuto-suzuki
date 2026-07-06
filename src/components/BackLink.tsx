import Link from "next/link";

export default function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <div className="mt-20 border-t border-neutral-100 pt-8">
      <Link
        href={href}
        className="text-xs tracking-[0.2em] uppercase text-neutral-400 hover:text-black transition-colors"
      >
        ← {label}
      </Link>
    </div>
  );
}
