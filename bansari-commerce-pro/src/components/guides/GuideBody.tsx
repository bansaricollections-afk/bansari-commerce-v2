import Image from 'next/image';
import Link from 'next/link';

import type { GuideBlock } from '@/content/guides';
import { renderInline } from '@/components/guides/inline';
import { imageAt, type GuideMedia } from '@/lib/guide-media';

/**
 * Renders a guide's body blocks.
 *
 * Deliberately a small fixed set of block types rather than raw HTML or MDX:
 * guide content cannot inject markup, and every block is styled to the site's
 * editorial register in one place.
 *
 * COLOUR NOTE
 * This used to be styled with Tailwind's default `slate-*` scale, which is a
 * COOL blue-grey. The rest of the site runs on a warm plum-based ink
 * (--bc-text-ink / --bc-text-mid) over cream. The guides therefore rendered
 * visibly colder and greyer than every other page and read as a different
 * website. Everything here now uses the brand tokens.
 */
export default function GuideBody({
  blocks,
  media,
}: {
  blocks: GuideBlock[];
  media: Map<number, GuideMedia>;
}) {
  /*
   * The first paragraph gets a drop cap and a larger size — a standing
   * editorial convention that gives the reader a way in.
   */
  const firstParagraph = blocks.findIndex((b) => b.type === 'p');

  /*
   * Section numbering. Precomputed so each h2 knows its ordinal — the running
   * numeral is a magazine convention that gives a long article visible
   * structure and makes it feel authored rather than generated.
   */
  const h2Ordinal = new Map<number, number>();
  let n = 0;
  blocks.forEach((b, idx) => {
    if (b.type === 'h2') h2Ordinal.set(idx, ++n);
  });

  return (
    <div
      className="bc-guide-prose"
      style={{ color: 'var(--bc-text-mid)', fontSize: 'var(--bc-base)' }}
    >
      {blocks.map((block, i) => {
        switch (block.type) {
          case 'h2':
            return (
              <h2
                key={i}
                className="mt-20 mb-6 font-normal"
                style={{
                  fontFamily: "var(--font-playfair), 'Playfair Display', Georgia, serif",
                  fontSize: 'var(--bc-xl)',
                  lineHeight: 1.06,
                  letterSpacing: '-0.015em',
                  color: 'var(--bc-text-rich)',
                  textWrap: 'balance',
                }}
              >
                {/* Running numeral — sits above the heading, gold, small caps. */}
                <span
                  className="mb-4 block font-semibold uppercase"
                  style={{
                    fontFamily: "var(--font-inter), 'Inter', sans-serif",
                    fontSize: 'var(--bc-xs)',
                    letterSpacing: '0.32em',
                    color: 'var(--bc-text-gold)',
                  }}
                  aria-hidden="true"
                >
                  {String(h2Ordinal.get(i) ?? 0).padStart(2, '0')}
                </span>
                {renderInline(block.text)}
              </h2>
            );

          case 'h3':
            return (
              <h3
                key={i}
                className="mt-9 mb-3 font-semibold"
                style={{ fontSize: 'var(--bc-md)', color: 'var(--bc-text-rich)' }}
              >
                {renderInline(block.text)}
              </h3>
            );

          case 'p':
            return (
              <p
                key={i}
                className={i === firstParagraph ? 'bc-guide-lead mb-6' : 'mb-6'}
                style={{ lineHeight: 1.75 }}
              >
                {renderInline(block.text)}
              </p>
            );

          case 'ul':
            return (
              <ul key={i} className="mb-7 space-y-3 pl-5">
                {block.items.map((item, j) => (
                  <li
                    key={j}
                    className="list-disc"
                    style={{ lineHeight: 1.7, marginInlineStart: '0.25rem' }}
                  >
                    <span style={{ color: 'var(--bc-text-mid)' }}>{renderInline(item)}</span>
                  </li>
                ))}
              </ul>
            );

          case 'ol':
            return (
              <ol key={i} className="mb-7 space-y-3 pl-5">
                {block.items.map((item, j) => (
                  <li
                    key={j}
                    className="list-decimal font-medium"
                    style={{ lineHeight: 1.7, marginInlineStart: '0.25rem' }}
                  >
                    <span className="font-normal" style={{ color: 'var(--bc-text-mid)' }}>
                      {renderInline(item)}
                    </span>
                  </li>
                ))}
              </ol>
            );

          case 'note':
            /*
             * Statement pull quote. Deliberately breaks the measure and runs
             * wider than the body column — in print this is what stops a page
             * of text reading as a page of text. Large Cormorant italic, gold
             * rules above and below, no quotation marks (the scale carries it).
             */
            return (
              <blockquote key={i} className="bc-guide-breakout my-16 text-center">
                <span
                  className="mx-auto mb-8 block h-px w-16"
                  style={{ background: 'var(--bc-gold)' }}
                  aria-hidden="true"
                />
                <p
                  className="mx-auto italic"
                  style={{
                    fontFamily: "'Cormorant Garamond', Georgia, serif",
                    fontSize: 'var(--bc-xl)',
                    fontWeight: 300,
                    lineHeight: 1.22,
                    letterSpacing: '-0.01em',
                    color: 'var(--bc-text-rich)',
                    maxWidth: '22ch',
                    textWrap: 'balance',
                  }}
                >
                  {renderInline(block.text)}
                </p>
                <span
                  className="mx-auto mt-8 block h-px w-16"
                  style={{ background: 'var(--bc-gold)' }}
                  aria-hidden="true"
                />
              </blockquote>
            );

          case 'keyTakeaway':
            return (
              <aside
                key={i}
                className="my-10 p-6"
                style={{
                  background: 'var(--bc-warm)',
                  borderTop: '2px solid var(--bc-gold)',
                }}
              >
                <p
                  className="mb-4 font-semibold uppercase"
                  style={{
                    fontSize: 'var(--bc-xs)',
                    letterSpacing: '0.18em',
                    color: 'var(--bc-text-gold)',
                  }}
                >
                  In short
                </p>
                <ul className="space-y-2.5">
                  {block.items.map((item, j) => (
                    <li key={j} className="flex gap-3" style={{ lineHeight: 1.65 }}>
                      <span aria-hidden="true" style={{ color: 'var(--bc-gold)' }}>
                        —
                      </span>
                      <span style={{ color: 'var(--bc-text-rich)' }}>{renderInline(item)}</span>
                    </li>
                  ))}
                </ul>
              </aside>
            );

          case 'figure': {
            const m = media.get(block.productId);
            // Missing/deactivated product → omit the block, never a placeholder.
            if (!m) return null;
            const wide = block.width === 'wide';
            const secondIdx = block.secondImageIndex ?? (block.imageIndex ?? 0) + 1;
            /*
             * Only pair up if a genuinely different second frame exists —
             * otherwise the diptych would show the same photograph twice.
             */
            const hasSecond =
              wide && m.images.length > 1 && m.images[secondIdx] !== undefined;

            return (
              <figure key={i} className={wide ? 'bc-guide-breakout my-16' : 'my-14'}>
                <Link
                  href={m.href}
                  className={`group grid gap-3 ${hasSecond ? 'sm:grid-cols-2' : ''}`}
                >
                  <div
                    className="relative aspect-[4/5] overflow-hidden"
                    style={{ background: 'var(--bc-stone)' }}
                  >
                    <Image
                      src={imageAt(m, block.imageIndex)}
                      alt={block.alt}
                      fill
                      sizes={
                        hasSecond
                          ? '(max-width: 640px) 100vw, 660px'
                          : wide
                            ? '(max-width: 1360px) 100vw, 1360px'
                            : '(max-width: 768px) 100vw, 780px'
                      }
                      className="object-cover object-top transition-transform duration-[900ms] ease-out group-hover:scale-[1.04]"
                    />
                  </div>

                  {hasSecond && (
                    <div
                      className="relative aspect-[4/5] overflow-hidden"
                      style={{ background: 'var(--bc-stone)' }}
                    >
                      <Image
                        src={imageAt(m, secondIdx)}
                        alt={block.secondAlt ?? block.alt}
                        fill
                        sizes="(max-width: 640px) 100vw, 660px"
                        className="object-cover object-top transition-transform duration-[900ms] ease-out group-hover:scale-[1.04]"
                      />
                    </div>
                  )}
                </Link>
                {block.caption && (
                  /* Caption in the margin idiom: gold hairline, then small caps. */
                  <figcaption className="mt-5 flex gap-4">
                    <span
                      className="mt-2 block h-px w-8 shrink-0"
                      style={{ background: 'var(--bc-gold)' }}
                      aria-hidden="true"
                    />
                    <span
                      style={{
                        fontSize: 'var(--bc-caption)',
                        letterSpacing: '0.04em',
                        color: 'var(--bc-text-muted)',
                        lineHeight: 1.65,
                      }}
                    >
                      {renderInline(block.caption)}
                    </span>
                  </figcaption>
                )}
              </figure>
            );
          }

          case 'productInline': {
            const m = media.get(block.productId);
            if (!m) return null;
            return (
              <Link
                key={i}
                href={m.href}
                className="group my-10 flex gap-5 p-4 transition-colors"
                style={{ background: 'var(--bc-cream)', border: '1px solid var(--bc-border)' }}
              >
                <div
                  className="relative h-28 w-24 shrink-0 overflow-hidden"
                  style={{ background: 'var(--bc-stone)' }}
                >
                  <Image
                    src={imageAt(m, 0)}
                    alt={m.name}
                    fill
                    sizes="96px"
                    className="object-cover"
                  />
                </div>
                <div className="flex flex-col justify-center">
                  <p
                    className="mb-1 font-semibold uppercase"
                    style={{
                      fontSize: 'var(--bc-xs)',
                      letterSpacing: '0.16em',
                      color: 'var(--bc-text-gold)',
                    }}
                  >
                    From our range
                  </p>
                  <p
                    className="leading-snug"
                    style={{
                      fontFamily: "var(--font-playfair), 'Playfair Display', Georgia, serif",
                      fontSize: 'var(--bc-md)',
                      color: 'var(--bc-text-rich)',
                    }}
                  >
                    {m.name}
                  </p>
                  <p className="mt-1" style={{ fontSize: 'var(--bc-sm)', color: 'var(--bc-text-mid)' }}>
                    {block.blurb}
                  </p>
                  {/* Price read live from the database, never written into copy. */}
                  <p
                    className="mt-2 font-medium"
                    style={{ fontSize: 'var(--bc-sm)', color: 'var(--bc-text-ink)' }}
                  >
                    ₹{m.price.toLocaleString('en-IN')}
                  </p>
                </div>
              </Link>
            );
          }

          case 'faq':
            return (
              <div key={i} className="my-10">
                {block.items.map((item, j) => (
                  <details
                    key={j}
                    className="group border-b"
                    style={{ borderColor: 'var(--bc-border)' }}
                  >
                    <summary
                      className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 font-medium"
                      style={{ color: 'var(--bc-text-rich)', fontSize: 'var(--bc-sm)' }}
                    >
                      {item.q}
                      <span
                        aria-hidden="true"
                        className="shrink-0 transition-transform group-open:rotate-45"
                        style={{ color: 'var(--bc-gold)' }}
                      >
                        +
                      </span>
                    </summary>
                    <p className="pb-5 pr-8" style={{ lineHeight: 1.7 }}>
                      {renderInline(item.a)}
                    </p>
                  </details>
                ))}
              </div>
            );

          case 'cta':
            return (
              <div
                key={i}
                className="my-12 py-8 text-center"
                style={{
                  borderTop: '1px solid var(--bc-border)',
                  borderBottom: '1px solid var(--bc-border)',
                }}
              >
                <p className="mb-5" style={{ lineHeight: 1.7 }}>
                  {renderInline(block.text)}
                </p>
                <Link href={block.href} className="bc-cta-primary">
                  {block.label}
                </Link>
              </div>
            );

          default:
            return null;
        }
      })}
    </div>
  );
}
