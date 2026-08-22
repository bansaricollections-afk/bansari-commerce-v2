"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { createClient } from "@/lib/supabase/client";

/**
 * Customer sign-in.
 *
 * This page previously rendered a form with no onSubmit handler and no auth
 * call at all — the button did nothing, and "Create Account" pointed at a
 * route that did not exist. Both are now wired up.
 */
export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (signInError) {
        // Deliberately generic: do not reveal whether the address is registered.
        setError("Incorrect email or password.");
        return;
      }

      router.push("/shop");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#FFFDF9]">
      <div className="mx-auto flex min-h-screen max-w-md items-center px-6">
        <div className="w-full rounded-3xl bg-white p-10 shadow-lg">

          <h1 className="font-[family:var(--font-playfair)] text-4xl font-bold">
            Welcome Back
          </h1>

          <p className="mt-3 text-gray-500">
            Sign in to continue shopping with Bansari Collections.
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

            <input
              type="password"
              required
              autoComplete="current-password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-14 w-full rounded-xl border border-[#E6DFDA] px-5 outline-none focus:border-[#8A5A6A]"
            />

            {error && (
              <p className="text-sm font-medium text-red-600">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-[#8A5A6A] py-4 font-semibold text-white transition hover:bg-[#734757] disabled:opacity-60"
            >
              {loading ? "Signing In…" : "Sign In"}
            </button>
          </form>

          <div className="mt-6 flex justify-between text-sm">
            <Link href="/auth/forgot-password" className="text-[#8A5A6A]">
              Forgot Password?
            </Link>
            <Link href="/auth/register" className="text-[#8A5A6A]">
              Create Account
            </Link>
          </div>

        </div>
      </div>
    </main>
  );
}
