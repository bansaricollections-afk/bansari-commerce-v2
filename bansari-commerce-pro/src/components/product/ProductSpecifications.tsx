import type { ProductSpecRow } from '@/services/product-attributes';

/**
 * Product Details — the structured attribute table on the PDP.
 *
 * WHY IT LOOKS LIKE THIS
 * The reference for this section was House of Chikankari's spec table, which
 * is the right IDEA — for ethnic wear, fabric, fit and length are the whole
 * purchase decision, and a buyer scans for them before reading a word of
 * description. It is the wrong LOOK for this brand: boxed cells, a teal label
 * column and a hard grid read as a datasheet.
 *
 * So the information architecture is borrowed and the treatment is not. Rows
 * are separated by hairline rules rather than boxed; labels are small
 * letter-spaced Inter in muted ink; values are Playfair, larger, and carry the
 * visual weight — because the value is what the customer came for. A single
 * gold rule marks the section, the way every other section header on this site
 * does.
 *
 * Renders nothing when there is nothing true to show. Each row is emitted only
 * where a real value exists, so a half-filled product yields a shorter table
 * rather than cells reading "N/A" — the pattern the reference site uses and
 * this one deliberately does not.
 */
export default function ProductSpecifications({ rows }: { rows: ProductSpecRow[] }) {
  if (rows.length === 0) return null;

  return (
    <section
      aria-labelledby="product-details-heading"
      className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14"
      style={{ borderTop: '1px solid var(--bc-border-soft)' }}
    >
      <div className="grid gap-10 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:gap-16">

        {/* ── Section header — the site's standard rule + eyebrow + serif heading ── */}
        <header className="lg:pt-1">
          <div className="flex items-center gap-3">
            <span
              aria-hidden
              className="block h-px w-8"
              style={{ backgroundColor: 'var(--bc-gold)' }}
            />
            <p
              className="text-[10px] font-medium uppercase tracking-[0.3em]"
              style={{ color: 'var(--bc-gold-dark)' }}
            >
              The Details
            </p>
          </div>

          <h2
            id="product-details-heading"
            className="mt-4 font-[family:var(--font-playfair)] text-2xl leading-tight sm:text-3xl"
            style={{ fontWeight: 400, color: 'var(--bc-text-primary)' }}
          >
            Product <em className="italic">Specifications</em>
          </h2>

          <p
            className="mt-4 max-w-sm text-[13px] leading-relaxed"
            style={{ color: 'var(--bc-text-muted)' }}
          >
            Every piece is catalogued by hand. What follows is recorded from the
            garment itself.
          </p>
        </header>

        {/* ── The table ──
           A real <dl>, not a grid of divs: this is definition data, and screen
           readers announce the label/value pairing for free. Two columns from
           sm upward so a long list does not become a single tall ribbon. */}
        <dl className="grid grid-cols-1 gap-x-12 sm:grid-cols-2">
          {rows.map((row) => (
            <div
              key={row.label}
              className="flex items-baseline justify-between gap-6 py-3.5"
              style={{
                /* A rule above EVERY row, uniformly.
                   The obvious refinement — skip the rule on the first row of
                   each column — cannot be done by index: a CSS grid fills
                   row-wise, so which item starts a column changes with the
                   breakpoint and the row count. A uniform rule is correct at
                   every width and reads as a deliberate opening rule under
                   the header rather than a missing one. */
                borderTop: '1px solid var(--bc-border-soft)',
              }}
            >
              <dt
                className="shrink-0 text-[10px] font-medium uppercase tracking-[0.18em]"
                style={{ color: 'var(--bc-text-muted)' }}
              >
                {row.label}
              </dt>
              <dd
                className="text-right font-[family:var(--font-playfair)] text-[15px] leading-snug sm:text-base"
                style={{ fontWeight: 400, color: 'var(--bc-text-primary)' }}
              >
                {row.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
