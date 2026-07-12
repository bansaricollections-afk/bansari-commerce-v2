/**
 * SectionHeader — homepage feature-level section heading primitive.
 *
 * Renders a consistent eyebrow label + heading + optional subtitle
 * layout used across all Sprint 6 homepage sections. Intentionally a
 * Server Component: no browser APIs, no interactivity, no state.
 *
 * Placed in `src/components/home/` because it is a homepage feature
 * component, not a generic UI primitive.
 *
 * @example
 * ```tsx
 * <SectionHeader
 *   eyebrow="New Arrivals"
 *   heading="Freshly Curated"
 *   subtitle="Discover pieces added this season."
 *   align="center"
 * />
 * ```
 */

import { cn } from "@/lib/utils";

/** Horizontal alignment for the section header content. */
export type SectionHeaderAlign = "left" | "center" | "right";

/** Props for the SectionHeader component. */
export interface SectionHeaderProps {
  /**
   * Small uppercase label rendered above the main heading.
   * Typically used for category or section identification.
   */
  eyebrow?: string;

  /**
   * Primary section heading. Rendered as an `<h2>` by default.
   * Use `as` to override the element when the document outline requires it.
   */
  heading: string;

  /**
   * Optional descriptive subtitle rendered below the heading.
   * Kept to one or two sentences for visual hierarchy.
   */
  subtitle?: string;

  /**
   * Horizontal alignment of all text within the header.
   * @default "center"
   */
  align?: SectionHeaderAlign;

  /**
   * HTML element used to render the heading.
   * Override to `h3` for sub-sections that already have an `h2` ancestor.
   * @default "h2"
   */
  as?: "h1" | "h2" | "h3" | "h4";

  /** Additional className applied to the outer wrapper. */
  className?: string;
}

const alignClass: Record<SectionHeaderAlign, string> = {
  left: "text-left items-start",
  center: "text-center items-center",
  right: "text-right items-end",
};

/**
 * Shared section heading primitive for Sprint 6 homepage sections.
 * Renders as a Server Component.
 */
export function SectionHeader({
  eyebrow,
  heading,
  subtitle,
  align = "center",
  as: Tag = "h2",
  className,
}: SectionHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3",
        alignClass[align],
        className
      )}
    >
      {eyebrow && (
        <span
          className="text-[var(--bc-text-gold)] tracking-widest uppercase"
          style={{ fontSize: "var(--bc-text-xs)", fontFamily: "var(--font-inter), sans-serif" }}
        >
          {eyebrow}
        </span>
      )}

      <Tag
        className="text-[var(--bc-text-primary)] leading-tight"
        style={{ fontSize: "var(--bc-text-2xl)", fontFamily: "var(--font-playfair), serif" }}
      >
        {heading}
      </Tag>

      {subtitle && (
        <p
          className="max-w-xl text-[var(--bc-text-muted)] leading-relaxed"
          style={{ fontSize: "var(--bc-text-base)" }}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}
