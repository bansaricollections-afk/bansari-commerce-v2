import type { Guide } from './types';

export const guide: Guide = {
  slug: 'cotton-vs-crepe-vs-rayon-kurtas',
  title: 'Cotton vs Crepe vs Rayon: Which Kurta Fabric Lasts',
  description:
    'Three fabrics used constantly in Indian ethnic wear, with very different behaviour in heat, in the wash and after a year of wear.',
  publishedAt: '2026-09-03',
  updatedAt: '2026-09-03',
  category: 'Fabric & Care',
  excerpt:
    'Three fabrics that look similar on a listing and behave nothing alike after ten washes.',

  /* #22 — natural crepe, the least familiar of the three to most buyers. */
  hero: {
    productId: 22,
    imageIndex: 0,
    alt: 'A royal blue natural crepe printed kurta and palazzo set, showing crepe’s fluid drape and crease resistance',
  },

  body: [
    {
      type: 'p',
      text: 'Cotton, crepe and rayon appear constantly in ethnic wear listings, often at similar prices, and the description rarely explains how differently they behave. ==The gap shows up after a season of wear rather than in the shop.==',
    },

    {
      type: 'keyTakeaway',
      items: [
        '**Cotton** — breathable and durable. The default for anything worn often.',
        '**Crepe** — beautiful drape, resists creasing, but usually synthetic and warm.',
        '**Rayon** — soft and cheap, but **weak when wet** and the first to pill.',
        'Judge on **cost per wear**, not price. A ₹1,800 cotton set worn fifty times beats a ₹1,200 rayon one worn eight.',
      ],
    },

    { type: 'h2', text: 'Cotton' },
    {
      type: 'p',
      text: 'A natural fibre, breathable, absorbent and durable. It handles Indian heat better than either of the others and tolerates frequent washing, which makes it the sensible default for anything worn regularly.',
    },
    {
      type: 'ul',
      items: [
        'Strengths — breathability, durability, takes print and embroidery crisply, easy to wash.',
        'Weaknesses — creases, may shrink on first wash, less fluid drape than crepe.',
      ],
    },

    { type: 'h2', text: 'Crepe' },
    {
      type: 'p',
      text: 'Crepe describes a texture rather than a fibre — a crimped, slightly grainy surface that can be made from silk, polyester or blends. Most affordable ethnic-wear crepe is synthetic.',
    },
    {
      type: 'ul',
      items: [
        'Strengths — excellent drape, resists creasing, holds bold prints well, hangs elegantly.',
        'Weaknesses — usually synthetic and therefore less breathable; can feel warm in humidity; sensitive to high heat when ironing.',
      ],
    },
    {
      type: 'p',
      text: 'Crepe is a good choice for occasion wear where drape matters and the garment is worn for a few hours. **It is a poor choice for a full day in the heat.**',
    },

    {
      type: 'figure',
      productId: 21,
      imageIndex: 0,
      secondImageIndex: 3,
      width: 'wide',
      alt: 'A black natural crepe printed kurta and pant set, showing how crepe falls in smooth unbroken lines',
      secondAlt: 'The same crepe set from another angle, where the fabric’s grainy texture is visible',
      caption:
        'Crepe hangs in smooth lines and resists creasing — which is exactly why it does not breathe like cotton.',
    },

    { type: 'h2', text: 'Rayon (viscose)' },
    {
      type: 'p',
      text: 'Rayon is semi-synthetic — manufactured from processed cellulose. It is often marketed as behaving like cotton, and it does share the soft handle, but not the durability.',
    },
    {
      type: 'ul',
      items: [
        'Strengths — soft, good drape, takes colour vividly, inexpensive.',
        'Weaknesses — significantly weaker when wet, prone to shrinking and losing shape, and it tends to pill and thin sooner than cotton.',
      ],
    },
    {
      type: 'note',
      text: 'Rayon looks excellent in a photograph and disappointing after ten washes.',
    },

    {
      type: 'productInline',
      productId: 2,
      blurb: 'Pure rayon with hand Chikankari — soft handle, and worth hand washing cold.',
    },

    { type: 'h2', text: 'Choosing between them' },
    {
      type: 'p',
      text: 'For everyday and summer wear, cotton. For an occasion outfit where drape and a fluid silhouette matter more than breathability, crepe. Rayon is reasonable for pieces worn occasionally, where the low price matches the shorter life — but it is rarely the right choice for something you expect to wear weekly.',
    },
    {
      type: 'p',
      text: '==Cost per wear, rather than price, is the useful measure.== A ₹1,800 cotton set worn fifty times is cheaper than a ₹1,200 rayon set worn eight. The same logic applies to [cotton against linen](/guides/cotton-vs-linen-kurtas-gujarat-summers).',
    },

    {
      type: 'faq',
      items: [
        {
          q: 'Is crepe a natural fabric?',
          a: 'Crepe describes a crimped texture, not a fibre. It can be silk, polyester or a blend — most affordable ethnic-wear crepe is synthetic.',
        },
        {
          q: 'Is rayon the same as cotton?',
          a: 'No. Rayon is semi-synthetic, manufactured from processed cellulose. It shares cotton’s soft handle but not its strength, and it is significantly weaker when wet.',
        },
        {
          q: 'Which of the three is coolest in summer?',
          a: 'Cotton, clearly. It breathes and absorbs moisture. Crepe is usually synthetic and traps heat; rayon sits between the two.',
        },
        {
          q: 'Which lasts longest?',
          a: 'Cotton, by a wide margin, provided it is washed cold and line dried. Rayon is typically the first to pill and thin.',
        },
      ],
    },

    {
      type: 'cta',
      text: 'Most of our catalogue is cotton, for exactly this reason.',
      href: '/shop/cotton',
      label: 'Browse cotton ethnic wear',
    },
  ],
};
