import type { Metadata } from 'next';

import InstagramComposer from '@/components/admin/instagram/InstagramComposer';
import {
  getInstagramStatus,
  getRecentInstagramPosts,
  getUnpostedProducts,
} from '@/services/instagram.service';

/**
 * /admin/instagram — compose and publish a product post.
 *
 * WHY DRAFT-THEN-APPROVE RATHER THAN ONE BUTTON
 * A caption is public, permanent and attached to the brand. Everything
 * expensive and fallible — fetching photos, padding them to Instagram's
 * shape, uploading, assembling the caption — happens in Preview, where the
 * result can still be rejected. Publish then does only the irreversible part.
 *
 * The work queue is "products never successfully posted", derived from the
 * instagram_posts table rather than a flag on the product. A product can be
 * posted more than once legitimately; what the merchant needs surfaced is the
 * one that has never been posted at all.
 */

export const metadata: Metadata = {
  title: 'Instagram | Bansari Commerce Pro',
  description: 'Compose and publish product posts to Instagram.',
};

export const dynamic = 'force-dynamic';

export default async function InstagramPage() {
  /*
   * Status is fetched here and never throws: getInstagramStatus treats an
   * absent or expired token as "not connected" rather than an error, so the
   * page renders and explains itself before credentials exist.
   */
  const [status, products, recent] = await Promise.all([
    getInstagramStatus(),
    getUnpostedProducts(),
    getRecentInstagramPosts(10),
  ]);

  return (
    <InstagramComposer
      status={status}
      products={products.map((p) => ({
        id: p.id,
        name: p.name,
        price: p.price,
        imageCount: (p.images ?? []).length,
        thumb:
          (p.images ?? [])
            .map((img) => (typeof img === 'string' ? img : img?.url))
            .find((u): u is string => typeof u === 'string') ?? null,
      }))}
      recent={recent.map((r) => ({
        id: r.id as number,
        productId: (r.product_id as number | null) ?? null,
        status: r.status as string,
        permalink: (r.permalink as string | null) ?? null,
        caption: (r.caption as string) ?? '',
        error: (r.error as string | null) ?? null,
        publishedAt: (r.published_at as string | null) ?? null,
        createdAt: r.created_at as string,
      }))}
    />
  );
}
