import type { Guide } from './types';

export const guide: Guide = {
  slug: 'how-to-wash-cotton-kurta-without-shrinking',
  title: 'How to Wash a Cotton Kurta Without Shrinking It',
  description:
    'Cotton shrinks in heat, not in water. A step-by-step guide to washing cotton kurtas so they keep their length, colour and embroidery.',
  publishedAt: '2026-09-03',
  updatedAt: '2026-09-03',
  category: 'Fabric & Care',
  excerpt:
    'Cotton shrinks because of heat and agitation, not water. Get those two right and length is not a problem.',

  /* #17 — hand block printed cotton, the kind most vulnerable to a bad wash. */
  hero: {
    productId: 17,
    imageIndex: 0,
    alt: 'A mustard yellow hand block printed pure cotton kurta set, the kind of print that fades if washed in hot water',
  },

  body: [
    {
      type: 'p',
      text: 'Most cotton kurtas that shrink were not washed wrongly so much as ==dried wrongly==. Cotton fibres are stretched during weaving; heat and agitation let them relax back, and that relaxation is what you see as a shorter kurta. Control the temperature and the tumbling and the problem largely disappears.',
    },

    {
      type: 'keyTakeaway',
      items: [
        '**Cold water, always.** Under 30°C, inside out.',
        '**Never tumble dry.** This is the single biggest cause of shrinkage.',
        'Line dry in shade — Indian sun fades dye within a few washes.',
        'A shrunk kurta can usually be **partly recovered** by stretching while damp.',
      ],
    },

    { type: 'h2', text: 'The first wash matters most' },
    {
      type: 'p',
      text: 'Most of a cotton garment\'s shrinkage happens the first time it is washed. It is also when loose dye is most likely to run. Treat the first wash as a separate exercise:',
    },
    {
      type: 'ol',
      items: [
        'Wash alone, or with nothing you would mind discolouring.',
        'Cold water only — under 30°C.',
        'Turn the kurta inside out to protect embroidery and printed surfaces.',
        'No soaking. Long soaks pull dye out of printed cotton, particularly hand block prints.',
      ],
    },

    { type: 'h2', text: 'Machine washing after that' },
    {
      type: 'ul',
      items: [
        'Cold water, gentle or delicate cycle.',
        'Mild detergent. Skip anything marked "bright whites" — the optical brighteners dull coloured cotton over time.',
        'Never bleach, including oxygen bleach on coloured or printed fabric.',
        'Wash embroidered pieces in a mesh bag if you have one.',
        'Do not overload. Cotton needs room to move, and a packed drum increases abrasion.',
      ],
    },

    { type: 'h2', text: 'Drying — where kurtas are actually lost' },
    {
      type: 'p',
      text: '**The tumble dryer is the single biggest cause of shrinkage.** Heat plus mechanical tumbling is exactly the combination that relaxes stretched fibres.',
    },
    {
      type: 'ol',
      items: [
        'Line dry in shade. Direct Indian sun will fade dyes noticeably within a few washes.',
        'Hang by the shoulders on a wide hanger, not folded over a line — a line crease through the middle sets into cotton and is difficult to remove.',
        'Gently pull the garment back into shape while damp. This is the moment to recover any length.',
        'Dry fully before storing. Cotton stored damp mildews quickly in humidity.',
      ],
    },
    {
      type: 'note',
      text: 'A shrunk kurta is rarely lost. Dampen it, stretch it gently along its length, dry it flat.',
    },

    {
      type: 'figure',
      productId: 27,
      imageIndex: 0,
      secondImageIndex: 2,
      width: 'wide',
      alt: 'A multicolour Kalamkari printed pure cotton kurta set, showing the density of the print',
      secondAlt: 'Closer view of the same Kalamkari print, where the dye detail is visible',
      caption:
        'Printed cotton like this Kalamkari is where a hot wash shows first — the dye goes before the length does.',
    },

    { type: 'h2', text: 'Ironing and storage' },
    {
      type: 'p',
      text: 'Iron cotton slightly damp on a medium setting. For embroidered or mirror-work pieces, turn the garment inside out and press from the reverse — direct heat flattens raised thread and can crack mirror settings.',
    },
    {
      type: 'p',
      text: 'Store folded rather than hung for long periods. Hanging heavy embroidered kurtas for months distorts the shoulders.',
    },

    {
      type: 'faq',
      items: [
        {
          q: 'Does cotton shrink every time I wash it?',
          a: 'No. Most of the shrinkage happens on the first wash. After that, cotton washed cold and line dried stays stable.',
        },
        {
          q: 'Can I fix a kurta that has already shrunk?',
          a: 'Usually you can recover part of it. Dampen the garment, stretch it gently by hand along its length, and dry it flat. It rarely returns to full original length, but it often returns to wearable.',
        },
        {
          q: 'Is hand washing better than a machine?',
          a: 'For embroidered, mirror-work or hand block printed pieces, yes. For plain cotton, a cold delicate cycle with a mesh bag is fine and far less work.',
        },
        {
          q: 'Why did my printed kurta fade?',
          a: 'Usually sun rather than detergent. Drying printed cotton in direct Indian sun fades dye noticeably within a few washes — dry it in shade, inside out.',
        },
        {
          q: 'Can I iron over embroidery or mirror work?',
          a: 'Not directly. Turn the garment inside out and press from the reverse. Direct heat flattens raised thread and can crack mirror settings.',
        },
      ],
    },

    {
      type: 'cta',
      text: 'Cared for this way, a good cotton kurta set stays wearable for years.',
      href: '/shop/cotton-kurta-sets',
      label: 'Shop cotton kurta sets',
    },
  ],
};
