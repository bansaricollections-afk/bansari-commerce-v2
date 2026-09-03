import Link from 'next/link';

import type { GuideBlock } from '@/content/guides';

/**
 * Renders a guide's body blocks.
 *
 * Deliberately a small fixed set of block types rather than raw HTML or MDX:
 * guide content cannot inject markup, and every block is styled to the site's
 * editorial register in one place.
 */
export default function GuideBody({ blocks }: { blocks: GuideBlock[] }) {
  return (
    <div className="max-w-2xl">
      {blocks.map((block, i) => {
        switch (block.type) {
          case 'h2':
            return (
              <h2
                key={i}
                className="mt-12 mb-4 font-[family:var(--font-playfair)] text-2xl font-normal leading-snug text-slate-900"
              >
                {block.text}
              </h2>
            );

          case 'h3':
            return (
              <h3 key={i} className="mt-8 mb-3 text-base font-semibold text-slate-900">
                {block.text}
              </h3>
            );

          case 'p':
            return (
              <p key={i} className="mb-5 text-[15px] leading-[1.8] text-slate-700">
                {block.text}
              </p>
            );

          case 'ul':
            return (
              <ul key={i} className="mb-6 space-y-2.5 pl-5">
                {block.items.map((item, j) => (
                  <li
                    key={j}
                    className="list-disc text-[15px] leading-[1.75] text-slate-700 marker:text-[#8A5A6A]"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            );

          case 'ol':
            return (
              <ol key={i} className="mb-6 space-y-2.5 pl-5">
                {block.items.map((item, j) => (
                  <li
                    key={j}
                    className="list-decimal text-[15px] leading-[1.75] text-slate-700 marker:text-[#8A5A6A] marker:font-semibold"
                  >
                    {item}
                  </li>
                ))}
              </ol>
            );

          case 'note':
            /* Gold left rule — the brand's emphasis marker, used sparingly. */
            return (
              <p
                key={i}
                className="my-8 border-l-2 border-[#C9A96E] bg-[#FBF8F4] py-4 pl-5 pr-4 text-[15px] italic leading-[1.7] text-slate-700"
              >
                {block.text}
              </p>
            );

          case 'cta':
            return (
              <div key={i} className="my-10 border-y border-slate-200 py-6">
                <p className="mb-3 text-[15px] leading-relaxed text-slate-700">{block.text}</p>
                <Link
                  href={block.href}
                  className="inline-block bg-slate-900 px-6 py-3 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-white transition-colors hover:bg-[#8A5A6A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A5A6A] focus-visible:ring-offset-2"
                >
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
