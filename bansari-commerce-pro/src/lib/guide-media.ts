import { cache } from 'react';

import { getProductById } from '@/services/product.service';
import type { Guide, GuideBlock } from '@/content/guides';

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

/**
 * Answers every `productFeed` block in a guide against the live catalogue.
 *
 * Keyed by the block's index rather than by product id, because a feed is a
 * list and two feeds in one article can legitimately overlap.
 *
 * WHY FEEDS ARE RESOLVED HERE AND NOT IN THE RENDERER
 * GuideBody maps over blocks synchronously and is shared by the page and its
 * metadata. Fetching inside it would either force it async or fire a query per
 * block. Resolving up front keeps the renderer a pure function of its props
 * and keeps the number of queries equal to the number of feed blocks — which
 * is one or two.
 *
 * A failing filter yields an empty list, never an exception. A guide must
 * still render if the catalogue is briefly unreachable; losing a product grid
 * is survivable, a 500 on an indexed article is not.
 */
export const getGuideFeeds = cache(
  async (guide: Guide): Promise<Map<number, GuideMedia[]>> => {
    const feeds = new Map<number, GuideMedia[]>();

    const blocks = guide.body
      .map((block, index) => ({ block, index }))
      .filter(
        (entry): entry is { block: Extract<GuideBlock, { type: 'productFeed' }>; index: number } =>
          entry.block.type === 'productFeed'
      );

    if (blocks.length === 0) return feeds;

    const { getFilteredProducts } = await import('@/services/product.service');

    await Promise.all(
      blocks.map(async ({ block, index }) => {
        try {
          const { products } = await getFilteredProducts({
            ...block.filter,
            perPage: block.limit ?? 4,
            sort: 'newest',
            inStock: true,
          });

          const mapped = products
            .map((p) => {
              const images = (p.images ?? [])
                .map((img) => (typeof img === 'string' ? img : img?.url))
                .filter((url): url is string => typeof url === 'string' && url.length > 0);
              if (images.length === 0) return null;
              return { id: p.id, name: p.name, price: p.price, href: `/product/${p.id}`, images };
            })
            .filter((m): m is GuideMedia => m !== null);

          // Below the threshold the block renders nothing at all, so an empty
          // list is stored rather than a short one.
          feeds.set(index, mapped.length >= (block.minProducts ?? 3) ? mapped : []);
        } catch {
          feeds.set(index, []);
        }
      })
    );

    return feeds;
  }
);
