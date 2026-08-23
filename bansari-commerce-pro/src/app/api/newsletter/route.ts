import { NextRequest, NextResponse } from "next/server";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email: unknown = body?.email;

    // SEC-03. Cap before the regex runs: this endpoint is public and
    // unauthenticated, and 254 is the RFC 5321 maximum for an address.
    if (typeof email === "string" && email.length > 254) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    if (typeof email !== "string" || !EMAIL_RE.test(email)) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    const normalised = email.trim().toLowerCase();

    // ── Supabase insert (no-op if table absent in dev) ──
    // When NEXT_PUBLIC_SUPABASE_URL is set, persist to newsletter_subscribers.
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseKey) {
      const res = await fetch(`${supabaseUrl}/rest/v1/newsletter_subscribers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          Prefer: "resolution=ignore-duplicates",
        },
        body: JSON.stringify({ email: normalised }),
      });

      if (res.status === 409) {
        return NextResponse.json({ duplicate: true }, { status: 200 });
      }

      if (!res.ok && res.status !== 201) {
        return NextResponse.json(
          { error: "Could not subscribe at this time. Please try again." },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch {
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  }
}
