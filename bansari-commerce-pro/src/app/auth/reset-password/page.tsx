"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";

/**
 * Sets a new password after the customer follows the reset link.
 *
 * Supabase establishes a short-lived PASSWORD_RECOVERY session from the link
 * before this page renders, so updateUser() is authorised by that session —
 * the page never handles the token itself. If someone opens this URL directly
 * without a valid link there is no recovery session, and we say so rather than
 * failing silently on submit.
 */
export default function ResetPasswordPage() {
  const router = useRouter();

  const [ready, setReady]       = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm]   = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [done, setDone]         = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => setReady(!!data.session));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({ password });

      if (updateError) {
        setError("This reset link has expired. Please request a new one.");
        return;
      }

      setDone(true);
      setTimeout(() => router.push("/auth/login"), 2500);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#FFFDF9]">
      <div className="mx-auto flex min-h-screen max-w-md items-center px-6">
        <div className="w-full rounded-none bg-white p-10 shadow-lg">

          <h1 className="font-[family:var(--font-playfair)] text-4xl font-bold">
            New Password
          </h1>

          {done ? (
            <p className="mt-6 rounded-none bg-[#F7F1F3] px-5 py-4 text-sm text-[#714857]">
              Password updated. Redirecting you to sign in…
            </p>
          ) : ready === false ? (
            <>
              <p className="mt-6 rounded-none bg-[#F7F1F3] px-5 py-4 text-sm text-[#714857]">
                This page needs a valid reset link. Please request a new one.
              </p>
              <div className="mt-6 text-center text-sm">
                <Link href="/auth/forgot-password" className="text-[#8A5A6A]">
                  Request Reset Link
                </Link>
              </div>
            </>
          ) : (
            <>
              <p className="mt-3 text-gray-500">Choose a new password for your account.</p>

              <form className="mt-10 space-y-5" onSubmit={handleSubmit}>
                <input
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  placeholder="New Password (min 8 characters)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-14 w-full rounded-none border border-[#E6DFDA] px-5 outline-none focus:border-[#8A5A6A]"
                />

                <input
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  placeholder="Confirm New Password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="h-14 w-full rounded-none border border-[#E6DFDA] px-5 outline-none focus:border-[#8A5A6A]"
                />

                {error && <p className="text-sm font-medium text-red-600">{error}</p>}

                <button
                  type="submit"
                  disabled={loading || ready === null}
                  className="w-full rounded-none bg-[#8A5A6A] py-4 font-semibold text-white transition hover:bg-[#734757] disabled:opacity-60"
                >
                  {loading ? "Updating…" : "Update Password"}
                </button>
              </form>
            </>
          )}

        </div>
      </div>
    </main>
  );
}
