import { NextResponse } from 'next/server';

export async function GET(): Promise<NextResponse> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { status: 'error', message: 'RESEND_API_KEY is not configured.' },
      { status: 503 }
    );
  }

  return NextResponse.json({ status: 'ok', apiKeyPresent: true });
}
