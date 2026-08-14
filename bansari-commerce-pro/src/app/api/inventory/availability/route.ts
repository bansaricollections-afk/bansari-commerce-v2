/**
 * GET /api/inventory/availability?variantIds=1,36
 *
 * Live availability for the variants sitting in a customer's cart, so the cart
 * can cap quantities against real stock instead of letting a shopper walk into
 * a checkout failure.
 *
 * This is a read-only projection of the SAME canonical source used everywhere
 * else (`v_product_size_availability` via size-inventory.service) — no second
 * inventory model, no availability arithmetic here.
 *
 * Server-side validation in validateCartItems and the row-locked decrement in
 * create_order_with_items remain authoritative; this endpoint only improves
 * what the customer is shown.
 */
import { NextResponse } from 'next/server';

import { getAvailabilityForVariants } from '@/services/size-inventory.service';

export const dynamic = 'force-dynamic';

const MAX_VARIANTS = 50;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const raw = searchParams.get('variantIds') ?? '';

  const variantIds = raw
    .split(',')
    .map((v) => Number(v.trim()))
    .filter((v) => Number.isInteger(v) && v > 0)
    .slice(0, MAX_VARIANTS);

  if (variantIds.length === 0) {
    return NextResponse.json({ availability: {} });
  }

  const map = await getAvailabilityForVariants(variantIds);

  const availability: Record<number, number> = {};
  for (const id of variantIds) {
    // A variant that is no longer sellable resolves to 0, not "unknown" —
    // the cart must fail closed.
    availability[id] = map.get(id) ?? 0;
  }

  return NextResponse.json(
    { availability },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
