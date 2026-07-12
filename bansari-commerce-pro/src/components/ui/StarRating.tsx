/**
 * StarRating — read-only star display component.
 *
 * Renders a row of filled, half-filled, and empty stars for a given
 * numeric rating. Intentionally a Server Component: it has no browser
 * dependencies, no interactivity, and no React state or effects.
 *
 * @example
 * ```tsx
 * <StarRating rating={4.5} max={5} />
 * ```
 */

import { cn } from "@/lib/utils";

/** Props for the StarRating component. */
export interface StarRatingProps {
  /** Numeric rating value (e.g. 3.7). Clamped to [0, max]. */
  rating: number;
  /** Maximum number of stars to display. @default 5 */
  max?: number;
  /** Size class applied to each star SVG. @default "w-4 h-4" */
  size?: string;
  /** Additional className applied to the wrapper element. */
  className?: string;
  /** Accessible label override. Defaults to "X out of Y stars". */
  label?: string;
}

/**
 * Returns the fill state for a star at a given index.
 * "full"  — index < floor(rating)
 * "half"  — index === floor(rating) and fractional part >= 0.25
 * "empty" — otherwise
 */
function getStarFill(
  index: number,
  rating: number
): "full" | "half" | "empty" {
  if (index < Math.floor(rating)) return "full";
  if (index === Math.floor(rating) && rating % 1 >= 0.25) return "half";
  return "empty";
}

/** Single SVG star icon with fill support. */
function Star({
  fill,
  size,
}: {
  fill: "full" | "half" | "empty";
  size: string;
}) {
  const id = `half-${Math.random().toString(36).slice(2, 7)}`;

  return (
    <svg
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={cn(size)}
    >
      {fill === "half" && (
        <defs>
          <linearGradient id={id}>
            <stop offset="50%" stopColor="var(--bc-gold-warm, #C9A96E)" />
            <stop offset="50%" stopColor="transparent" />
          </linearGradient>
        </defs>
      )}
      <path
        d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
        fill={
          fill === "full"
            ? "var(--bc-gold-warm, #C9A96E)"
            : fill === "half"
              ? `url(#${id})`
              : "none"
        }
        stroke="var(--bc-gold-warm, #C9A96E)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Read-only star rating display. Renders as a Server Component. */
export function StarRating({
  rating,
  max = 5,
  size = "w-4 h-4",
  className,
  label,
}: StarRatingProps) {
  // Clamp rating to valid range.
  const clamped = Math.min(Math.max(rating, 0), max);
  const accessibleLabel = label ?? `${clamped} out of ${max} stars`;

  return (
    <div
      role="img"
      aria-label={accessibleLabel}
      className={cn("flex items-center gap-0.5", className)}
    >
      {Array.from({ length: max }, (_, i) => (
        <Star key={i} fill={getStarFill(i, clamped)} size={size} />
      ))}
    </div>
  );
}
