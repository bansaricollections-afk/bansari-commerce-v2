import { NextRequest, NextResponse } from 'next/server';

import { apiError } from '@/lib/api-response';
import { requireAdminSession } from '@/lib/auth/requireAdmin';
import { createLogger } from '@/lib/logger';
import { generateRequestId } from '@/lib/request-id';
import { getGuide, guides } from '@/content/guides';
import { buildGuideCarousel } from '@/lib/instagram/guide-carousel';
import { createServiceRoleClient } from '@/lib/supabase/service';
import { getProductById } from '@/services/product.service';

const log = createLogger({ service: 'admin.instagram.guide' });

export const runtime = 'nodejs';
export const maxDuration = 120;

/**
 * GET  /api/admin/instagram/guide  — list guides that can become a carousel.
 * POST /api/admin/instagram/guide  { slug } — build one.
 *
 * The POST response is deliberately the same shape as the product preview, so
 * the existing publish endpoint and the existing Publish button work on a
 * guide carousel without knowing it is one. A carousel of ten images is a
 * carousel of ten images, whatever is drawn on them.
 */

export async function GET(request: NextRequest) {
  const requestId = generateRequestId();
  const auth = await requireAdminSession(request);
  if (auth instanceof NextResponse) return auth;

  return NextResponse.json({
    success: true,
    requestId,
    guides: guides.map((g) => {
      const takeaways = g.body.find(
        (b): b is { type: 'keyTakeaway'; items: string[] } => b.type === 'keyTakeaway'
      );
      return {
        slug: g.slug,
        title: g.title,
        category: g.category,
        excerpt: g.excerpt,
        // Cover + takeaways + closing.
        slides: takeaways ? Math.min(takeaways.items.length, 8) + 2 : 0,
      };
    }),
  });
}

export async function POST(request: NextRequest) {
  const requestId = generateRequestId();
  const auth = await requireAdminSession(request);
  if (auth instanceof NextResponse) return auth;

  let body: { slug?: unknown };
  try {
    body = (await request.json()) as { slug?: unknown };
  } catch {
    return apiError(requestId, 'INVALID_JSON', 'Invalid JSON body', 400);
  }

  const slug = typeof body.slug === 'string' ? body.slug : '';
  const guide = slug ? getGuide(slug) : undefined;
  if (!guide) return apiError(requestId, 'NOT_FOUND', `Guide "${slug}" not found`, 404);

  try {
    /*
     * The cover photograph is resolved from the guide's hero PRODUCT, not from
     * a stored image path. Same rule the guide renderer follows: a hero must
     * be a real product's own photograph, so there is no way to point a cover
     * at stock imagery.
     */
    let heroUrl: string | null = null;
    if (guide.hero?.productId) {
      const product = await getProductById(guide.hero.productId);
      const images = (product?.images ?? [])
        .map((img) => (typeof img === 'string' ? img : img?.url))
        .filter((u): u is string => typeof u === 'string' && u.length > 0);
      heroUrl = images[guide.hero.imageIndex ?? 0] ?? images[0] ?? null;
    }

    const carousel = await buildGuideCarousel(guide, heroUrl);

    const sb = createServiceRoleClient();
    const urls: string[] = [];

    for (const [i, slide] of carousel.slides.entries()) {
      // Stable path per guide+index: re-previewing replaces rather than
      // accumulating a new set of slides on every click.
      const path = `instagram/guides/${guide.slug}-${i}.jpg`;
      const { error } = await sb.storage
        .from('product-images')
        .upload(path, slide, { contentType: 'image/jpeg', upsert: true });
      if (error) throw new Error(`Upload failed on slide ${i}: ${error.message}`);
      urls.push(sb.storage.from('product-images').getPublicUrl(path).data.publicUrl);
    }

    log.info('admin.instagram.guide.ok', { slug, slides: urls.length, requestId });

    return NextResponse.json({
      success: true,
      requestId,
      caption: carousel.caption,
      hashtags: carousel.hashtags,
      productUrl: carousel.guideUrl,
      usedAttributes: [],
      skipped: [],
      // Matches the product preview's PreparedImage shape.
      images: urls.map((url) => ({
        url,
        action: 'unchanged' as const,
        sourceRatio: 0.8,
        width: 1080,
        height: 1350,
        bytes: 0,
      })),
      product: { id: 0, name: guide.title, price: 0 },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    log.error('admin.instagram.guide.failed', err, { slug, requestId });
    return apiError(requestId, 'GUIDE_CAROUSEL_FAILED', message, 500);
  }
}
