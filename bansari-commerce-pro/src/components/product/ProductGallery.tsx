'use client';

import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { Product } from '@/types/product';

interface Props {
  product: Product;
}

export default function ProductGallery({ product }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const mainRef = useRef<HTMLDivElement>(null);
  const images = product.images ?? [];

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!mainRef.current) return;
    const rect = mainRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setZoomPos({ x, y });
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    const diff = touchStart - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) {
      if (diff > 0) setActiveIndex((i) => Math.min(i + 1, images.length - 1));
      else setActiveIndex((i) => Math.max(i - 1, 0));
    }
    setTouchStart(null);
  };

  useEffect(() => {
    if (!lightboxOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') setLightboxIndex((i) => Math.min(i + 1, images.length - 1));
      if (e.key === 'ArrowLeft') setLightboxIndex((i) => Math.max(i - 1, 0));
      if (e.key === 'Escape') setLightboxOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightboxOpen, images.length]);

  if (!images.length) {
    return (
      <div className="aspect-[3/4] w-full bg-slate-100 flex items-center justify-center rounded-sm">
        <span className="text-slate-400 text-sm tracking-widest uppercase">No Image</span>
      </div>
    );
  }

  const isNew = product.is_new;
  const isBestseller = product.is_bestseller;
  const isLowStock = product.stock > 0 && product.stock <= 5;
  const isOutOfStock = product.stock === 0;

  return (
    <div className="flex gap-4">
      {/* Vertical thumbnail strip */}
      <div className="hidden lg:flex flex-col gap-2 w-16 flex-shrink-0">
        {images.map((img, i) => (
          <button
            key={img.url}
            onClick={() => setActiveIndex(i)}
            aria-label={`View image ${i + 1}`}
            className={`relative aspect-[3/4] w-full overflow-hidden rounded-sm border transition-all duration-200 ${
              i === activeIndex
                ? 'border-[#8A5A6A] shadow-sm'
                : 'border-slate-200 opacity-60 hover:opacity-100 hover:border-slate-400'
            }`}
          >
            <Image
              src={img.url}
              alt={img.alt_text || `Product view ${i + 1}`}
              fill
              className="object-cover"
              sizes="64px"
              loading="lazy"
            />
          </button>
        ))}
      </div>

      {/* Main image */}
      <div className="flex-1 flex flex-col gap-3">
        <div
          ref={mainRef}
          className={`relative aspect-[3/4] w-full overflow-hidden rounded-sm bg-slate-50 cursor-zoom-in select-none`}
          onMouseEnter={() => setIsZoomed(true)}
          onMouseLeave={() => setIsZoomed(false)}
          onMouseMove={handleMouseMove}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onClick={() => { setLightboxIndex(activeIndex); setLightboxOpen(true); }}
          role="button"
          tabIndex={0}
          aria-label="Click to view full size"
          onKeyDown={(e) => e.key === 'Enter' && setLightboxOpen(true)}
        >
          {/* Badges */}
          <div className="absolute top-4 left-4 z-10 flex flex-col gap-1.5">
            {isNew && (
              <span className="bg-[#8A5A6A] text-white text-[10px] font-medium tracking-[0.15em] uppercase px-2.5 py-1">
                New
              </span>
            )}
            {isBestseller && (
              <span className="bg-slate-900 text-white text-[10px] font-medium tracking-[0.15em] uppercase px-2.5 py-1">
                Bestseller
              </span>
            )}
            {isLowStock && (
              <span className="bg-amber-600 text-white text-[10px] font-medium tracking-[0.15em] uppercase px-2.5 py-1">
                Almost Gone
              </span>
            )}
            {isOutOfStock && (
              <span className="bg-slate-500 text-white text-[10px] font-medium tracking-[0.15em] uppercase px-2.5 py-1">
                Sold Out
              </span>
            )}
          </div>

          {/* Image counter */}
          <div className="absolute bottom-4 right-4 z-10 bg-white/80 backdrop-blur-sm text-slate-700 text-[11px] tracking-widest px-2 py-1 rounded-sm">
            {activeIndex + 1} / {images.length}
          </div>

          {/* Fullscreen icon */}
          <button
            onClick={(e) => { e.stopPropagation(); setLightboxIndex(activeIndex); setLightboxOpen(true); }}
            aria-label="View fullscreen"
            className="absolute bottom-4 left-4 z-10 bg-white/80 backdrop-blur-sm p-1.5 rounded-sm hover:bg-white transition-colors"
          >
            <svg className="w-4 h-4 text-slate-700" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
            </svg>
          </button>

          {/* Zoom layer */}
          <div
            className={`absolute inset-0 transition-opacity duration-200 pointer-events-none z-20 ${
              isZoomed ? 'opacity-100' : 'opacity-0'
            }`}
            style={{
              backgroundImage: `url(${images[activeIndex]?.url})`,
              backgroundPosition: `${zoomPos.x}% ${zoomPos.y}%`,
              backgroundSize: '250%',
              backgroundRepeat: 'no-repeat',
            }}
          />

          <Image
            src={images[activeIndex]?.url ?? ''}
            alt={images[activeIndex]?.alt_text || product.name}
            fill
            priority={activeIndex === 0}
            className="object-cover transition-opacity duration-300"
            sizes="(max-width: 768px) 100vw, 55vw"
          />
        </div>

        {/* Mobile dot nav */}
        <div className="flex lg:hidden items-center justify-center gap-1.5">
          {images.map((_, i) => (
            <button
              key={i}
              onClick={() => setActiveIndex(i)}
              aria-label={`Go to image ${i + 1}`}
              className={`rounded-full transition-all duration-200 ${
                i === activeIndex ? 'w-4 h-1.5 bg-[#8A5A6A]' : 'w-1.5 h-1.5 bg-slate-300'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Lightbox */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
          role="dialog"
          aria-label="Image viewer"
          aria-modal="true"
        >
          <button
            onClick={() => setLightboxOpen(false)}
            aria-label="Close viewer"
            className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {lightboxIndex > 0 && (
            <button
              onClick={() => setLightboxIndex((i) => i - 1)}
              aria-label="Previous image"
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white transition-colors"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>
          )}

          {lightboxIndex < images.length - 1 && (
            <button
              onClick={() => setLightboxIndex((i) => i + 1)}
              aria-label="Next image"
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white transition-colors"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          )}

          <div className="relative max-h-[90vh] max-w-[90vw] aspect-[3/4]">
            <Image
              src={images[lightboxIndex]?.url ?? ''}
              alt={images[lightboxIndex]?.alt_text || product.name}
              fill
              className="object-contain"
              sizes="90vw"
            />
          </div>

          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={() => setLightboxIndex(i)}
                aria-label={`Image ${i + 1}`}
                className={`rounded-full transition-all duration-200 ${
                  i === lightboxIndex ? 'w-5 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/40'
                }`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
