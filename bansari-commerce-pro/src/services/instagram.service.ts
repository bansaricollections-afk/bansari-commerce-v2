/**
 * Instagram publishing — orchestration.
 *
 * Owns the sequence (prepare images → containers → publish → record) and,
 * more importantly, owns what happens when a step fails partway. Instagram
 * publishing is not transactional: once media_publish returns, the post is
 * public and nothing here can take it back. So the ordering below is chosen
 * so that the irreversible step happens last and happens once.
 */
import {
  createCarouselContainer,
  createImageContainer,
  getInstagramCredentials,
  getPermalink,
  getPublishingLimit,
  publishContainer,
  waitForContainer,
  type InstagramCredentials,
} from '@/lib/instagram/client';
import { buildCaption, type GeneratedCaption } from '@/lib/instagram/caption';
import { prepareForInstagram, type PreparedImage } from '@/lib/instagram/image';
import { createServiceRoleClient } from '@/lib/supabase/service';
import { getAttributeIndex } from '@/services/product-attributes';
import { getProductById } from '@/services/product.service';
import type { Product } from '@/types/product';

/** Instagram's carousel ceiling. Products carry 6–8 images, so this bites. */
const MAX_CAROUSEL = 10;

export type InstagramPreview = {
  product: Product;
  images: PreparedImage[];
  /** Images that could not be prepared, with the reason. Shown rather than
   *  silently dropped — a carousel quietly missing two photos is a defect the
   *  merchant should see before publishing, not after. */
  skipped: { url: string; reason: string }[];
} & GeneratedCaption;

function imageUrls(product: Product): string[] {
  return (product.images ?? [])
    .map((img) => (typeof img === 'string' ? img : img?.url))
    .filter((u): u is string => typeof u === 'string' && u.length > 0)
    .slice(0, MAX_CAROUSEL);
}

/**
 * Build everything that would be published, without publishing any of it.
 *
 * This is the whole reason the flow is draft-then-approve. Every expensive and
 * fallible step — fetching, padding, uploading, caption assembly — happens
 * here, where the result can still be rejected. By the time Publish is
 * pressed, the only thing left is Instagram's own API.
 */
export async function buildInstagramPreview(productId: number): Promise<InstagramPreview> {
  const product = await getProductById(productId);
  if (!product) throw new Error(`Product ${productId} not found`);

  const index = await getAttributeIndex();
  const generated = buildCaption(product, index);

  const sources = imageUrls(product);
  if (sources.length === 0) throw new Error('This product has no images to post');

  const images: PreparedImage[] = [];
  const skipped: { url: string; reason: string }[] = [];

  // Sequential, not Promise.all. Each iteration decodes and re-encodes a
  // multi-megapixel JPEG; doing eight at once on a serverless function is how
  // the process gets killed for memory rather than returning a useful error.
  for (const [i, url] of sources.entries()) {
    try {
      images.push(await prepareForInstagram(url, `${product.id}-${i}`));
    } catch (err) {
      skipped.push({ url, reason: err instanceof Error ? err.message : String(err) });
    }
  }

  if (images.length === 0) throw new Error('None of this product’s images could be prepared');

  return { product, images, skipped, ...generated };
}

export type PublishResult = {
  postId: number;
  mediaId: string;
  permalink: string | null;
};

/**
 * Publish a prepared post.
 *
 * The caption and image list are passed in rather than rebuilt, so what is
 * published is exactly what was approved on screen. Regenerating here would
 * mean an attribute edited between preview and publish silently changes the
 * post the merchant already read.
 */
