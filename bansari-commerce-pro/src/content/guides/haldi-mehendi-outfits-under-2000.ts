import type { Guide } from './types';

export const guide: Guide = {
  slug: 'haldi-mehendi-outfit-ideas-under-2000',
  title: 'Haldi and Mehendi Outfit Ideas Under ₹2,000',
  description:
    'Haldi ruins clothes and mehendi keeps you seated for hours. What to wear to both without spending a fortune on something you will stain.',
  publishedAt: '2026-09-03',
  updatedAt: '2026-09-03',
  category: 'Occasion',
  excerpt:
    'One function will stain your clothes, the other keeps you seated for hours. Dress for both accordingly.',

  /* #17 — mustard cotton at ₹1,499: the exact brief, and under the headline price. */
  hero: {
    productId: 17,
    imageIndex: 0,
    alt: 'A mustard yellow hand block printed cotton kurta set, the traditional colour for a haldi function',
  },

  body: [
    {
      type: 'p',
      text: 'Haldi and mehendi are the two wedding functions where the practical constraints are strongest and most often ignored. One involves turmeric being applied to a person at close range. The other involves sitting still for two hours with wet henna on your hands. ==Neither rewards an expensive outfit.==',
    },

    {
      type: 'keyTakeaway',
      items: [
        'Haldi: **assume it will stain.** Yellow, mustard and cream hide turmeric; navy does not.',
        '**Skip heavy embroidery for haldi** — turmeric lodges in raised thread and stays.',
        'Mehendi: **nothing that needs adjusting.** Your hands will be out of action for hours.',
        'One set you can afford to lose, one that re-enters your wardrobe afterwards.',
      ],
    },

    { type: 'h2', text: 'Haldi: assume it will stain' },
    {
      type: 'p',
      text: 'Turmeric stains permanently on most fabrics. Plan for the outfit to be marked, and choose accordingly — this is the single function where buying something inexpensive is the sophisticated choice, not the cheap one.',
    },
    {
      type: 'ul',
      items: [
        'Yellow, mustard, cream and off-white are traditional and hide turmeric best. A stain on yellow is invisible; the same stain on navy is permanent and obvious.',
        'Cotton over synthetic — it takes a stain, but it also releases more of it in the wash.',
        'Avoid heavy embroidery and mirror work. Turmeric lodges in raised thread and will not come out.',
        'Short or three-quarter sleeves. Full sleeves get dragged through everything.',
      ],
    },
    {
      type: 'note',
      text: 'Rinse cold, immediately. Hot water sets turmeric permanently.',
    },

    {
      type: 'productInline',
      productId: 17,
      blurb: 'Mustard hand block cotton — traditional for haldi, and cheap enough to risk.',
    },

    { type: 'h2', text: 'Mehendi: dress for sitting still' },
    {
      type: 'p',
      text: 'Mehendi is the opposite problem. Nothing will stain, but you will be seated for a long stretch with your hands immobilised, unable to adjust anything.',
    },
    {
      type: 'ul',
      items: [
        'Nothing that needs adjusting. If a dupatta requires constant repositioning, you will not be able to do it.',
        'Sleeves that push above the elbow and stay there.',
        'A comfortable waist. You will be sitting, often cross-legged, for hours.',
        'Green, teal and deep pink photograph well against henna and are traditional for the function.',
      ],
    },

    {
      type: 'figure',
      productId: 18,
      imageIndex: 0,
      secondImageIndex: 3,
      width: 'wide',
      alt: 'An olive green pure cotton kurta and pant set, a traditional colour choice for a mehendi function',
      secondAlt: 'The same olive green set from another angle, showing the sleeve and fit',
      caption:
        'Green for mehendi, cotton for the hours of sitting — and sleeves that push above the elbow and stay there.',
    },

    { type: 'h2', text: 'What to buy for both, under ₹2,000' },
    {
      type: 'p',
      text: 'A cotton kurta set with palazzos covers both functions and stays useful afterwards. The palazzo matters — it is comfortable to sit in, forgiving through a long function, and does not need managing the way a lehenga skirt does.',
    },
    {
      type: 'p',
      text: 'Buy one set for haldi that you are **genuinely willing to lose**, and one slightly better set for mehendi that will re-enter your normal wardrobe afterwards. That is a realistic budget for both functions and leaves the money where it belongs — the ceremony itself.',
    },

    {
      type: 'faq',
      items: [
        {
          q: 'Does turmeric ever come out completely?',
          a: 'Sometimes, from cotton, if you rinse cold immediately and never let hot water near it. Sunlight fades what remains. Plan for a mark and be pleased if there is none.',
        },
        {
          q: 'Do I have to wear yellow to a haldi?',
          a: 'It is traditional and it is practical, because turmeric is invisible on it. Cream and off-white work for the same reason. Dark colours are the ones to avoid.',
        },
        {
          q: 'What should I avoid wearing to a mehendi?',
          a: 'Anything that needs adjusting — a slippery dupatta, a tight waist, sleeves that fall down. Your hands will be unusable for a couple of hours.',
        },
        {
          q: 'Can one outfit cover both functions?',
          a: 'It can, but it is a false economy. Whatever you wear to haldi may be marked afterwards, and you will not want to wear it to a second function.',
        },
      ],
    },

    {
      type: 'cta',
      text: 'Most of our cotton kurta sets sit under ₹2,000.',
      href: '/shop/cotton-kurta-sets',
      label: 'Shop cotton kurta sets',
    },
  ],
};
