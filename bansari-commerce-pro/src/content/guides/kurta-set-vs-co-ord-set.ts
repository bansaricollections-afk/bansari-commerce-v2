import type { Guide } from './types';

export const guide: Guide = {
  slug: 'kurta-set-vs-co-ord-set',
  title: 'Kurta Set vs Co-Ord Set: Which Should You Buy?',
  description:
    'They overlap, but they are not the same purchase. How kurta sets and co-ord sets differ in formality, versatility and cost per wear.',
  publishedAt: '2026-09-03',
  updatedAt: '2026-09-03',
  category: 'Buying Guide',
  excerpt:
    'They overlap more than the labels suggest. The real difference is how often you will wear the pieces apart.',

  /* #32 — a genuine co-ord, so the cover shows the format under discussion. */
  hero: {
    productId: 32,
    imageIndex: 0,
    alt: 'An olive green embroidered cotton co-ord set, a matched top and trousers worn without a dupatta',
  },

  body: [
    {
      type: 'p',
      text: 'The terms are used loosely and often interchangeably, which makes them hard to shop. The practical distinction is not the cut — it is ==whether the pieces are designed to be worn together or to be split up==.',
    },

    {
      type: 'keyTakeaway',
      items: [
        '**Kurta set** — kurta, matching bottoms, usually a dupatta. Traditional register.',
        '**Co-ord set** — matched top and trousers, no dupatta. Contemporary register.',
        'Co-ord pieces **split up and wear separately**; a kurta rarely does.',
        'Buying one? Kurta set for family and festivals, co-ord for office and travel.',
      ],
    },

    { type: 'h2', text: 'What each usually means' },
    {
      type: 'p',
      text: 'A kurta set is a kurta with matching bottoms, and frequently a dupatta. The kurta is the piece that carries the outfit; the bottoms support it. Traditionally cut, and the default for festivals, temple visits and family functions.',
    },
    {
      type: 'p',
      text: 'A co-ord set is two pieces designed as a deliberate pair — usually a shorter top with matching wide-leg trousers, often in the same print. The look is contemporary rather than traditional, and there is usually no dupatta.',
    },

    { type: 'h2', text: 'How they differ in practice' },
    {
      type: 'ul',
      items: [
        'Formality — a kurta set with a dupatta reads more traditional and suits religious and family occasions. A co-ord reads modern and works better for office, travel and casual events.',
        'Splitting up — co-ord pieces are usually designed to work separately. A co-ord top goes with jeans; a kurta rarely does. This matters for cost per wear.',
        'Effort — a co-ord is a complete outfit with no styling decisions. A kurta set with a dupatta takes more managing but offers more variation.',
        'Sizing — a kurta set is more forgiving, since the kurta covers the waist. Co-ords sit closer and are less accommodating between sizes.',
      ],
    },

    {
      type: 'figure',
      productId: 8,
      imageIndex: 0,
      secondImageIndex: 2,
      width: 'wide',
      alt: 'A sage green textured co-ord set, top and matching trousers, worn as a single contemporary outfit',
      secondAlt:
        'The same co-ord set from another angle, showing how the two pieces read together',
      caption:
        'A co-ord reads as one deliberate outfit — and both halves still work on their own.',
    },

    { type: 'h2', text: 'Which to buy first' },
    {
      type: 'p',
      text: 'If you are buying one thing and attend family functions, festivals or temple regularly, buy the kurta set. It covers the widest range of occasions where ethnic wear is expected.',
    },
    {
      type: 'p',
      text: 'If you want ethnic wear for the office, for travel, or for occasions where a dupatta would be a nuisance, buy the co-ord. You will also get more separate wears out of it, which usually makes it the better value despite similar prices.',
    },
    {
      type: 'note',
      text: 'Count how many times a year you actually need a dupatta. If the answer is rarely, the co-ord will be worn more.',
    },

    {
      type: 'productInline',
      productId: 19,
      blurb: 'A kurta set for comparison — kurta, pant and dupatta, cut traditionally.',
    },

    { type: 'h2', text: 'Fabric matters more than the format' },
    {
      type: 'p',
      text: 'Whichever you choose, cotton makes the piece wearable in Indian heat and easy to launder — which is what decides whether something is worn twice a month or twice a year. **A cotton co-ord in an everyday print will out-wear a synthetic kurta set several times over.** More on that in our [cotton, crepe and rayon comparison](/guides/cotton-vs-crepe-vs-rayon-kurta-fabrics).',
    },

    {
      type: 'faq',
      items: [
        {
          q: 'Is a co-ord set appropriate for a wedding or temple visit?',
          a: 'For a temple visit or a traditional family function, a kurta set with a dupatta is the safer choice. Co-ords work well for sangeet, mehendi and receptions where a contemporary look is welcome.',
        },
        {
          q: 'Can I wear a co-ord top with jeans?',
          a: 'Usually yes — that is much of the appeal. Co-ord pieces are designed to stand alone in a way kurta sets are not.',
        },
        {
          q: 'Which is better value?',
          a: 'At similar prices the co-ord often wins on cost per wear, because both pieces get worn separately as well as together.',
        },
        {
          q: 'Which is more forgiving on sizing?',
          a: 'The kurta set. The kurta skims the waist, so it accommodates changes better. Co-ords sit closer and are less flexible between sizes.',
        },
      ],
    },

    {
      type: 'cta',
      text: 'Browse both and compare the cuts side by side.',
      href: '/shop/co-ord-sets',
      label: 'Shop co-ord sets',
    },
  ],
};
