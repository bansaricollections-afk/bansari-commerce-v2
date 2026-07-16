"use client";

import { useState, useRef, useCallback } from "react";
import Image from "next/image";

type Props = {
  src: string;
  alt: string;
  priority?: boolean;
};

/**
 * ImageZoom — cursor-follow magnification on hover.
 * Falls back to a normal image on touch devices.
 */
export default function ImageZoom({ src, alt, priority = false }: Props) {
  const [zoomed, setZoomed] = useState(false);
  const [pos, setPos] = useState({ x: 50, y: 50 });
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setPos({ x, y });
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden"
      style={{
        aspectRatio: "3 / 4",
        cursor: zoomed ? "zoom-out" : "zoom-in",
      }}
      onMouseEnter={() => setZoomed(true)}
      onMouseLeave={() => setZoomed(false)}
      onMouseMove={handleMouseMove}
      aria-label={`${alt} — hover to zoom`}
    >
      <Image
        src={src}
        alt={alt}
        fill
        priority={priority}
        loading={priority ? "eager" : "lazy"}
        sizes="(max-width:768px) 100vw, 50vw"
        className="object-cover object-[center_12%]"
        style={{
          transformOrigin: `${pos.x}% ${pos.y}%`,
          transform: zoomed ? "scale(2.1)" : "scale(1)",
          transition: zoomed ? "transform 0ms" : "transform 400ms ease-out",
        }}
        draggable={false}
      />
    </div>
  );
}
