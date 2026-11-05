"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import JsonLd from "@/components/JsonLd";
import { breadcrumb } from "@/lib/structured-data";

const videos = [
  "trees.mp4",
  "breeze.mp4",
  "read.mp4",
  "curtain.mp4",
  "taller.mp4",
  "swallows.mp4",
  "glowing.mp4",
  "carpet.mp4",
  "moment.mp4",
  "spring.mp4",
  "wallpapers.mp4",
  "dappled.mp4",
];

function filmName(src: string) {
  return src.replace(/\.mp4$/, "");
}

function VideoCell({ src, onClick }: { src: string; onClick: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const wrapperRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    const wrapper = wrapperRef.current;
    if (!video || !wrapper) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          video.play().catch(() => {});
        } else {
          video.pause();
        }
      },
      { threshold: 0.2 }
    );

    observer.observe(wrapper);
    return () => observer.disconnect();
  }, []);

  return (
    // キーボード（Tab → Enter/Space）でも開けるようにボタンにしている。
    // 見た目は以前の div と同じ。フォーカスはキーボード操作時だけ枠を出す。
    <button
      type="button"
      ref={wrapperRef}
      className="relative block w-full aspect-video bg-black overflow-hidden cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
      onClick={onClick}
      aria-label={`Play ${filmName(src)}`}
    >
      <video
        ref={videoRef}
        src={`/film/${src}`}
        muted
        loop
        playsInline
        preload="none"
        className="w-full h-full object-cover"
      />
    </button>
  );
}

function Modal({ src, onClose }: { src: string; onClose: () => void }) {
  const ref = useRef<HTMLVideoElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  // 開いたら閉じるボタンへフォーカスを移し、閉じたら開く前の要素（押した動画セル）へ戻す。
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    return () => opener?.focus();
  }, []);

  useEffect(() => {
    ref.current?.play().catch(() => {});
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      // モーダル内で操作できるのは閉じるボタンだけなので、Tab で背後のページへ抜けないようにする。
      if (e.key === "Tab") {
        e.preventDefault();
        closeRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={filmName(src)}
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0,0,0,0.9)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "clamp(1rem, 4vw, 4rem)",
      }}
    >
      <button
        ref={closeRef}
        type="button"
        onClick={onClose}
        aria-label="Close"
        style={{
          position: "absolute",
          top: "1.25rem",
          right: "1.5rem",
          color: "rgba(255,255,255,0.6)",
          fontSize: "1.5rem",
          lineHeight: 1,
          background: "none",
          border: "none",
          cursor: "pointer",
          fontFamily: "inherit",
        }}
      >
        ✕
      </button>
      <video
        ref={ref}
        src={`/film/${src}`}
        muted
        loop
        playsInline
        preload="auto"
        style={{ maxWidth: "95%", maxHeight: "90%", objectFit: "contain" }}
        onClick={(e) => e.stopPropagation()}
      />
    </div>,
    document.body
  );
}

export default function Film() {
  const [active, setActive] = useState<string | null>(null);

  return (
    <>
      <JsonLd
        data={breadcrumb([
          { name: "Home", path: "/" },
          { name: "Film", path: "/film" },
        ])}
      />
      <div className="min-h-screen py-10 px-6 md:py-16 md:px-12">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
          {videos.map((v) => (
            <VideoCell key={v} src={v} onClick={() => setActive(v)} />
          ))}
        </div>
      </div>

      {active && <Modal src={active} onClose={() => setActive(null)} />}
    </>
  );
}
