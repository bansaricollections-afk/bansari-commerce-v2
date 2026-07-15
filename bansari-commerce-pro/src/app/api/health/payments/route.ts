import { NextResponse } from 'next/server';

export async function GET(): Promise<NextResponse> {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  // Never expose the actual key values — only confirm presence.
  if (!keyId || !keySecret) {
    return NextResponse.json(
      {
        status: 'error',
        message: 'Razorpay credentials are not configured.',
      },
      { status: 503 }
    );
  }

  return NextResponse.json({
    status: 'ok',
    keyIdPresent: true,
    keySecretPresent: true,
  });
}
