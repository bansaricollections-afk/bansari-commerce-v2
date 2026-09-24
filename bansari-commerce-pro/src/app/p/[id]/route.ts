import { NextResponse, type NextRequest } from 'next/server';

/**
 * GET /p/[id] — the short product link printed in Instagram captions.
 *
 * WHY THIS EXISTS
 * Instagram never makes caption links tappable, for any account. So a caption
 * link only works if someone TYPES it, and the old one was
 *
 *   https://www.bansaricollection.in/product/41?utm_source=instagram&utm_medium=social&utm_campaign=product_post
 *
 * which nobody will type. `bansaricollection.in/p/41` is short enough to
 * remember from a screenshot.
 *
 * The UTM tags are added HERE, on the way through, rather than in the printed
 * link — so the link stays short and the visit is still attributed to
 * Instagram in the "Where Orders Come From" report.
 *
 * A temporary (307) redirect, not permanent: product URLs are the site's to
 * change, and a permanent redirect gets cached by browsers indefinitely.
 */
export function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return params.then(({ id }) => {
    const target = new URL(request.url);
    // Anything that is not a plain product number goes to the shop rather
    // than to a 404 — someone who typed a link from a post should land
    // somewhere useful.
    target.pathname = /^\d{1,7}$/.test(id) ? `/product/${id}` : '/shop';
    target.search = '';
    target.searchParams.set('utm_source', 'instagram');
    target.searchParams.set('utm_medium', 'social');
    target.searchParams.set('utm_campaign', 'caption_link');
    return NextResponse.redirect(target, 307);
  });
}
