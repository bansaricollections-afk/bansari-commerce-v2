// ─── Sprint 9C — Trending Searches API Route ─────────────────────────────────
import { NextResponse } from 'next/server';
import { getTrendingSearches } from '@/services/search.service';

export const revalidate = 300; // ISR: revalidate every 5 min

export async function GET(): Promise<NextResponse> {
  const trending = await getTrendingSearches();
  return NextResponse.json(trending, {
    status: 200,
    headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
  });
}
