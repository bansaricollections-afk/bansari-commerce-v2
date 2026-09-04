import type { Guide } from './types';

export const guide: Guide = {
  slug: 'cotton-vs-linen-kurtas-gujarat-summers',
  title: 'Cotton vs Linen Kurtas for Gujarat Summers',
  description:
    'Both are breathable, but they behave differently in heat, humidity and the wash. A practical comparison of cotton and linen kurtas for Indian summers.',
  publishedAt: '2026-09-03',
  updatedAt: '2026-09-03',
  category: 'Fabric & Care',
  excerpt:
    'Both breathe. They behave very differently in humidity, in the wash, and after a year of wear.',

  /* #33 — pure linen, so the hero shows the fabric the article argues about. */
  hero: {
    productId: 33,
    imageIndex: 0,
    alt: 'A mustard pure linen printed kurta set with dupatta, showing linen’s characteristic texture and looser drape',
  },

  body: [
    {
      type: 'p',
      text: 'Cotton and linen get grouped together as "the breathable ones", which is true and not very useful. In a Gujarat summer — long, dry heat through May, then humidity once the monsoon arrives — ==they behave differently enough that the choice is worth making deliberately==.',
    },

    {
      type: 'keyTakeaway',
      items: [
        '**Linen wins in dry heat** — it holds itself off the skin and lets air through.',
        '**Cotton wins in humidity** — it absorbs moisture instead of letting it sit.',
        'Linen creases within minutes of sitting down. That never changes.',
        'Cotton holds print and embroidery more crisply, and costs less to replace.',
      ],
    },

    { type: 'h2', text: 'How each handles heat' },
    {
      type: 'p',
      text: 'Linen has the edge in still, dry heat. Its fibres are thicker and the weave is looser, so it holds itself slightly away from the skin and lets air move through. That gap is why linen feels cool even when the air does not.',
    },
    {
      type: 'p',
      text: 'Cotton wins on humidity and on movement. It absorbs moisture readily and pulls it away from the skin, which matters more once the air is damp. It also drapes closer, so it does not billow — an advantage on a scooter or in a crowd.',
    },

    { type: 'h2', text: 'The wrinkle question' },
    {
      type: 'p',
      text: 'Linen creases, and it creases within minutes of sitting down. ==This is a property of the fibre, not a defect==, and no amount of ironing prevents it recurring. If crumpled linen reads as relaxed to you, it is a non-issue. If it reads as untidy, linen will irritate you daily.',
    },
    {
      type: 'p',
      text: 'Cotton creases too, but less sharply, and it recovers better through the day.',
    },
    {
      type: 'note',
      text: 'Sit on the fabric for thirty seconds and stand up. What you see is what you will see at 4pm.',
    },

    {
      type: 'figure',
      productId: 14,
      imageIndex: 0,
      secondImageIndex: 2,
      width: 'wide',
      alt: 'A beige pure linen patchwork kurta and palazzo set, showing linen’s open weave and relaxed fall',
      secondAlt:
        'The same linen set from another angle, where the fabric’s texture and natural creasing are visible',
      caption:
        'Linen, photographed honestly — the texture that makes it desirable is the same texture that creases.',
    },

    { type: 'h2', text: 'Wear and washing' },
    {
      type: 'ul',
      items: [
        'Cotton may shrink slightly on first wash. Cold water and line drying largely prevents it.',
        'Linen softens with every wash and rarely shrinks after the first. It gets better with age in a way cotton does not.',
        'Cotton takes dye more evenly, so prints and embroidery tend to look crisper on it.',
        'Linen is usually the more expensive of the two, and the price gap widens at higher quality.',
      ],
    },

    { type: 'h2', text: 'Which to choose' },
    {
      type: 'p',
      text: 'For everyday wear through an Indian summer — office, errands, family visits — cotton is the more practical default. It handles humidity, holds print and embroidery well, and costs less to replace.',
    },
    {
      type: 'p',
      text: 'Choose linen when you want the drape and the texture, you are mostly in dry heat, and creasing does not bother you. **A linen co-ord set is a genuinely different look from a cotton one**, not just a different price.',
    },

    {
      type: 'productInline',
      productId: 11,
      blurb: 'Coral pink pure linen, cut as a kurta and palazzo set.',
    },

    {
      type: 'faq',
      items: [
        {
          q: 'Which is cooler, cotton or linen?',
          a: 'Linen in still, dry heat, because its looser weave holds the fabric off the skin. Cotton once the air is humid, because it absorbs moisture rather than letting it sit against you.',
        },
        {
          q: 'Does linen stop creasing after a few washes?',
          a: 'No. It softens, but creasing is how the fibre behaves and it does not go away. Buy linen only if you are comfortable with that look.',
        },
        {
          q: 'Why is linen more expensive?',
          a: 'Flax is slower and more labour-intensive to process into yarn than cotton, and the price gap widens at higher quality.',
        },
        {
          q: 'Which lasts longer?',
          a: 'Linen, generally — it is a stronger fibre and improves with age. Cotton is easier and cheaper to replace, which matters for pieces worn very often.',
        },
      ],
    },

    {
      type: 'cta',
      text: 'We stock both — cotton across most of the catalogue, with a smaller linen selection.',
      href: '/shop/cotton',
      label: 'Browse cotton ethnic wear',
    },
  ],
};