export async function publishToInstagram(opts: {
  productId: number;
  caption: string;
  hashtags: string[];
  imageUrls: string[];
  altText?: string;
}): Promise<PublishResult> {
  const creds = getInstagramCredentials();
  if (!creds) {
    throw new Error(
      'Instagram is not connected. Set IG_USER_ID and IG_ACCESS_TOKEN before publishing.'
    );
  }

  if (opts.imageUrls.length === 0) throw new Error('No images to publish');
  if (opts.imageUrls.length > MAX_CAROUSEL) {
    throw new Error(`Instagram allows at most ${MAX_CAROUSEL} images per post`);
  }

  const sb = createServiceRoleClient();

  /*
   * Record BEFORE publishing, not after.
   *
   * If the process dies during media_publish, a row already exists saying an
   * attempt was in flight. The alternative — record on success — loses exactly
   * the case that matters: a post that went live while the caller never found
   * out, which is the one situation that leads to posting it twice.
   */
  const { data: row, error: insertError } = await sb
    .from('instagram_posts')
    .insert({
      product_id: opts.productId,
      status: 'pending',
      caption: opts.caption,
      hashtags: opts.hashtags,
      image_urls: opts.imageUrls,
    })
    .select('id')
    .single();

  if (insertError || !row) {
    throw new Error(`Could not record the post: ${insertError?.message ?? 'unknown error'}`);
  }

  const postId = row.id as number;

  const fail = async (err: unknown): Promise<never> => {
    const message = err instanceof Error ? err.message : String(err);
    await sb.from('instagram_posts').update({ status: 'failed', error: message }).eq('id', postId);
    throw err;
  };

  try {
    const single = opts.imageUrls.length === 1;

    // Children first. Each must finish processing before the parent can
    // reference it.
    const childIds: string[] = [];
    for (const url of opts.imageUrls) {
      const id = await createImageContainer(creds, {
        imageUrl: url,
        altText: opts.altText,
        caption: single ? opts.caption : undefined,
        isCarouselItem: !single,
      });
      await waitForContainer(creds, id);
      childIds.push(id);
    }

    const containerId = single
      ? childIds[0]!
      : await createCarouselContainer(creds, childIds, opts.caption);

    if (!single) await waitForContainer(creds, containerId);

    await sb.from('instagram_posts').update({ ig_container_id: containerId }).eq('id', postId);

    // ── The irreversible step ──
    const mediaId = await publishContainer(creds, containerId);

    const permalink = await getPermalink(creds, mediaId);

    await sb
      .from('instagram_posts')
      .update({
        status: 'published',
        ig_media_id: mediaId,
        permalink,
        published_at: new Date().toISOString(),
        error: null,
      })
      .eq('id', postId);

    return { postId, mediaId, permalink };
  } catch (err) {
    return fail(err);
  }
}

export type InstagramStatus = {
  connected: boolean;
  username?: string;
  limit: { used: number; cap: number } | null;
  /** Published in the last 24h according to our own records — available even
   *  when Meta's endpoint is unreachable. */
  publishedToday: number;
};

export async function getInstagramStatus(): Promise<InstagramStatus> {
  const creds = getInstagramCredentials();

  const sb = createServiceRoleClient();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count } = await sb
    .from('instagram_posts')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'published')
    .gte('published_at', since);

  if (!creds) return { connected: false, limit: null, publishedToday: count ?? 0 };

  const [limit, account] = await Promise.all([
    getPublishingLimit(creds),
    verifyAccount(creds),
  ]);

  return {
    connected: Boolean(account),
    username: account?.username,
    limit,
    publishedToday: count ?? 0,
  };
}

async function verifyAccount(creds: InstagramCredentials) {
  try {
    const { getAccount } = await import('@/lib/instagram/client');
    return await getAccount(creds);
  } catch {
    // An expired token is a "not connected" state, not a crash.
    return null;
  }
}

/** Recent posts, newest first — the admin history table. */
export async function getRecentInstagramPosts(limit = 20) {
  const sb = createServiceRoleClient();
  const { data } = await sb
    .from('instagram_posts')
    .select('id, product_id, status, permalink, caption, published_at, created_at, error, image_urls')
    .order('created_at', { ascending: false })
    .limit(limit);
  return data ?? [];
}

/** Products never successfully posted — the actual work queue. */
export async function getUnpostedProducts(): Promise<Product[]> {
  const sb = createServiceRoleClient();
  const { data } = await sb
    .from('instagram_posts')
    .select('product_id')
    .eq('status', 'published');

  const posted = new Set((data ?? []).map((r) => r.product_id).filter(Boolean));

  const { getProducts } = await import('@/services/product.service');
  const all = await getProducts();
  return all.filter((p) => !posted.has(p.id));
}
