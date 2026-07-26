import { NextResponse } from 'next/server';
import { getNewArrivals } from '@/services/product.service';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const products = await getNewArrivals();
    return NextResponse.json({ success: true, data: products });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
