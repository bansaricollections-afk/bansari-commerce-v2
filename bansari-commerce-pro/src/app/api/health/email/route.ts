import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Email health — does sending actually WORK, not just "is a key set".
 *
 * WHY THIS CHANGED
 * This endpoint previously returned `{ status: 'ok', apiKeyPresent: true }`
 * whenever the variable was non-empty. It would have reported "ok" with a
 * revoked, expired or mistyped key — which is exactly the state that lost a
 * real customer their order confirmation, because:
 *
 *   1. The order path deliberately swallows email failures, so a paid order
 *      still succeeds when the send fails (correct — a bounced receipt must
 *      never fail a payment).
 *   2. There is no send log, so a failure leaves no trace anywhere.
 *   3. This endpoint said everything was fine.
 *
 * Three layers of "you will never know" stacked on top of each other. The
 * order path's silence is right; the monitoring's silence was not.
 *
 * It now calls Resend with the key and reports what Resend says. A 401/400
 * means the key is dead and NOTHING is being delivered — the single most
 * useful fact this endpoint can carry.
 *
 * SAFETY: the key is never returned, logged or echoed — only Resend's verdict
 * on it. `domains` is used rather than `emails` because it is read-only,
 * cheap, and additionally reveals whether the sending domain is verified,
 * which is the other way delivery silently fails.
 */
export async function GET(): Promise<NextResponse> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL ?? process.env.EMAIL_FROM ?? null;

  if (!apiKey) {
    return NextResponse.json(
      { status: 'error', canSend: false, reason: 'RESEND_API_KEY is not configured.' },
      { status: 503 }
    );
  }

  try {
    const res = await fetch('https://api.resend.com/domains', {
      headers: { Authorization: `Bearer ${apiKey}` },
      // Never serve a cached verdict — the whole point is current state.
      cache: 'no-store',
    });

    if (!res.ok) {
      // 401/400 here means the key itself is rejected: nothing can be sent.
      return NextResponse.json(
        {
          status: 'error',
          canSend: false,
          reason: `Resend rejected the API key (HTTP ${res.status}). No email is being delivered.`,
          from,
        },
        { status: 503 }
      );
    }

    const body = (await res.json()) as {
      data?: Array<{ name?: string; status?: string }>;
    };
    const domains = (body.data ?? []).map((d) => ({
      name: d.name ?? null,
      status: d.status ?? null,
    }));

    /*
     * A valid key still delivers nothing if the sending domain is not
     * verified, so surface that too rather than reporting a bare "ok".
     */
    const sendingDomain = from?.split('@')[1] ?? null;
    const match = domains.find((d) => d.name === sendingDomain);
    const domainVerified = match?.status === 'verified';

    return NextResponse.json({
      status: domainVerified ? 'ok' : 'degraded',
      canSend: domainVerified,
      from,
      sendingDomain,
      domainStatus: match?.status ?? 'not-found',
      domains,
    });
  } catch (err) {
    return NextResponse.json(
      {
        status: 'error',
        canSend: false,
        reason: `Could not reach Resend: ${err instanceof Error ? err.message : 'unknown error'}`,
        from,
      },
      { status: 503 }
    );
  }
}
