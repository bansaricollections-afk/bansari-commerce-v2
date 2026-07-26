import { NextResponse } from 'next/server';
import { getNewArrivals } from '@/services/product.service';
import {
  logApiRouteResponse,
  logApiRouteError,
} from '@/lib/debug/product-debug';

export const dynamic = 'force-dynamic';

const ROUTE = '/api/products/new-arrivals';

export async function GET() {
  const t0 = Date.now();
  try {
    const products = await getNewArrivals();
    logApiRouteResponse(ROUTE, products.length, Date.now() - t0);
    return NextResponse.json({ success: true, data: products });
  } catch (err) {
    logApiRouteError(ROUTE, err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
