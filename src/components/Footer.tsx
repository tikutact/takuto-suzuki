export default function Footer() {
  return (
    <footer className="border-t border-neutral-100 py-8 px-6">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <span className="text-xs tracking-[0.2em] text-neutral-400 uppercase">
          TAKUTO SUZUKI
        </span>
        <span className="text-xs text-neutral-400">
          © {new Date().getFullYear()} Takuto Suzuki. All rights reserved.
        </span>
      </div>
    </footer>
  );
}
