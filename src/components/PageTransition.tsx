"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

// 最初の表示のフェードイン（0.2秒待って1.8秒）は globals.css の .page-transition
// （CSS アニメーション）が受け持つ。以前は style={{ opacity: 0 }} を JS で 1 に
// していたため、JS が無効・読み込み失敗のときは本文が最後まで見えなかった。
// CSS だけで最後は opacity: 1 になるので、JS が無くても本文は見える。
//
// ページ移動（クライアント遷移）のときのフェード（1.2秒）だけ、ここで JS から付ける。
export default function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const ref = useRef<HTMLDivElement>(null);
  const prevPathname = useRef(pathname);

  useEffect(() => {
    if (prevPathname.current === pathname) return; // 初回は CSS 側がフェードする
    prevPathname.current = pathname;

    ref.current?.animate([{ opacity: "0" }, { opacity: "1" }], {
      duration: 1200,
      easing: "ease",
      fill: "forwards",
    });
  }, [pathname]);

  return (
    <div ref={ref} className="page-transition">
      {children}
    </div>
  );
}
