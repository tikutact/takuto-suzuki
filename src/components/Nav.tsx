"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const links = [
  { href: "/works", label: "Works" },
  { href: "/film", label: "Film" },
  { href: "/biography", label: "Biography" },
  { href: "/contact", label: "Contact" },
];

const series = [
  { slug: "cast", title: "cast" },
  { slug: "stir", title: "stir" },
  { slug: "ordinary", title: "ordinary" },
];

export default function Nav() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  return (
    <>
      {/* Desktop: left panel */}
      <nav
        className="hidden md:flex fixed left-0 top-0 bottom-0 flex-col z-50 bg-white"
        style={{ width: "40vw", padding: "2.5rem 3rem", animation: "fadeUp 1.8s ease forwards" }}
      >
        <div className="flex gap-12">
          {/* Project name */}
          <Link
            href="/"
            className="text-base shrink-0 hover:opacity-50 transition-opacity"
          >
            Takuto Suzuki
          </Link>

          {/* Nav links */}
          <ul className="flex flex-col" style={{ gap: "0.3rem" }}>
            {links.map(({ href, label }) => (
              <li key={href}>
                <Link
                  href={href}
                  className={`text-sm leading-relaxed transition-opacity ${
                    pathname.startsWith(href)
                      ? "opacity-100"
                      : "opacity-40 hover:opacity-100"
                  }`}
                >
                  {pathname.startsWith(href) ? `— ${label}` : label}
                </Link>
                {href === "/works" && pathname.startsWith("/works") && (
                  <ul className="mt-2 flex flex-col" style={{ gap: "0.3rem" }}>
                    {series.map(({ slug, title }) => (
                      <li key={slug}>
                        <Link
                          href={`/works/${slug}`}
                          className={`text-sm leading-relaxed transition-opacity pl-4 ${
                            pathname === `/works/${slug}`
                              ? "opacity-70"
                              : "opacity-40 hover:opacity-70"
                          }`}
                        >
                          {title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
            <li>
              <a
                href="https://www.instagram.com/_suzukitakuto_/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm leading-relaxed opacity-40 hover:opacity-100 transition-opacity"
              >
                Instagram
              </a>
            </li>
          </ul>
        </div>

        <p className="mt-auto text-xs text-neutral-400">
          © {new Date().getFullYear()} Takuto Suzuki
        </p>
      </nav>

      {/* Mobile: top bar */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-neutral-100">
        <div className="px-6 h-14 flex items-center justify-between">
          <Link href="/" className="text-base hover:opacity-50 transition-opacity">
            Takuto Suzuki
          </Link>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Toggle menu"
            className="flex flex-col gap-1.5 p-2"
          >
            <span className={`block w-5 h-px bg-black transition-all duration-200 ${menuOpen ? "translate-y-2 rotate-45" : ""}`} />
            <span className={`block w-5 h-px bg-black transition-all duration-200 ${menuOpen ? "opacity-0" : ""}`} />
            <span className={`block w-5 h-px bg-black transition-all duration-200 ${menuOpen ? "-translate-y-2 -rotate-45" : ""}`} />
          </button>
        </div>
        <div className={`overflow-hidden transition-all duration-300 ${menuOpen ? "max-h-64 border-t border-neutral-100" : "max-h-0"}`}>
          <ul className="px-6 py-5 flex flex-col gap-4">
            {links.map(({ href, label }) => (
              <li key={href}>
                <Link
                  href={href}
                  className={`text-sm ${pathname.startsWith(href) ? "opacity-100" : "opacity-40"}`}
                >
                  {label}
                </Link>
                {href === "/works" && pathname.startsWith("/works") && (
                  <ul className="mt-2 flex flex-col gap-2 pl-4">
                    {series.map(({ slug, title }) => (
                      <li key={slug}>
                        <Link
                          href={`/works/${slug}`}
                          className={`text-xs transition-opacity ${
                            pathname === `/works/${slug}` ? "opacity-50" : "opacity-25 hover:opacity-50"
                          }`}
                        >
                          {title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
            <li>
              <a
                href="https://www.instagram.com/_suzukitakuto_/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-neutral-400"
              >
                Instagram
              </a>
            </li>
          </ul>
        </div>
      </header>
    </>
  );
}
