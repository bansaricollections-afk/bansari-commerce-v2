/**
 * Turn a guide into an Instagram carousel.
 *
 * WHY GUIDES AND NOT MORE PRODUCT POSTS
 * A product carousel asks for money. A guide gives something away, and that
 * difference decides how Instagram treats it.
 *
 *  - SAVES are the strongest ranking signal available, and nobody saves a
 *    photo of a kurta they are not buying today. They do save "how to wash a
 *    cotton kurta without shrinking it", because it is useful later.
 *  - SHARES to a friend or a group behave the same way, and advice gets
 *    forwarded where a catalogue does not.
 *  - Reaching people who do not follow the account is the whole problem at
 *    138 followers. Useful content is what the ranking system shows to
 *    strangers.
 *
 * There is also a blunt practical reason right now: these slides are mostly
 * typography on the brand's own cream. Only the cover uses a photograph. The
 * account currently carries Instagram's "AI-generated profile" label because
 * the product imagery is AI-generated — guide carousels are the one thing that
 * can be posted today without adding to that.
 *
 * WHAT THIS DOES NOT DO
 * It invents nothing. Every slide is a `keyTakeaway` line already written into
 * the guide and already published on the site. If a guide has no takeaways it
 * produces no carousel rather than padding one out.
 */
import sharp from 'sharp';

import type { Guide } from '@/content/guides/types';

/** 4:5 — the tallest ratio Instagram accepts, so the slide fills most of a
 *  phone screen. Same reasoning as the product pipeline. */
const W = 1080;
const H = 1350;

const CREAM = '#FFFDF9';
const INK = '#1A0F16';
const GOLD = '#C9A96E';
const GOLD_DARK = '#9E7B47';
const MUTED = '#7A6872';

const SITE = 'https://www.bansaricollection.in';

/** Instagram's carousel ceiling. Cover + takeaways + closing must fit. */
const MAX_SLIDES = 10;

/**
 * Strip the guides' inline markup.
 *
 * Guide text carries `**bold**`, `==highlight==` and `[label](/href)`. On a
 * slide there is nothing to link to and no renderer to interpret it, so the
 * markers are removed rather than printed literally — a slide reading
 * "**Cold water, always.**" looks like a bug.
 */
