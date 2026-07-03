"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { signInAdmin } from "@/services/auth.service";

export default function AdminLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");

  async function handleLogin() {
    setError("");

    if (!email || !password) {
      setError("Email and password are required.");
      return;
    }

    try {
      setLoading(true);

      await signInAdmin(email, password);

      router.push("/admin");
      router.refresh();
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Unable to sign in.";

      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F8F8F8] px-6">
      <div className="w-full max-w-md rounded-3xl bg-white p-10 shadow-sm">
        <h1 className="mb-8 text-center font-[family:var(--font-playfair)] text-4xl font-bold">
          Admin Login
        </h1>

        <div className="space-y-5">
          <input
            type="email"
            placeholder="Email Address"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border p-4 outline-none focus:border-[#8A5A6A]"
          />

          <input
            type="password"
            placeholder="Password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border p-4 outline-none focus:border-[#8A5A6A]"
          />

          {error && (
            <p className="text-sm text-red-600">
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={handleLogin}
            disabled={loading}
            className="w-full rounded-xl bg-[#8A5A6A] py-4 font-semibold text-white transition hover:bg-[#734757] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Signing In..." : "Sign In"}
          </button>
        </div>
      </div>
    </main>
  );
}