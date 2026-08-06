"use client";

/**
 * ImageWithFallback — Reusable branded image wrapper
 *
 * Wraps next/image and intercepts load errors:
 *   1. First failure → tries /placeholder-product.jpg (local branded asset)
 *   2. Second failure → renders an inline SVG branded placeholder
 *
 * Usage:
 *   <ImageWithFallback src={url} alt="..." fill />
 *   <ImageWithFallback src={url} alt="..." width={300} height={400} />
 *
 * Requirements:
 *   - Never shows a broken-image browser icon
 *   - Branded — uses bc design tokens where possible
 *   - Works with fill, width/height, and all standard next/image props
 */

import Image, { type ImageProps } from 'next/image';
import { useState } from 'react';

const LOCAL_FALLBACK = '/placeholder-product.jpg';

// Inline SVG placeholder rendered only when local fallback also fails
function BrandedPlaceholder({ alt }: { alt: string }) {
  return (
    <div
      role="img"
      aria-label={alt}
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f3ede6',
        gap: 8,
      }}
    >
      <svg
        width="40"
        height="40"
        viewBox="0 0 40 40"
        fill="none"
        aria-hidden="true"
        style={{ opacity: 0.35 }}
      >
        <rect x="1" y="1" width="38" height="38" rx="2" stroke="#8B6F47" strokeWidth="1.5" />
        <text
          x="50%"
          y="54%"
          dominantBaseline="middle"
          textAnchor="middle"
          fontFamily="Georgia, serif"
          fontSize="18"
          fill="#8B6F47"
          letterSpacing="2"
        >
          B
        </text>
      </svg>
      <span
        style={{
          fontFamily: 'Georgia, serif',
          fontSize: 10,
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          color: '#8B6F47',
          opacity: 0.6,
        }}
      >
        Bansari
      </span>
    </div>
  );
}

type Props = Omit<ImageProps, 'onError'>;

export default function ImageWithFallback({ src, alt, ...rest }: Props) {
  const [imgSrc, setImgSrc] = useState<ImageProps['src']>(src);
  const [failed, setFailed] = useState(false);

  function handleError() {
    if (imgSrc !== LOCAL_FALLBACK) {
      setImgSrc(LOCAL_FALLBACK);
    } else {
      setFailed(true);
    }
  }

  if (failed) {
    return <BrandedPlaceholder alt={alt as string} />;
  }

  return <Image {...rest} src={imgSrc} alt={alt} onError={handleError} />;
}
