import { NextResponse } from 'next/server';

import { getFeaturedCoupon } from '@/services/coupon.service';

/**
 * The coupon worth promoting right now, or null.
 *
 * Public and cacheable: it exposes only what a banner already shows a visitor —
 * code, discount and minimum order. No usage counts, no expiry timestamps, no
 * internal ids, so it reveals nothing about campaign performance.
 *
 * Cached for 60s at the edge. Banners appear on nearly every page, and this
 * would otherwise be a database round trip per visitor per page. A minute of
 * staleness is invisible to customers and a lapsed coupon still fails closed at
 * checkout, where the code is re-validated for real.
 */
export const revalidate = 60;

export async function GET() {
  const coupon = await getFeaturedCoupon();

  return NextResponse.json(
    { coupon },
    { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } }
  );
}
