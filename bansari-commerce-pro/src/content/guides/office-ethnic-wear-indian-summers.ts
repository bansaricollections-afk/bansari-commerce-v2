import type { Guide } from './types';

export const guide: Guide = {
  slug: 'office-ethnic-wear-for-indian-summers',
  title: 'Office Ethnic Wear for Indian Summers',
  description:
    'Ethnic wear that survives a commute, an air-conditioned office and the walk back. Fabric, cut and colour choices for daily workwear in Indian heat.',
  publishedAt: '2026-09-03',
  updatedAt: '2026-09-03',
  category: 'Occasion',
  excerpt:
    'The hard part is not the office. It is the commute at either end of it.',

  /* #32 — a cotton co-ord, which is the article's actual recommendation. */
  hero: {
    productId: 32,
    imageIndex: 0,
    alt: 'An olive green embroidered cotton co-ord set — a matched top and trousers with no dupatta to manage at a desk',
  },

  body: [
    {
      type: 'p',
      text: 'Office ethnic wear has to solve a problem most workwear advice ignores: ==you are not in one environment, you are in three==. A hot commute, an over-air-conditioned office, and another hot commute home. Clothing that works for one often fails at the others.',
    },

    {
      type: 'keyTakeaway',
      items: [
        '**Cotton** — absorbs the commute, does not hold cold against you indoors.',
        '**Co-ord sets are the most practical**: no dupatta to manage at a desk.',
        '**Mid-tones.** Pale shows dust and sweat; dark absorbs heat and shows it.',
        'Four or five sets with two or three neutral bottoms covers a full week.',
      ],
    },

    { type: 'h2', text: 'Fabric first' },
    {
      type: 'p',
      text: 'Cotton handles this better than anything else at a reasonable price. It absorbs moisture during the commute and does not hold cold against you indoors the way synthetics can. Crepe and rayon drape well and look polished, but they sit closer to the skin and are less forgiving in heat.',
    },
    {
      type: 'p',
      text: 'Whatever you choose, it needs to survive frequent washing. Workwear is worn far more often than occasion wear, and a fabric that fades after six washes is a poor investment however good it looks initially.',
    },

    { type: 'h2', text: 'Cuts that read professional' },
    {
      type: 'ul',
      items: [
        'Straight or A-line kurtas with side slits — clean lines, easy to sit in, no fuss.',
        'Kurta with palazzos or cigarette pants — the palazzo is cooler; the narrower pant reads more formal.',
        'Co-ord sets — arguably the most practical office ethnic wear, because there is no dupatta to manage at a desk.',
        'Three-quarter sleeves — long enough to look considered, short enough to stay out of the way.',
      ],
    },
    {
      type: 'p',
      text: 'The dupatta is the piece to think hardest about. It looks good and it is a genuine nuisance across a working day — it catches on chairs, drags on desks, and needs constant adjusting. **Many people buy kurta sets for the office and simply leave the dupatta at home.**',
    },

    {
      type: 'figure',
      productId: 46,
      imageIndex: 0,
      secondImageIndex: 2,
      width: 'wide',
      alt: 'An off-white mul chanderi cotton kurta set with floral embroidery, cut cleanly enough to read as workwear',
      secondAlt:
        'The same off-white kurta set from another angle, showing the sleeve length and clean silhouette',
      caption:
        'Clean lines and a small print — the marks of a working day show far less on this than on a solid.',
    },

    { type: 'h2', text: 'Colour and print' },
    {
      type: 'p',
      text: 'Mid-tones are the practical choice. Very pale colours show sweat and dust from a commute; very dark ones absorb heat and show it more visibly. Small prints hide the marks of a day better than solids, which is why block prints are so common in workwear.',
    },
    {
      type: 'note',
      text: 'Buy two of anything that genuinely works. Workwear is a rotation, not a wardrobe of singles.',
    },

    {
      type: 'productInline',
      productId: 8,
      blurb: 'A sage green co-ord — no dupatta, nothing to adjust across a working day.',
    },

    { type: 'h2', text: 'Building a week' },
    {
      type: 'p',
      text: 'Four to five sets, in fabrics you can wash easily, will cover a working week with one in the wash. Choose bottoms in two or three neutral shades so tops and bottoms recombine — **that turns five sets into considerably more than five outfits**.',
    },

    {
      type: 'faq',
      items: [
        {
          q: 'Is a kurta set too traditional for a corporate office?',
          a: 'A straight or A-line kurta with cigarette pants reads as professional in most Indian offices. If you want something more contemporary, a co-ord set does the same job with cleaner lines.',
        },
        {
          q: 'Do I need to wear the dupatta to work?',
          a: 'Rarely. It catches on chairs and needs constant adjusting. Most people buy the set and leave the dupatta at home on working days.',
        },
        {
          q: 'What fabric survives daily wear and frequent washing?',
          a: 'Cotton. Crepe and rayon drape more smoothly and look polished, but they sit closer to the skin and are less forgiving on a hot commute.',
        },
        {
          q: 'How do I stop looking crumpled by the afternoon?',
          a: 'Choose small prints over solids — they hide creases and marks far better — and avoid linen for workwear unless you genuinely like the crumpled look.',
        },
      ],
    },

    {
      type: 'cta',
      text: 'Cotton co-ord sets are our most practical office option.',
      href: '/shop/cotton-co-ord-sets',
      label: 'Shop cotton co-ord sets',
    },
  ],
};
