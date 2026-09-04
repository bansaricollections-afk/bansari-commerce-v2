import Link from 'next/link';
import type { ReactNode } from 'react';

/**
 * Inline markup for guide prose.
 *
 * WHY THIS EXISTS
 * Guide blocks used to be flat strings, so there was no way to emphasise a
 * phrase inside a paragraph — every article rendered as an undifferentiated
 * grey wall. This adds the smallest vocabulary that fixes that:
 *
 *   **bold**          strong emphasis
 *   ==highlight==     the "remember this" marker, gold underlay
 *   [label](/href)    inline link
 *
 * SAFETY
 * Output is React elements built from captured substrings — never HTML. There
 * is deliberately no `dangerouslySetInnerHTML` in the guide renderer, so guide
 * content cannot inject markup even if it tries.
 *
 * Links are restricted to internal routes (`/...`). An external or protocol
 * URL is rendered as plain text rather than becoming a live outbound link, so
 * a stray `[x](javascript:...)` or an unvetted external domain can never be
 * clicked.
 */

/** Order matters: longest/most specific delimiters first. */
const PATTERN = /(\*\*[^*]+\*\*|==[^=]+==|\[[^\]]+\]\([^)\s]+\))/g;

const LINK = /^\[([^\]]+)\]\(([^)\s]+)\)$/;

export function renderInline(text: string): ReactNode {
  const parts = text.split(PATTERN).filter((s) => s !== '');

  // Fast path: nothing to parse, return the string as-is.
  if (parts.length === 1 && parts[0] === text) return text;

  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-semibold" style={{ color: 'var(--bc-text-ink)' }}>
          {part.slice(2, -2)}
        </strong>
      );
    }

    if (part.startsWith('==') && part.endsWith('==')) {
      /*
       * A soft gold underlay rather than a highlighter block: it reads as
       * emphasis on a cream page instead of looking like a search hit.
       * box-decoration-clone keeps the underlay intact across line breaks.
       */
      return (
        <mark
          key={i}
          className="box-decoration-clone bg-transparent px-[0.15em] font-medium"
          style={{
            color: 'var(--bc-text-ink)',
            backgroundImage:
              'linear-gradient(to top, var(--bc-gold-faint) 0%, var(--bc-gold-faint) 42%, transparent 42%)',
            boxShadow: 'inset 0 -1px 0 var(--bc-gold)',
          }}
        >
          {part.slice(2, -2)}
        </mark>
      );
    }

    const link = part.match(LINK);
    if (link) {
      const [, label, href] = link;
      // Internal routes only — see SAFETY above.
      if (href.startsWith('/') && !href.startsWith('//')) {
        return (
          <Link
            key={i}
            href={href}
            className="underline decoration-[1.5px] underline-offset-[3px] transition-colors"
            style={{
              color: 'var(--bc-brand-mauve)',
              textDecorationColor: 'var(--bc-brand-mauve-light)',
            }}
          >
            {label}
          </Link>
        );
      }
      return <span key={i}>{label}</span>;
    }

    return <span key={i}>{part}</span>;
  });
}
