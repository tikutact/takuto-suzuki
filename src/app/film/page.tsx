"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const videos = [
  "trees.mp4",
  "breeze.mp4",
  "read.mp4",
  "lightbeautiful.mp4",
  "curtain.mp4",
  "taller.mp4",
  "home.mp4",
  "swallows.mp4",
  "glowing.mp4",
  "carpet.mp4",
  "moment.mp4",
  "spring.mp4",
  "wallpapers.mp4",
  "dappled.mp4",
];

function VideoCell({ src, onClick }: { src: string; onClick: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

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
    <div
      ref={wrapperRef}
      className="relative w-full aspect-video bg-black overflow-hidden cursor-pointer"
      onClick={onClick}
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
    </div>
  );
}

function Modal({ src, onClose }: { src: string; onClose: () => void }) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    ref.current?.play().catch(() => {});
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return createPortal(
    <div
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
        onClick={onClose}
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
