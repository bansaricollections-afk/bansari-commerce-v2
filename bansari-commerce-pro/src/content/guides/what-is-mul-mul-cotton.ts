import type { Guide } from './types';

export const guide: Guide = {
  slug: 'what-is-mul-mul-cotton',
  title: 'What Is Mul Mul Cotton?',
  description:
    'Mul mul is one of the lightest cotton weaves made in India. What it is, how it differs from regular cotton, and how to care for something that fine.',
  publishedAt: '2026-09-03',
  updatedAt: '2026-09-03',
  category: 'Fabric & Care',
  excerpt:
    'One of the lightest cottons woven in India — and one of the easiest to ruin in a washing machine.',

  /* Product #3 is the catalogue's only Pure Mul Mul Cotton piece. */
  hero: {
    productId: 3,
    imageIndex: 0,
    alt: 'A pure mul mul cotton anarkali kurta set with pants and dupatta, showing the soft drape typical of a fine cotton weave',
  },

  body: [
    {
      type: 'p',
      text: 'If you have ever pulled a kurta out of the wardrobe on a 42-degree afternoon and put it straight back because the thought of wearing it made you warmer, you already understand the problem mul mul solves.',
    },
    {
      type: 'p',
      text: 'Mul mul — also written malmal, and known historically in English as muslin — is a plain-weave cotton distinguished by how fine it is. It is ==among the lightest cotton fabrics woven in India==, and it has been made on the subcontinent for centuries.',
    },

    {
      type: 'keyTakeaway',
      items: [
        'Not a special fibre — **ordinary cotton, spun very fine and woven loosely**.',
        'Soft from the first wear, unlike regular cotton which needs several washes.',
        'Often semi-sheer, so check opacity before you buy.',
        'Fragile: **hand wash cold, never wring**.',
      ],
    },

    { type: 'h2', text: 'What makes it different' },
    {
      type: 'p',
      text: 'Mul mul is defined by thread count and yarn fineness rather than by any special fibre. It is ordinary cotton spun very fine and woven loosely, which produces a fabric that is **soft immediately** — most cotton needs several washes to lose its stiffness, and mul mul does not.',
    },
    {
      type: 'ul',
      items: [
        'Extremely light, often semi-sheer when held to the light.',
        'Very breathable, with an open weave that moves air readily.',
        'Soft from the first wear, and softer with each wash.',
        'Drapes closely rather than holding a shape.',
      ],
    },

    { type: 'h2', text: 'Where it works, and where it does not' },
    {
      type: 'p',
      text: 'Mul mul is at its best in peak summer heat and for anything worn close to the skin. It is a common choice for summer kurtas, dupattas and everyday wear in hot, dry weather — which describes most of the year in [Gujarat](/guides/cotton-vs-linen-gujarat-summers).',
    },
    {
      type: 'p',
      text: 'It is a poor choice where structure is needed. It will not hold a sharp silhouette, it does not carry heavy embroidery well, and being semi-sheer, kurtas made from it are often worn with a lining or slip.',
    },
    {
      type: 'figure',
      productId: 3,
      imageIndex: 2,
      secondImageIndex: 5,
      width: 'wide',
      alt: 'A mul mul cotton anarkali seen full length, the fabric falling in soft folds rather than holding a stiff shape',
      secondAlt:
        'The same mul mul kurta from a second angle, showing how the light passes through the fine weave',
      caption:
        'Fine yarn, loosely woven — the drape follows the body rather than holding a shape of its own.',
    },
    {
      type: 'note',
      text: 'Hold the fabric up to light. What you see is what others will.',
    },

    {
      type: 'productInline',
      productId: 3,
      blurb: 'Pure mul mul cotton, cut as an anarkali with pants and dupatta.',
    },

    { type: 'h2', text: 'Caring for it' },
    {
      type: 'p',
      text: 'The fineness that makes mul mul comfortable also makes it fragile. It snags, tears more easily than heavier cotton, and ==does not tolerate rough handling==. Treat it like something that will last ten years and it will.',
    },
    {
      type: 'ol',
      items: [
        '**Hand wash in cold water** where possible. If machine washing, use a mesh bag on the most delicate cycle.',
        '**Do not wring.** Press water out between your palms or roll in a towel.',
        'Line dry in shade — the loose weave distorts under weight, so dry flat or on a wide hanger.',
        'Iron on low while slightly damp. High heat will scorch a fabric this fine.',
      ],
    },
    {
      type: 'p',
      text: 'There is more detail on this in our guide to [washing cotton without shrinking it](/guides/wash-cotton-kurta-without-shrinking).',
    },

    { type: 'h2', text: 'Is it worth the price?' },
    {
      type: 'p',
      text: 'Mul mul usually costs more than standard cotton because finer yarn and looser weaving are slower to produce. Whether that is worth it depends on use: for a summer kurta worn weekly in genuine heat, it is among the most comfortable fabrics available. For a piece worn a few times a year, standard cotton will serve as well and survive rougher treatment.',
    },

    {
      type: 'faq',
      items: [
        {
          q: 'Is mul mul the same as muslin?',
          a: 'Yes. Muslin is the English word for the same fabric — the name is thought to come from Mosul, through which the cloth was traded into Europe. In India it is more often called mul mul or malmal.',
        },
        {
          q: 'Does mul mul shrink?',
          a: 'It can, like any cotton, particularly on a first hot wash. Washing cold and drying in shade avoids most of it.',
        },
        {
          q: 'Is mul mul see-through?',
          a: 'Often slightly, yes — that is a consequence of the open weave. Many mul mul kurtas are lined for this reason. Hold the fabric to the light before buying.',
        },
        {
          q: 'Can I wear mul mul in winter?',
          a: 'It is a poor insulator on its own, but it layers well under a jacket or shrug. Its real strength is heat.',
        },
      ],
    },

    {
      type: 'cta',
      text: 'See our cotton range, including finer weaves.',
      href: '/shop/cotton',
      label: 'Browse cotton ethnic wear',
    },
  ],
};
