"use client";

import Link from "next/link";
import { useState } from "react";

import { createClient } from "@/lib/supabase/client";

/**
 * Password reset request.
 *
 * Supabase sends the reset email (not Resend) and redirects the customer back
 * to /auth/reset-password with a recovery session already established.
 *
 * The response is deliberately identical whether or not the address exists —
 * this endpoint must not become an account-enumeration oracle, matching the
 * behaviour of /auth/login and /api/auth/register.
 */
export default function ForgotPasswordPage() {
  const [email, setEmail]     = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent]       = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    try {
      const supabase = createClient();
      const origin =
        process.env.NEXT_PUBLIC_SITE_URL ??
        (typeof window !== "undefined" ? window.location.origin : "");

      await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: `${origin}/auth/reset-password`,
      });
    } catch {
      // Swallowed on purpose — see the enumeration note above.
    } finally {
      setSent(true);
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#FFFDF9]">
      <div className="mx-auto flex min-h-screen max-w-md items-center px-6">
        <div className="w-full rounded-3xl bg-white p-10 shadow-lg">

          <h1 className="font-[family:var(--font-playfair)] text-4xl font-bold">
            Reset Password
          </h1>

          {sent ? (
            <>
              <p className="mt-6 rounded-xl bg-[#F7F1F3] px-5 py-4 text-sm text-[#714857]">
                If an account exists for that address, we have sent a reset link.
                Please check your inbox.
              </p>
              <div className="mt-6 text-center text-sm">
                <Link href="/auth/login" className="text-[#8A5A6A]">
                  Back to Sign In
                </Link>
              </div>
            </>
          ) : (
            <>
              <p className="mt-3 text-gray-500">
                Enter your email and we&apos;ll send you a link to set a new password.
              </p>

              <form className="mt-10 space-y-5" onSubmit={handleSubmit}>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="Email Address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-14 w-full rounded-xl border border-[#E6DFDA] px-5 outline-none focus:border-[#8A5A6A]"
                />

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-full bg-[#8A5A6A] py-4 font-semibold text-white transition hover:bg-[#734757] disabled:opacity-60"
                >
                  {loading ? "Sending…" : "Send Reset Link"}
                </button>
              </form>

              <div className="mt-6 text-center text-sm">
                <Link href="/auth/login" className="text-[#8A5A6A]">
                  Back to Sign In
                </Link>
              </div>
            </>
          )}

        </div>
      </div>
    </main>
  );
}
