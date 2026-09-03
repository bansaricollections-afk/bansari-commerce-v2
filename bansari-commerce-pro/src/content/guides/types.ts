/**
 * Guide content model.
 *
 * Guides are typed TypeScript files rather than rows in the database or MDX.
 * They are edited far less often than products, they are version-controlled and
 * reviewable in a PR, and they need no admin UI or migration to ship. A typed
 * structure also means a malformed guide fails the build instead of rendering
 * broken on the storefront.
 *
 * IMPORTANT — these drafts state general, verifiable facts about fabric, care,
 * sizing and styling. They deliberately contain NO invented claims about the
 * business: no founder story, no artisan counts, no customer quotes, no review
 * figures. Anything of that kind has to come from the business itself.
 */

/** A block of body content. Kept deliberately small — this is prose, not a CMS. */
export type GuideBlock =
  | { type: 'p'; text: string }
  | { type: 'h2'; text: string }
  | { type: 'h3'; text: string }
  | { type: 'ul'; items: string[] }
  | { type: 'ol'; items: string[] }
  /** Pull quote / emphasis line, used sparingly. */
  | { type: 'note'; text: string }
  /**
   * A link into the catalogue. `href` must point at a real route — a landing
   * page or collection — never a filter combination that returns nothing.
   */
  | { type: 'cta'; text: string; href: string; label: string };

export type Guide = {
  slug: string;
  /** Used as the H1 and, with the brand suffix, the <title>. */
  title: string;
  /** Meta description. Aim 140-160 characters. */
  description: string;
  /** ISO date. Shown to readers and emitted as datePublished. */
  publishedAt: string;
  /** ISO date, updated when the guide is edited. */
  updatedAt: string;
  /** Short label shown on the index card. */
  category: 'Fabric & Care' | 'Occasion' | 'Fit & Size' | 'Buying Guide';
  /** One-sentence summary for the index page. */
  excerpt: string;
  body: GuideBlock[];
};
