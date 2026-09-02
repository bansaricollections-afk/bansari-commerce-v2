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
  // A valid image URL must never be discarded merely because `type` is
  // missing/legacy — normalize to a safe default so it still renders.
  return raw
    .filter((img) => !!img.url)
    .map((img) => ({
      id: (img as ProductImage).id ?? img.url!,
      url: img.url!,
      alt: img.alt ?? '',
      type: (img.type as ProductImage['type']) ?? 'front',
      /*
       * mediaType was being dropped here. ProductImage has declared
       * `mediaType?: 'image' | 'video'` all along, but this normaliser did not
       * carry it through, so a video entry reached the render path looking
       * exactly like an image and was handed to next/image — which would have
       * produced a broken tile rather than a video.
       */
      mediaType: (img as ProductImage).mediaType ?? 'image',
      caption: (img as ProductImage).caption,
    }));
}

/** True when this entry should render as a <video> rather than an <Image>. */
function isVideo(media: Pick<ProductImage, 'mediaType' | 'url'>): boolean {
  if (media.mediaType === 'video') return true;
  // Belt and braces: entries uploaded before mediaType was recorded are
  // identified by extension, so existing rows do not need backfilling.
  return /\.(mp4|webm|mov)(\?|$)/i.test(media.url ?? '');
}

/**
 * Thumbnail for a video entry.
 *
 * A <video> with preload="metadata" renders its first frame, which avoids
 * requiring a separately uploaded poster image for every clip — one less
 * thing for whoever adds the product to get wrong, and one less asset to pay
 * egress on.
 *
 * The play badge is the only affordance telling a shopper this tile behaves
 * differently from its neighbours; without it a video thumbnail is
 * indistinguishable from a slightly odd photograph.
 */