function stripMarkup(text: string): string {
  return text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/==(.+?)==/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Greedy word wrap.
 *
 * SVG has no text flow — a `<text>` element runs off the canvas rather than
 * wrapping — so lines have to be measured here and emitted as separate
 * `<tspan>`s. `charsPerLine` is calibrated per font size rather than measured
 * precisely; a proportional font makes exact measurement impossible without
 * font metrics, and being slightly conservative costs nothing.
 */
function wrap(text: string, charsPerLine: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    if (!line) line = word;
    else if ((line + ' ' + word).length <= charsPerLine) line += ' ' + word;
    else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function tspans(lines: string[], x: number, startY: number, lineHeight: number): string {
  return lines
    .map(
      (l, i) =>
        `<tspan x="${x}" y="${startY + i * lineHeight}">${escapeXml(l)}</tspan>`
    )
    .join('');
}

/** Slide 1 — the guide's title over its hero product photograph. */
async function coverSlide(guide: Guide, heroUrl: string | null): Promise<Buffer> {
  const titleLines = wrap(guide.title, 22);
  const titleBlockHeight = titleLines.length * 76;
  const startY = H - 300 - titleBlockHeight + 76;

  const overlay = Buffer.from(
    `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="45%" stop-color="#1A0F16" stop-opacity="0"/>
          <stop offset="100%" stop-color="#1A0F16" stop-opacity="0.88"/>
        </linearGradient>
      </defs>
      <rect width="${W}" height="${H}" fill="url(#fade)"/>
      <rect x="80" y="${startY - 130}" width="56" height="2" fill="${GOLD}"/>
      <text x="80" y="${startY - 90}" font-family="Arial, Helvetica, sans-serif"
            font-size="26" letter-spacing="5" fill="${GOLD}">${escapeXml(
              guide.category.toUpperCase()
            )}</text>
      <text font-family="Georgia, 'Times New Roman', serif" font-size="66" fill="${CREAM}">
        ${tspans(titleLines, 80, startY, 76)}
      </text>
      <text x="80" y="${H - 90}" font-family="Arial, Helvetica, sans-serif" font-size="26"
            letter-spacing="3" fill="rgba(255,253,249,0.75)">SWIPE →</text>
    </svg>`
  );

  // A guide with a missing hero still produces a cover, on cream.
  const base = heroUrl
    ? await (async () => {
        const res = await fetch(heroUrl);
        if (!res.ok) throw new Error(`hero fetch ${res.status}`);
        return sharp(Buffer.from(await res.arrayBuffer())).resize(W, H, {
          fit: 'cover',
          position: 'top',
        });
      })().catch(() => sharp({ create: { width: W, height: H, channels: 3, background: INK } }))
    : sharp({ create: { width: W, height: H, channels: 3, background: INK } });

  return base
    .composite([{ input: overlay, top: 0, left: 0 }])
    .flatten({ background: CREAM })
    .toColorspace('srgb')
    .jpeg({ quality: 90, chromaSubsampling: '4:4:4', mozjpeg: true })
    .toBuffer();
}

/** One takeaway, set large on cream. */
async function takeawaySlide(text: string, n: number, total: number): Promise<Buffer> {
  const clean = stripMarkup(text);
  // Longer lines get a smaller size so a wordy takeaway still fits the slide
  // rather than being truncated.
  const size = clean.length > 150 ? 46 : clean.length > 90 ? 54 : 62;
  const perLine = Math.floor(1180 / size);
  const lines = wrap(clean, perLine);
  const lineHeight = Math.round(size * 1.42);
  const startY = Math.round(H / 2 - (lines.length * lineHeight) / 2 + size / 2);

  const svg = Buffer.from(
    `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${W}" height="${H}" fill="${CREAM}"/>
      <rect x="80" y="130" width="56" height="2" fill="${GOLD}"/>
      <text x="80" y="176" font-family="Arial, Helvetica, sans-serif" font-size="24"
            letter-spacing="4" fill="${GOLD_DARK}">${n} / ${total}</text>
      <text font-family="Georgia, 'Times New Roman', serif" font-size="${size}" fill="${INK}">
        ${tspans(lines, 80, startY, lineHeight)}
      </text>
      <text x="80" y="${H - 90}" font-family="Arial, Helvetica, sans-serif" font-size="24"
            letter-spacing="3" fill="${MUTED}">BANSARICOLLECTION.IN</text>
    </svg>`
  );

  return sharp(svg).jpeg({ quality: 92, chromaSubsampling: '4:4:4', mozjpeg: true }).toBuffer();
}

/** Closing slide — where to read the rest. */
async function closingSlide(guide: Guide): Promise<Buffer> {
  const lines = wrap(guide.title, 20);
  const svg = Buffer.from(
    `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${W}" height="${H}" fill="${INK}"/>
      <rect x="80" y="430" width="56" height="2" fill="${GOLD}"/>
      <text x="80" y="480" font-family="Arial, Helvetica, sans-serif" font-size="26"
            letter-spacing="5" fill="${GOLD}">THE FULL GUIDE</text>
      <text font-family="Georgia, 'Times New Roman', serif" font-size="60" fill="${CREAM}">
        ${tspans(lines, 80, 570, 72)}
      </text>
      <text x="80" y="${570 + lines.length * 72 + 70}" font-family="Arial, Helvetica, sans-serif"
            font-size="30" letter-spacing="2" fill="rgba(255,253,249,0.8)">
        bansaricollection.in/guides
      </text>
      <text x="80" y="${H - 90}" font-family="Arial, Helvetica, sans-serif" font-size="26"
            letter-spacing="3" fill="${GOLD}">LINK IN BIO</text>
    </svg>`
  );
  return sharp(svg).jpeg({ quality: 92, chromaSubsampling: '4:4:4', mozjpeg: true }).toBuffer();
}

export type GuideCarousel = {
  slides: Buffer[];
  caption: string;
  hashtags: string[];
  guideUrl: string;
};

/** Guide category → a specific, earnable hashtag. */
const CATEGORY_TAG: Record<Guide['category'], string> = {
  'Fabric & Care': 'fabriccare',
  Occasion: 'festivedressing',
  'Fit & Size': 'sizeguide',
  'Buying Guide': 'ethnicwearguide',
};

const LOCAL_TAGS = ['vadodarafashion', 'gujaratfashion', 'vadodaraboutique'];

export async function buildGuideCarousel(
  guide: Guide,
  heroUrl: string | null
): Promise<GuideCarousel> {
  const takeaways = guide.body.find(
    (b): b is { type: 'keyTakeaway'; items: string[] } => b.type === 'keyTakeaway'
  );

  if (!takeaways || takeaways.items.length === 0) {
    throw new Error(`Guide "${guide.slug}" has no key takeaways to build slides from`);
  }

  // Cover + closing take two of the ten.
  const items = takeaways.items.slice(0, MAX_SLIDES - 2);

  const slides: Buffer[] = [await coverSlide(guide, heroUrl)];
  for (const [i, item] of items.entries()) {
    slides.push(await takeawaySlide(item, i + 1, items.length));
  }
  slides.push(await closingSlide(guide));

  const guideUrl =
    `${SITE}/guides/${guide.slug}` +
    `?utm_source=instagram&utm_medium=social&utm_campaign=guide_carousel`;

  /*
   * The caption repeats the takeaways as text.
   *
   * Deliberate duplication: Instagram indexes caption words for search and
   * cannot read the text baked into an image. A carousel whose content exists
   * only as pixels is invisible to search, so the words appear in both places.
   */
  const lines = [
    guide.title,
    '',
    stripMarkup(guide.excerpt),
    '',
    ...items.map((t) => `• ${stripMarkup(t)}`),
    '',
    // Caption links are never tappable on Instagram; the bio link is.
    'Read the full guide — link in our bio.',
  ];

  const hashtags = [
    CATEGORY_TAG[guide.category],
    'cottonkurta',
    LOCAL_TAGS[guide.slug.length % LOCAL_TAGS.length]!,
    'bansaricollections',
  ];

  return {
    slides,
    caption: `${lines.join('\n')}\n\n${hashtags.map((t) => `#${t}`).join(' ')}`,
    hashtags,
    guideUrl,
  };
}
