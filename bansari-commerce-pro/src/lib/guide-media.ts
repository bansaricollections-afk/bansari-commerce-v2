import { cache } from 'react';

import { getProductById } from '@/services/product.service';
import type { Guide } from '@/content/guides';

/**
 * Resolves the real products a guide references, so `figure` and
 * `productInline` blocks can render live photography, names and prices.
 *
 * WHY IT WORKS THIS WAY
 * Guide files store only a `productId`. Nothing about the product — not its
 * image URL, not its name, and emphatically not its price — is copied into
 * guide copy, because a hardcoded price goes stale silently and a hardcoded
 * image URL breaks the moment the photo is replaced. Everything is read live
 * and cached per request.
 *
 * A referenced product that has been deleted or deactivated resolves to
 * `undefined`, and the renderer omits that block entirely rather than showing
 * a broken image or a placeholder. An article that quietly loses one photo is
 * a much better outcome than one that shows a dead frame.
 */

export type GuideMedia = {
  id: number;
  name: string;
  price: number;
  href: string;
  /** Resolved image URLs, in the product's own order. */
  images: string[];
};

/** Every product id a guide references, hero included, de-duplicated. */
function referencedIds(guide: Guide): number[] {
  const ids = new Set<number>();
  if (guide.hero) ids.add(guide.hero.productId);
  for (const block of guide.body) {
    if (block.type === 'figure' || block.type === 'productInline') {
      ids.add(block.productId);
    }
  }
  return [...ids];
}

export const getGuideMedia = cache(
  async (guide: Guide): Promise<Map<number, GuideMedia>> => {
    const ids = referencedIds(guide);
    if (ids.length === 0) return new Map();

    const products = await Promise.all(
      ids.map((id) => getProductById(id).catch(() => null))
    );

    const map = new Map<number, GuideMedia>();
    for (const p of products) {
      if (!p) continue;

      const images = (p.images ?? [])
        .map((img) => (typeof img === 'string' ? img : img?.url))
        .filter((url): url is string => typeof url === 'string' && url.length > 0);

      if (images.length === 0) continue;

      map.set(p.id, {
        id: p.id,
        name: p.name,
        price: p.price,
        href: `/product/${p.id}`,
        images,
      });
    }
    return map;
  }
);

/** Picks an image by index, falling back to the first. */
export function imageAt(media: GuideMedia, index = 0): string {
  return media.images[index] ?? media.images[0];
}
