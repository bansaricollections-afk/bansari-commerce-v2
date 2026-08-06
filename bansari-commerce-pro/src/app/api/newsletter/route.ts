/**
 * POST /api/newsletter
 * Production newsletter subscription endpoint.
 *
 * Contract:
 *   Body: { email: string; source?: string }
 *   200: { success: true; message: string; alreadySubscribed?: boolean }
 *   400: { success: false; errorCode: 'INVALID_EMAIL' | 'MISSING_EMAIL'; errorMessage: string }
 *   500: { success: false; errorCode: 'DB_ERROR'; errorMessage: string }
 *
 * Idempotent: re-subscribing an existing active email returns 200.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function validEmail(email: unknown): email is string {
  return typeof email === 'string' && EMAIL_REGEX.test(email.trim());
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, errorCode: 'MISSING_EMAIL', errorMessage: 'Request body must be valid JSON.' },
      { status: 400 }
    );
  }

  const raw = (body as Record<string, unknown>)?.email;
  if (!raw) {
    return NextResponse.json(
      { success: false, errorCode: 'MISSING_EMAIL', errorMessage: 'Email address is required.' },
      { status: 400 }
    );
  }
  if (!validEmail(raw)) {
    return NextResponse.json(
      { success: false, errorCode: 'INVALID_EMAIL', errorMessage: 'Please enter a valid email address.' },
      { status: 400 }
    );
  }

  const email = raw.trim().toLowerCase();
  const source = typeof (body as Record<string, unknown>).source === 'string'
    ? (body as Record<string, unknown>).source as string
    : 'homepage_footer';

  const supabase = await createClient();

  // Upsert: if email exists and is active, this is a no-op returning the existing row.
  const { data: subscriber, error } = await supabase
    .from('newsletter_subscribers')
    .upsert(
      {
        email,
        source,
        status: 'active',
        subscribed_at: new Date().toISOString(),
        metadata: { user_agent: req.headers.get('user-agent') ?? '' },
      },
      { onConflict: 'email', ignoreDuplicates: false }
    )
    .select('id, status, subscribed_at')
    .single();

  if (error) {
    console.error('[newsletter] DB upsert error:', error.message);
    return NextResponse.json(
      { success: false, errorCode: 'DB_ERROR', errorMessage: 'Unable to process subscription. Please try again.' },
      { status: 500 }
    );
  }

  const alreadySubscribed =
    subscriber?.subscribed_at != null &&
    new Date(subscriber.subscribed_at).getTime() < Date.now() - 5000;

  // Fire-and-forget analytics event
  void supabase.from('checkout_events').insert({
    event_type: 'newsletter_subscribed',
    session_id: null,
    customer_id: null,
    coupon_code: null,
    reason: source,
    cart_value: null,
    currency: 'INR',
    metadata: { email, source, already_subscribed: alreadySubscribed },
  });

  return NextResponse.json(
    {
      success: true,
      message: alreadySubscribed
        ? "You're already subscribed — thank you!"
        : "You're on the list. Welcome to Bansari.",
      alreadySubscribed,
    },
    {
      status: 200,
      headers: { 'X-RateLimit-Limit': '5' },
    }
  );
}

// Explicit rejection of other methods
export async function GET() {
  return NextResponse.json({ success: false, errorCode: 'METHOD_NOT_ALLOWED', errorMessage: 'Use POST.' }, { status: 405 });
}
