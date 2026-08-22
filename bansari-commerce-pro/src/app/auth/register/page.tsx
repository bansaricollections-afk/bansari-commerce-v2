"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Customer registration. Posts to /api/auth/register rather than calling
 * supabase.auth.signUp() directly, so the welcome email is sent server-side as
 * part of a genuine signup — see the route for why that matters.
 *
 * Styling mirrors /auth/login so the pair reads as one flow.
 */
export default function RegisterPage() {
  const router = useRouter();

  const [name, setName]         = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [done, setDone]         = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const json = await res.json();

      if (!json.success) {
        setError(json.message ?? "Could not create your account. Please try again.");
        return;
      }

      if (json.existing) {
        setError("That email is already registered. Please sign in instead.");
        return;
      }

      if (json.signedIn) {
        router.push("/shop");
        return;
      }

      // Email confirmation is enabled on the project — no session yet.
      setDone("Check your inbox to confirm your email address, then sign in.");
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
            Create Account
          </h1>

          <p className="mt-3 text-gray-500">
            Save your addresses and track every order in one place.
          </p>

          {done ? (
            <p className="mt-8 rounded-xl bg-[#F7F1F3] px-5 py-4 text-sm text-[#714857]">
              {done}
            </p>
          ) : (
            <form className="mt-10 space-y-5" onSubmit={handleSubmit}>
              <input
                type="text"
                required
                autoComplete="name"
                placeholder="Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-14 w-full rounded-xl border border-[#E6DFDA] px-5 outline-none focus:border-[#8A5A6A]"
              />

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
                minLength={8}
                autoComplete="new-password"
                placeholder="Password (min 8 characters)"
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
                {loading ? "Creating Account…" : "Create Account"}
              </button>
            </form>
          )}

          <div className="mt-6 text-center text-sm text-gray-500">
            Already have an account?{" "}
            <Link href="/auth/login" className="text-[#8A5A6A]">
              Sign In
            </Link>
          </div>

        </div>
      </div>
    </main>
  );
}
