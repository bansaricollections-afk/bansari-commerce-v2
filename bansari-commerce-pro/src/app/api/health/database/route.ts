import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/service';

export async function GET(): Promise<NextResponse> {
  const start = Date.now();
  try {
    const supabase = createServiceRoleClient();
    // Lightweight connectivity probe — read a single row from a small table.
    const { error } = await supabase
      .from('products')
      .select('id')
      .limit(1)
      .single();

    const latencyMs = Date.now() - start;

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows found — table exists but is empty, still healthy.
      return NextResponse.json(
        { status: 'error', latencyMs, message: error.message },
        { status: 503 }
      );
    }

    return NextResponse.json({ status: 'ok', latencyMs });
  } catch (err) {
    return NextResponse.json(
      {
        status: 'error',
        latencyMs: Date.now() - start,
        message: err instanceof Error ? err.message : 'Unknown error',
      },
      { status: 503 }
    );
  }
}