function VideoThumb({ src, label }: { src: string; label: string }) {
  return (
    <>
      <video
        src={src}
        className="absolute inset-0 h-full w-full object-cover"
        muted
        playsInline
        preload="metadata"
        aria-label={label}
      />
      <span
        aria-hidden
        className="absolute inset-0 flex items-center justify-center bg-black/25"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 text-white drop-shadow">
          <path d="M8 5v14l11-7z" />
        </svg>
      </span>
    </>
  );
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
  /** Focus target when the viewer opens. Focus management only — no gallery state. */
  const lightboxCloseRef = useRef<HTMLButtonElement | null>(null);
  /** Viewer container, used to contain Tab within the dialog. */
  const lightboxRef = useRef<HTMLDivElement | null>(null);
  /**
   * The element that actually opened the viewer, recorded at activation time.
   * Previously this was inferred from document.activeElement inside the open
   * effect, which is unreliable for the main image: it is a div with
   * tabIndex={0}, and a mouse click does not focus such an element in every
   * browser, so focus could be restored to <body> instead of the opener.
   * Recording e.currentTarget at the moment of activation is exact for both
   * openers — the main image and the fullscreen button.
   */
  const lightboxOpenerRef = useRef<HTMLElement | null>(null);

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
      // Home/End jump to the ends of the set. Clamped to the same bounds the
      // arrows already use — no wrapping is introduced. preventDefault stops
      // the browser scrolling the page behind the open viewer.
      if (e.key === 'Home') { e.preventDefault(); setLightboxIndex(0); }
      if (e.key === 'End') { e.preventDefault(); setLightboxIndex(images.length - 1); }
      if (e.key === 'Escape') setLightboxOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightboxOpen, images.length]);

  /**
   * Lightbox focus management — the one accessibility gap the existing viewer
   * had. Escape, ArrowLeft/ArrowRight and the clamped (non-wrapping) index
   * behaviour above are already correct and are deliberately left as they are.
   *
   * On open, focus moves to the Close button so the keyboard is inside the
   * dialog. On close, focus returns to the element recorded in
   * lightboxOpenerRef at activation time — the main image or the fullscreen
   * button — falling back to document.activeElement if the viewer was ever
   * opened by some other path. Nothing here touches image data, indexing,
   * mouse, touch/swipe or zoom behaviour.
   */
  useEffect(() => {
    if (!lightboxOpen) return;
    const fallbackOpener = document.activeElement as HTMLElement | null;
    const raf = requestAnimationFrame(() => lightboxCloseRef.current?.focus());

    // Tab containment — the last gap in this dialog. The viewer is
    // conditionally rendered, so it unmounts on close and needs no
    // inert/aria-hidden handling. Arrow/Home/End/Escape are handled by the
    // separate keyboard effect above and are untouched here.
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const dialog = lightboxRef.current;
      if (!dialog) return;
      const focusables = dialog.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusables.length === 0) return;
      const first = focusables[0]!;
      const last = focusables[focusables.length - 1]!;
      const active = document.activeElement;

      if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      } else if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!dialog.contains(active)) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('keydown', onKeyDown);
      const opener = lightboxOpenerRef.current ?? fallbackOpener;
      opener?.focus?.();
      lightboxOpenerRef.current = null;
    };
  }, [lightboxOpen]);

  if (!allImages.length) {
    return (
      <div className="aspect-[3/4] w-full bg-slate-100 flex items-center justify-center rounded-sm">
        <span className="text-slate-400 text-sm tracking-widest uppercase">No Image</span>
      </div>
    );
  }

  const isNew = product.newArrival;
  const isBestseller = product.bestSeller;
  /*
   * NO "Almost Gone" BADGE.
   *
   * It rendered on `product.stock <= 5` with no size-managed branch, and this
   * boutique stocks about one set per style — so it appeared on every product
   * page. Urgency shown on the whole catalogue is not urgency; it reads as
   * manufactured scarcity on the page where the customer decides to buy.
   *
   * Removed alongside the equivalent "Low Stock" badge on ProductCard. Sold Out
   * stays: it is specific and true.
   */
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
              /* focus-visible only — the mauve ring appears for keyboard focus
                 and never on pointer interaction, so hover, dimensions,
                 spacing, layout and image selection are untouched. */
              className={`relative aspect-[3/4] w-full overflow-hidden rounded-sm border transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A5A6A] focus-visible:ring-offset-2 ${
                i === activeIndex
                  ? 'border-[#8A5A6A] shadow-sm'
                  : 'border-slate-200 opacity-60 hover:opacity-100 hover:border-slate-400'
              }`}
            >
              {isVideo(img) ? (
                <VideoThumb src={img.url} label={img.alt || `Product view ${i + 1}`} />
              ) : (
                <Image
                  src={img.url || '/placeholder.png'}
                  alt={img.alt || `Product view ${i + 1}`}
                  fill
                  className="object-cover"
                  sizes="64px"
                  loading="lazy"
                />
              )}
            </button>
          ))}
        </div>

        {/* ── Main column ── */}
        <div className="flex-1 flex flex-col gap-3">
          {/* Main image */}
          <div
            ref={mainRef}
            className="relative aspect-[3/4] w-full overflow-hidden rounded-sm bg-slate-50 select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A5A6A] focus-visible:ring-offset-2"
            style={{ cursor: isZoomed ? 'crosshair' : 'zoom-in' }}
            onMouseEnter={() => setIsZoomed(true)}
            onMouseLeave={() => setIsZoomed(false)}
            onMouseMove={handleMouseMove}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onClick={(e) => { lightboxOpenerRef.current = e.currentTarget; setLightboxIndex(activeIndex); setLightboxOpen(true); }}
            role="button"
            tabIndex={0}
            aria-label="View full size"
            /*
             * Kept as a div with role="button" rather than converted to a native
             * <button>: this container wraps the "View fullscreen" <button>
             * below, and a button inside a button is invalid HTML that browsers
             * silently restructure. Restructuring the gallery is out of scope,
             * so the ARIA button keyboard contract is honoured manually instead.
             *
             * Fixes two defects: Space did nothing (ARIA requires a button to
             * activate on both Enter and Space), and the old Enter path called
             * setLightboxOpen without setLightboxIndex, so keyboard users could
             * open the lightbox on the wrong image. Both now match onClick
             * exactly. The target guard stops a keypress on the nested
             * fullscreen button from also triggering this handler.
             */
            onKeyDown={(e) => {
              if (e.target !== e.currentTarget) return;
              if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
                e.preventDefault();
                lightboxOpenerRef.current = e.currentTarget;
                setLightboxIndex(activeIndex);
                setLightboxOpen(true);
              }
            }}
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
              onClick={(e) => { e.stopPropagation(); lightboxOpenerRef.current = e.currentTarget; setLightboxIndex(activeIndex); setLightboxOpen(true); }}
              aria-label="View fullscreen"
              className="absolute bottom-4 left-4 z-10 bg-white/80 backdrop-blur-sm p-1.5 rounded-sm hover:bg-white transition-colors"
            >
              <svg className="w-4 h-4 text-slate-700" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
              </svg>
            </button>

            {isVideo(images[activeIndex] ?? { url: '' }) ? (
              /*
               * Muted + autoPlay + playsInline is the only combination every
               * mobile browser will start without a tap; iOS blocks autoplay
               * outright unless the clip is muted and inline.
               *
               * `controls` is still present so sound and scrubbing remain
               * reachable — an autoplaying muted loop with no way to hear it
               * is a worse product page, not a slicker one.
               *
               * preload="metadata" fetches only the header, so the poster
               * frame appears without pulling the whole file for a shopper who
               * never opens this slide.
               */
              <video
                key={images[activeIndex]?.url}
                src={images[activeIndex]?.url}
                poster={images[activeIndex]?.hiResUrl}
                className="absolute inset-0 h-full w-full object-cover"
                autoPlay
                muted
                loop
                playsInline
                controls
                preload="metadata"
                aria-label={images[activeIndex]?.alt || `${product.name} — video`}
              />
            ) : (
              <Image
                src={images[activeIndex]?.url ?? ''}
                alt={images[activeIndex]?.alt || product.name}
                fill
                priority={activeIndex === 0}
                className="object-cover transition-opacity duration-300"
                sizes="(max-width: 768px) 100vw, 55vw"
              />
            )}
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
                  {isVideo(img) ? (
                    <VideoThumb src={img.url} label={img.alt || `Product view ${i + 1}`} />
                  ) : (
                    <Image
                      src={img.url || '/placeholder.png'}
                      alt={img.alt || `Product view ${i + 1}`}
                      fill
                      className="object-cover"
                      sizes="56px"
                      loading="lazy"
                    />
                  )}
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
        {/*
          Mounted only while actually zooming.

          This panel deliberately uses the FULL-resolution source — that is the
          point of a zoom — but it was mounted on page load, so every visitor
          downloaded it whether or not they ever hovered. Measured on
          production: 2.2MB of a 4.0MB product page, and the single heaviest
          asset by a wide margin.

          It is also `hidden lg:block`, so mobile visitors — who cannot use
          hover zoom at all — were paying that cost for an element they can
          never see. Browsers fetch images inside display:none containers.

          Deferring to first hover costs a short delay the first time the panel
          opens, on desktop, as a deliberate interaction. That is a far better
          trade than 2.2MB on every page view.
        */}
        {isZoomed && zoomSrc && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={zoomSrc}
            alt=""
            aria-hidden="true"
            decoding="async"
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
          ref={lightboxRef}
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
          role="dialog"
          aria-label="Image viewer"
          aria-modal="true"
          onTouchStart={handleLbTouchStart}
          onTouchEnd={handleLbTouchEnd}
        >
          <button
            ref={lightboxCloseRef}
            onClick={() => setLightboxOpen(false)}
            aria-label="Close viewer"
            className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
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
