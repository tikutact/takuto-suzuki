"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const slides = [
  { src: "/images/hero-leaf.jpg", alt: "Photo 1" },
  { src: "/images/hero-bottle.jpg", alt: "Photo 2" },
  { src: "/images/hero-cafe.jpg", alt: "Photo 3" },
  { src: "/images/hero-wall.jpg", alt: "Photo 4" },
];

const mobileSlides = [
  { src: "/images/featured-flower.jpg", alt: "Photo 1" },
  { src: "/images/featured-red.jpg", alt: "Photo 2" },
  { src: "/images/featured-3.jpg", alt: "Photo 3" },
  { src: "/images/featured-4.jpg", alt: "Photo 4" },
];

export default function Home() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActive((prev) => (prev + 1) % slides.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="h-[calc(100svh-3.5rem)] md:h-screen flex items-center justify-end md:items-stretch md:justify-normal pt-16 pb-4 pr-4 md:p-8">
      {/* Mobile: portrait slideshow */}
      <div className="relative w-[65%] aspect-[2/3] md:hidden">
        {mobileSlides.map((slide, i) => (
          <Image
            key={slide.src}
            src={slide.src}
            alt={slide.alt}
            fill
            priority={i === 0}
            className={`object-cover transition-opacity duration-1000 ${
              i === active ? "opacity-100" : "opacity-0"
            }`}
          />
        ))}
      </div>
      {/* Desktop: landscape slideshow */}
      <div className="relative hidden md:block md:w-full md:h-full">
        {slides.map((slide, i) => (
          <Image
            key={slide.src}
            src={slide.src}
            alt={slide.alt}
            fill
            priority={i === 0}
            className={`object-cover transition-opacity duration-1000 ${
              i === active ? "opacity-100" : "opacity-0"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
