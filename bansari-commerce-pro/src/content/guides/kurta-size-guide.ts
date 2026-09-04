import type { Guide } from './types';

export const guide: Guide = {
  slug: 'kurta-size-guide-how-to-measure',
  title: 'Kurta Size Guide: How to Measure and Choose Correctly',
  description:
    'Indian sizing is not standardised. How to take the three measurements that matter, read a size chart properly, and decide when to size up.',
  publishedAt: '2026-09-03',
  updatedAt: '2026-09-03',
  category: 'Fit & Size',
  excerpt:
    'The letter on the tag means little. Three measurements and one rule decide whether a kurta fits.',

  hero: {
    productId: 37,
    imageIndex: 0,
    alt: 'A sage green pure cotton kurta set with a yoke design, shown full length so the hem and sleeve length are visible',
  },

  body: [
    {
      type: 'p',
      text: 'There is no national standard for Indian ethnic wear sizing. An L from one label can differ from an L elsewhere by a full size, and the same label may size a kurta and a co-ord set differently. ==This is why buying by letter alone produces so many returns.==',
    },

    {
      type: 'keyTakeaway',
      items: [
        'Take **three measurements**: bust, waist, hip — plus shoulder-to-hem length.',
        'Check whether the chart describes **your body or the garment**. They differ by inches.',
        '**Size to your largest measurement**, then have the rest taken in.',
        'Between sizes? **Always take the larger.** Ethnic wear takes in easily and lets out badly.',
      ],
    },

    { type: 'h2', text: 'The three measurements' },
    {
      type: 'p',
      text: 'Take these over your underwear, not over clothes, with the tape level and snug but not pulled tight.',
    },
    {
      type: 'ol',
      items: [
        'Bust — around the fullest part, tape level across the back.',
        'Waist — the narrowest point of the torso, usually just above the navel.',
        'Hip — the fullest part, standing with your feet together.',
      ],
    },
    {
      type: 'p',
      text: 'For kurta length, measure from the top of your shoulder straight down to where you want the hem to fall. This is the measurement most people skip and most often regret.',
    },

    { type: 'h2', text: 'Reading the chart' },
    {
      type: 'p',
      text: 'The critical question on any size chart is whether the numbers describe your body or the garment. A chart listing "Bust 42" might mean it fits a 42-inch bust, or that the garment itself measures 42 inches around — which would fit roughly a 38–40 inch bust once ease is accounted for.',
    },
    {
      type: 'p',
      text: 'If the listing does not say, assume it is body measurement, and check the return policy before ordering.',
    },
    {
      type: 'note',
      text: 'Size to your largest measurement. A kurta that fits the bust but pulls across the hip reads as too small.',
    },

    {
      type: 'figure',
      productId: 36,
      imageIndex: 0,
      secondImageIndex: 2,
      width: 'wide',
      alt: 'A lavender cotton embroidered kurta set shown full length, where hem length and sleeve length can be judged',
      secondAlt:
        'The same lavender set from another angle, showing how the kurta falls through the hip',
      caption:
        'Judge length from a full-length photograph, not from the size letter — this is the measurement most people skip.',
    },

    { type: 'h2', text: 'When to size up' },
    {
      type: 'ul',
      items: [
        'You are between two sizes — always take the larger.',
        'The fabric is a stiff cotton or has no stretch.',
        'You want to wear it through a summer, when a closer fit becomes uncomfortable.',
        'The style is straight-cut rather than A-line, which is less forgiving through the hip.',
      ],
    },
    {
      type: 'p',
      text: 'Sizing down is rarely worth it. Ethnic wear is straightforward to take in and difficult to let out — most kurtas have minimal seam allowance.',
    },

    { type: 'h2', text: 'The alteration most worth making' },
    {
      type: 'p',
      text: 'Buy for the largest measurement and have the waist taken in. A local tailor will do it for a small fraction of the garment price, and the result fits better than any standard size would. **Shortening palazzos to your actual height** is the second adjustment worth making almost every time.',
    },

    {
      type: 'faq',
      items: [
        {
          q: 'Should I size up or down if I am between sizes?',
          a: 'Up, almost always. A kurta can be taken in at the waist cheaply; letting one out is limited by the seam allowance, which on most kurtas is minimal.',
        },
        {
          q: 'Does the size chart describe my body or the garment?',
          a: 'It varies by listing, and the difference is several inches. If it is not stated, assume it is a body measurement and check the return policy before ordering.',
        },
        {
          q: 'Which measurement matters most?',
          a: 'Whichever is largest on you. Size to that one and alter the rest. A kurta that fits the bust but pulls at the hip reads as too small.',
        },
        {
          q: 'Do cotton kurtas shrink enough to affect sizing?',
          a: 'A little on the first wash, which matters if you have sized tightly. Washing cold and line drying prevents most of it — see our [washing guide](/guides/wash-cotton-kurta-without-shrinking).',
        },
      ],
    },

    {
      /*
       * Size claim is deliberately specific and matches stock: XXL appears on
       * 30 of 42 active products, 3XL on 14, 4XL on 4. An earlier version said
       * "selected pieces to 5XL" — exactly one product carries 5XL, so the
       * plural was not true.
       */
      type: 'cta',
      text: 'Most of our kurta sets run to XXL, many to 3XL, and a few to 4XL.',
      href: '/shop/kurta-sets',
      label: 'Shop kurta sets',
    },
  ],
};
