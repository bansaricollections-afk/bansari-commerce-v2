'use client';

import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { Product, ProductImage, ProductVariant } from '@/types/product';

// ─── Tab grouping ────────────────────────────────────────────────────────────
const LOOK_TYPES: ProductImage['type'][] = ['front', 'back', 'side', 'lifestyle'];
const FABRIC_TYPES: ProductImage['type'][] = ['fabric', 'detail', 'neckline', 'sleeve'];

type Tab = 'look' | 'fabric' | 'details' | 'all';

function classifyTab(type: ProductImage['type']): Tab {
  if (LOOK_TYPES.includes(type)) return 'look';
  if (FABRIC_TYPES.includes(type)) return 'fabric';
  return 'details';
}

// Safely cast the loose Product.images union to ProductImage[]
function toProductImages(
  raw: (ProductImage | { url?: string; alt?: string; type?: string })[] | undefined,
): ProductImage[] {
  if (!raw) return [];
  return raw.filter((img): img is ProductImage => !!img.url && !!img.type) as ProductImage[];
}

interface Props {
  product: Product;
  selectedVariant?: ProductVariant | null;
}

export default function ProductGallery({ product, selectedVariant }: Props) {
  // Derive active image list: variant images → product images
  const baseImages = toProductImages(product.images);
  const variantImages =
    selectedVariant?.images && selectedVariant.images.length > 0
      ? selectedVariant.images
      : null;
  const allImages = variantImages ?? baseImages;

  // ─── Tab state ───────────────────────────────────────────────────────────
  const tabCounts = allImages.reduce<Record<Tab, number>>(
    (acc, img) => {
      acc[classifyTab(img.type)] = (acc[classifyTab(img.type)] ?? 0) + 1;
      return acc;
    },
    { look: 0, fabric: 0, details: 0, all: allImages.length },
  );
  const availableTabs: Tab[] = [
    'look' as Tab,
    ...(tabCounts.fabric > 0 ? (['fabric'] as Tab[]) : []),
    ...(tabCounts.details > 0 ? (['details'] as Tab[]) : []),
  ];
  const showTabs = availableTabs.length >= 2;

  const [activeTab, setActiveTab] = useState<Tab>(
    showTabs ? 'look' : 'all',
  );

  // Reset tab + index when images change (variant switch)
  const prevImagesKey = useRef<string>('');
  const imagesKey = allImages.map((i) => i.url).join(',');
  if (imagesKey !== prevImagesKey.current) {
    prevImagesKey.current = imagesKey;
  }

  useEffect(() => {
    setActiveTab(showTabs ? 'look' : 'all');
    setActiveIndex(0);
    setLightboxIndex(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imagesKey]);

  const images =
    activeTab === 'all'
      ? allImages
      : allImages.filter((img) => classifyTab(img.type) === activeTab);

  // When tab changes, clamp activeIndex
  const [activeIndex, setActiveIndex] = useState(0);
  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    setActiveIndex(0);
    setLightboxIndex(0);
  };

  // ─── Zoom panel state ────────────────────────────────────────────────────
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });

  // ─── Lightbox state ──────────────────────────────────────────────────────
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // ─── Touch swipe — main image ─────────────────────────────────────────
  const [touchStart, setTouchStart] = useState<number | null>(null);

  // ─── Touch swipe — lightbox ───────────────────────────────────────────
  const [lbTouchStart, setLbTouchStart] = useState<number | null>(null);

  const mainRef = useRef<HTMLDivElement>(null);
  const thumbsRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!mainRef.current) return;
    const rect = mainRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setZoomPos({ x, y });
  }, []);

  // Main image swipe
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

  // Lightbox swipe
  const handleLbTouchStart = (e: React.TouchEvent) => {
    setLbTouchStart(e.touches[0].clientX);
  };
  const handleLbTouchEnd = (e: React.TouchEvent) => {
    if (lbTouchStart === null) return;
    const diff = lbTouchStart - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) {
      if (diff > 0) setLightboxIndex((i) => Math.min(i + 1, images.length - 1));
      else setLightboxIndex((i) => Math.max(i - 1, 0));
    }
    setLbTouchStart(null);
  };

  // Scroll active thumbnail into view
  useEffect(() => {
    if (!thumbsRef.current) return;
    const active = thumbsRef.current.children[activeIndex] as HTMLElement | undefined;
    if (active) active.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [activeIndex]);

  // Lightbox keyboard nav
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

  if (!allImages.length) {
    return (
      <div className="aspect-[3/4] w-full bg-slate-100 flex items-center justify-center rounded-sm">
        <span className="text-slate-400 text-sm tracking-widest uppercase">No Image</span>
      </div>
    );
  }

  const isNew = product.newArrival;
  const isBestseller = product.bestSeller;
  const isLowStock = product.stock && product.stock > 0 && product.stock <= 5;
  const isOutOfStock = product.stock === 0;

  const TAB_LABELS: Record<Tab, string> = {
    all: 'All',
    look: 'Look',
    fabric: 'Fabric',
    details: 'Details',
  };

  const zoomSrc = images[activeIndex]?.url ?? '';

  return (
    // Outer wrapper: positions the side zoom panel relative to the whole gallery
    <div className="relative">
      {/* ── Gallery tabs ── (shown only when ≥2 tab groups exist) */}
      {showTabs && (
        <div className="flex gap-5 mb-3" role="tablist" aria-label="Gallery views">
          {availableTabs.map((tab) => (
            <button
              key={tab}
              role="tab"
              aria-selected={activeTab === tab}
              onClick={() => handleTabChange(tab)}
              className={[
                'text-[10px] tracking-[0.2em] uppercase pb-1 border-b transition-colors duration-150',
                activeTab === tab
                  ? 'text-[#8A5A6A] border-[#8A5A6A]'
                  : 'text-slate-400 border-transparent hover:text-slate-600 hover:border-slate-300',
              ].join(' ')}
            >
              {TAB_LABELS[tab]}
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-4">
        {/* ── Desktop: Vertical thumbnail strip (lg+) ── */}
        <div className="hidden lg:flex flex-col gap-2 w-16 flex-shrink-0">
          {images.map((img, i) => (
            <button
              key={img.url + i}
              onClick={() => setActiveIndex(i)}
              aria-label={`View image ${i + 1}`}
              className={`relative aspect-[3/4] w-full overflow-hidden rounded-sm border transition-all duration-200 ${
                i === activeIndex
                  ? 'border-[#8A5A6A] shadow-sm'
                  : 'border-slate-200 opacity-60 hover:opacity-100 hover:border-slate-400'
              }`}
            >
              <Image
                src={img.url || '/placeholder.png'}
                alt={img.alt || `Product view ${i + 1}`}
                fill
                className="object-cover"
                sizes="64px"
                loading="lazy"
              />
            </button>
          ))}
        </div>

        {/* ── Main column ── */}
        <div className="flex-1 flex flex-col gap-3">
          {/* Main image */}
          <div
            ref={mainRef}
            className="relative aspect-[3/4] w-full overflow-hidden rounded-sm bg-slate-50 select-none"
            style={{ cursor: isZoomed ? 'crosshair' : 'zoom-in' }}
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

            <Image
              src={images[activeIndex]?.url ?? ''}
              alt={images[activeIndex]?.alt || product.name}
              fill
              priority={activeIndex === 0}
              className="object-cover transition-opacity duration-300"
              sizes="(max-width: 768px) 100vw, 55vw"
            />
          </div>

          {/* ── Mobile: Horizontal thumbnail strip (below lg) ── */}
          {images.length > 1 && (
            <div
              ref={thumbsRef}
              className="flex lg:hidden gap-2 overflow-x-auto scrollbar-none pb-1 -mx-1 px-1"
              aria-label="Product image thumbnails"
              role="list"
            >
              {images.map((img, i) => (
                <button
                  key={img.url + i}
                  role="listitem"
                  onClick={() => setActiveIndex(i)}
                  aria-label={`View image ${i + 1}`}
                  aria-pressed={i === activeIndex}
                  className={[
                    'relative flex-shrink-0 w-14 aspect-[3/4] overflow-hidden rounded-sm border transition-all duration-200',
                    i === activeIndex
                      ? 'border-[#8A5A6A] shadow-sm'
                      : 'border-slate-200 opacity-55 hover:opacity-100 hover:border-slate-400',
                  ].join(' ')}
                >
                  <Image
                    src={img.url || '/placeholder.png'}
                    alt={img.alt || `Product view ${i + 1}`}
                    fill
                    className="object-cover"
                    sizes="56px"
                    loading="lazy"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/*
       * ── Desktop side-panel zoom (lg+) ──
       *
       * FIX: Previously used CSS background-image which fails on signed/
       * authenticated CDN URLs because the browser makes a fresh unauthenticated
       * request for the background. Now uses a real <img> element inside an
       * overflow:hidden container with transform-origin and CSS transform scale
       * so the same authenticated request path is used.
       *
       * Positioned absolutely to the right of the outer wrapper;
       * does not affect flex layout of thumbnails + main column.
       */}
      <div
        aria-hidden="true"
        className={[
          'hidden lg:block',
          'absolute top-0 left-[calc(100%+1.5rem)]',
          'w-[420px] aspect-[3/4]',
          'overflow-hidden rounded-sm border border-slate-200 bg-slate-50',
          'shadow-lg',
          'pointer-events-none',
          'transition-opacity duration-200',
          isZoomed ? 'opacity-100' : 'opacity-0',
        ].join(' ')}
      >
        {zoomSrc && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={zoomSrc}
            alt=""
            aria-hidden="true"
            style={{
              position: 'absolute',
              width: '220%',
              height: '220%',
              maxWidth: 'none',
              top: `${-zoomPos.y * 1.2}%`,
              left: `${-zoomPos.x * 1.2}%`,
              objectFit: 'cover',
              pointerEvents: 'none',
            }}
          />
        )}
      </div>

      {/* ── Lightbox ── */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
          role="dialog"
          aria-label="Image viewer"
          aria-modal="true"
          onTouchStart={handleLbTouchStart}
          onTouchEnd={handleLbTouchEnd}
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
              alt={images[lightboxIndex]?.alt || product.name}
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
