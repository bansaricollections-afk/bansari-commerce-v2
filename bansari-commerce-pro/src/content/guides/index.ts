/**
 * Guide registry.
 *
 * Adding a guide means creating its file and adding it here — the route,
 * the index page and the sitemap all read from this one array, so there is no
 * second place to forget.
 *
 * Ordered newest-intent-first rather than by date: every guide currently shares
 * a publish date, and this order reflects which we most want read.
 */
import type { Guide } from './types';

import { guide as navratri } from './navratri-cotton-kurta-sets';
import { guide as plusSize } from './plus-size-cotton-kurta-sets';
import { guide as cottonVsLinen } from './cotton-vs-linen-gujarat-summers';
import { guide as washing } from './wash-cotton-kurta-without-shrinking';
import { guide as sizeGuide } from './kurta-size-guide';
import { guide as haldiMehendi } from './haldi-mehendi-outfits-under-2000';
import { guide as kurtaVsCoord } from './kurta-set-vs-co-ord-set';
import { guide as mulMul } from './what-is-mul-mul-cotton';
import { guide as officeWear } from './office-ethnic-wear-indian-summers';
import { guide as diwali } from './diwali-cotton-co-ord-sets';
import { guide as fabricsCompared } from './cotton-crepe-rayon-compared';

export const guides: Guide[] = [
  navratri,
  plusSize,
  cottonVsLinen,
  washing,
  sizeGuide,
  haldiMehendi,
  kurtaVsCoord,
  mulMul,
  officeWear,
  diwali,
  fabricsCompared,
];

export function getGuide(slug: string): Guide | undefined {
  return guides.find((g) => g.slug === slug);
}

export type { Guide, GuideBlock } from './types';
