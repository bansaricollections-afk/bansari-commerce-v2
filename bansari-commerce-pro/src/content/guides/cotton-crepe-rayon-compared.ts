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
  body: [
    {
      type: 'p',
      text: 'Cotton, crepe and rayon appear constantly in ethnic wear listings, often at similar prices, and the description rarely explains how differently they behave. The gap shows up after a season of wear rather than in the shop.',
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
      text: 'Crepe is a good choice for occasion wear where drape matters and the garment is worn for a few hours. It is a poor choice for a full day in the heat.',
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
      text: 'Rayon is the fabric most likely to look excellent in a photograph and disappointing after ten washes. Hand wash it cold and never wring it.',
    },

    { type: 'h2', text: 'Choosing between them' },
    {
      type: 'p',
      text: 'For everyday and summer wear, cotton. For an occasion outfit where drape and a fluid silhouette matter more than breathability, crepe. Rayon is reasonable for pieces worn occasionally, where the low price matches the shorter life — but it is rarely the right choice for something you expect to wear weekly.',
    },
    {
      type: 'p',
      text: 'Cost per wear, rather than price, is the useful measure. A ₹1,800 cotton set worn fifty times is cheaper than a ₹1,200 rayon set worn eight.',
    },

    {
      type: 'cta',
      text: 'Most of our catalogue is cotton, for exactly this reason.',
      href: '/shop/cotton',
      label: 'Browse cotton ethnic wear',
    },
  ],
};
