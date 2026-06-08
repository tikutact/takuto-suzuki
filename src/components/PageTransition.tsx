"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

export default function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const ref = useRef<HTMLDivElement>(null);
  const mounted = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    el.animate(
      [{ opacity: "0" }, { opacity: "1" }],
      {
        duration: mounted.current ? 1200 : 1800,
        easing: "ease",
        fill: "forwards",
        delay: mounted.current ? 0 : 200,
      }
    );

    mounted.current = true;
  }, [pathname]);

  return <div ref={ref}>{children}</div>;
}
