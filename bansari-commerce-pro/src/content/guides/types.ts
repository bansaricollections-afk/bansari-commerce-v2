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

/**
 * INLINE MARKUP
 *
 * Any `text` field below is parsed for a deliberately tiny markup vocabulary
 * (see `src/components/guides/inline.tsx`):
 *
 *   **bold**            strong emphasis, rendered in full-strength ink
 *   ==highlight==       the "remember this" marker — gold underlay
 *   [label](/href)      inline link, internal routes only
 *
 * It is parsed into React elements, never into HTML — there is no
 * `dangerouslySetInnerHTML` anywhere in the guide renderer, so content still
 * cannot inject markup.
 *
 * Use `==highlight==` at most once or twice per article. Highlighting
 * everything is identical to highlighting nothing.
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
  | { type: 'cta'; text: string; href: string; label: string }
  /**
   * "In short" summary, placed near the top. Helps a reader who is scanning
   * decide whether to commit, and is the shape Google tends to lift for
   * featured snippets.
   */
  | { type: 'keyTakeaway'; items: string[] }
  /**
   * A real product photograph used as editorial imagery.
   *
   * `productId` must be a real, active product — the image is resolved from
   * that product's own `images[]` at render time. There is no way to point this
   * at a stock photo, which is deliberate.
   *
   * `alt` is written here rather than read from the stored image record,
   * because 88% of stored alt values are original filenames
   * ("ChatGPT Image Jul 19, 2026...") and are useless to a screen reader.
   */
  | {
      type: 'figure';
      productId: number;
      /** Which of the product's images to use. Defaults to 0. */
      imageIndex?: number;
      alt: string;
      caption?: string;
      /**
       * `wide` breaks the measure for a full-width editorial moment, rendered
       * as a DIPTYCH of two portraits rather than one letterboxed image.
       *
       * The catalogue is shot 4:5 full-length. A single wide image would have
       * to crop that to roughly 16:10, cutting off either the model's face or
       * the fall of the garment. Two portraits side by side fill the same
       * width while keeping both frames uncropped.
       */
      width?: 'inset' | 'wide';
      /** Second image for a `wide` diptych. Falls back to `imageIndex + 1`. */
      secondImageIndex?: number;
      /** Alt for the second frame. Required in practice for a diptych. */
      secondAlt?: string;
    }
  /**
   * A real product shown inline, with its live name and price, linking to the
   * product page. Price is read from the database at render time — never
   * written into guide copy, which would go stale silently.
   */
  | { type: 'productInline'; productId: number; blurb: string }
  /** Q&A. Also emitted as FAQPage structured data by the route. */
  | { type: 'faq'; items: { q: string; a: string }[] }
  /**
   * A LIVE, SELF-UPDATING set of products, chosen by filter rather than by id.
   *
   * WHY THIS EXISTS
   * `figure` and `productInline` name a specific product. That is right when
   * the prose is about that garment, and wrong for "here are the cotton kurta
   * sets we have for Navratri" — because the moment a new cotton kurta set is
   * added, the guide is out of date and nobody remembers to edit it. An
   * article that silently goes stale is worse than one that was never written,
   * because the reader cannot tell.
   *
   * This block stores a QUESTION, not an answer: "active cotton kurta sets
   * under ₹2,500, newest first". It is answered from the catalogue on every
   * render, so adding a product to a matching category makes it appear here
   * with no edit to the guide.
   *
   * SPARSENESS IS AN ACCEPTABLE OUTCOME
   * If the filter matches fewer than `minProducts` the block renders NOTHING.
   * A grid padded with near-misses, or a heading with one lonely product under
   * it, reads worse than the section not existing — and the same rule already
   * governs the browse landings.
   */
  | {
      type: 'productFeed';
      /** Section heading. Omitted if the block renders nothing. */
      heading: string;
      /** One line of context under the heading. */
      intro?: string;
      /**
       * Filters, passed straight to getFilteredProducts. Names are resolved
       * against the attribute tables, so an occasion or work that does not
       * exist matches nothing rather than everything.
       */
      filter: {
        category?: string;
        collection?: string;
        fabric?: string;
        color?: string;
        occasion?: string;
        work?: string;
        priceMin?: number;
        priceMax?: number;
      };
      /** How many to show. Defaults to 4. */
      limit?: number;
      /** Render nothing below this many matches. Defaults to 3. */
      minProducts?: number;
      /** Link to the matching shop page, so the reader can see the rest. */
      seeAllHref?: string;
    };

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
  /**
   * Lead image, shown on the article and on the index card. Resolved from a
   * real product's photography — see the `figure` block above for why `alt` is
   * written here rather than read from storage.
   *
   * Optional: a guide with no honest image match shows none rather than
   * borrowing an unrelated product's photo.
   */
  hero?: { productId: number; imageIndex?: number; alt: string };
  body: GuideBlock[];
};
