import type { Guide } from './types';

export const guide: Guide = {
  slug: 'diwali-ethnic-wear-cotton-co-ord-sets',
  title: 'Diwali Ethnic Wear: Cotton Co-Ord Sets and Kurta Sets',
  description:
    'Diwali runs across several days and several kinds of gathering. How to dress for cleaning day, Lakshmi puja and the visiting that follows.',
  publishedAt: '2026-09-03',
  updatedAt: '2026-09-03',
  category: 'Occasion',
  excerpt:
    'Diwali is not one occasion. Dressing for it well means planning for four different days.',

  /* #35 — maroon cotton with an embroidered jacket: puja-appropriate. */
  hero: {
    productId: 35,
    imageIndex: 0,
    alt: 'A maroon pure cotton kurta set with an embroidered jacket, dressed formally enough for Lakshmi puja',
  },

  body: [
    {
      type: 'p',
      text: 'Diwali is treated as a single event and dressed for as one, which is why so many people end up ==over-dressed on the wrong day and under-dressed on the right one==. In practice it runs across several days, each with a different demand.',
    },

    {
      type: 'keyTakeaway',
      items: [
        '**Only Lakshmi puja** genuinely calls for your most formal outfit.',
        'Cleaning and cooking days: **comfortable cotton you do not mind splashing**.',
        'Visiting days: **co-ord sets** — nothing to manage while carrying sweets and removing shoes.',
        'One formal kurta set plus two easier sets covers the whole festival.',
      ],
    },

    { type: 'h2', text: 'The days, and what each needs' },
    {
      type: 'ul',
      items: [
        'Dhanteras and the days of cleaning and cooking — you are working. Comfortable cotton, nothing you mind splashing.',
        'Lakshmi puja — the formal centre of the festival. This is where a proper kurta set with a dupatta belongs.',
        'Visiting and being visited — a long run of hours, often several homes. Comfort matters more than impact.',
        'Padwa and Bhai Dooj — family functions, moderately dressed.',
      ],
    },
    {
      type: 'p',
      text: 'Only one of those days genuinely calls for your most formal outfit. The rest reward something you can move, cook and sit in.',
    },

    { type: 'h2', text: 'Why cotton, even in October' },
    {
      type: 'p',
      text: '**October in Gujarat is not cold.** Between kitchen heat, diyas and crowded rooms, synthetic festive wear becomes uncomfortable quickly. Cotton with good embroidery or a rich print reads festive while staying wearable through a long evening.',
    },

    {
      type: 'figure',
      productId: 41,
      imageIndex: 0,
      secondImageIndex: 3,
      width: 'wide',
      alt: 'A black and gold muslin kurta set with palazzo and dupatta, dressed up for a festive evening',
      secondAlt: 'The same black and gold set from another angle, showing the dupatta and palazzo',
      caption: 'Black and gold for the puja — festive weight without the thermal penalty of a synthetic.',
    },
    {
      type: 'p',
      text: 'The exception is the puja itself, where a heavier fabric is worn briefly and comfort matters less.',
    },

    { type: 'h2', text: 'Co-ord sets for the visiting days' },
    {
      type: 'p',
      text: 'A co-ord set is well suited to the days of visiting: it looks deliberately put together, requires no styling, and has no dupatta to manage while carrying sweets, removing shoes and greeting people. In a festive print it reads appropriately dressed without becoming a project.',
    },
    {
      type: 'note',
      text: 'You will take your shoes on and off a dozen times. Plan the footwear before the outfit.',
    },

    {
      type: 'productInline',
      productId: 32,
      blurb: 'An olive cotton co-ord — put together in one move, on the days you have none to spare.',
    },

    { type: 'h2', text: 'A practical Diwali wardrobe' },
    {
      type: 'p',
      text: 'One good kurta set with a dupatta for the puja. Two cotton co-ord sets or simpler kurta sets for the other days. That covers the festival, and ==every piece stays in rotation afterwards== rather than being packed away for a year.',
    },

    {
      type: 'faq',
      items: [
        {
          q: 'What should I wear for Lakshmi puja?',
          a: 'This is the one day that genuinely warrants your most formal outfit — a proper kurta set with a dupatta, or something with heavier embroidery. It is worn for a shorter stretch, so comfort matters less.',
        },
        {
          q: 'Is a co-ord set appropriate for Diwali?',
          a: 'For the visiting days, very much so. It reads as deliberately dressed, needs no styling, and has no dupatta to manage while carrying sweets and removing shoes.',
        },
        {
          q: 'Is cotton too plain for Diwali?',
          a: 'Not with embroidery, mirror work or a rich print. What reads as unfestive is plain fabric, not cotton itself — and cotton stays wearable through a long, warm evening.',
        },
        {
          q: 'How many outfits do I need?',
          a: 'Three is realistic: one formal set for the puja, and two easier sets for the cleaning, cooking and visiting days.',
        },
      ],
    },

    {
      type: 'cta',
      text: 'Our festive pieces are cotton-led and cut for long evenings.',
      href: '/collections/festive-edit',
      label: 'Shop the Festive Edit',
    },
  ],
};
