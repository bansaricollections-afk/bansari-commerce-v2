"use client";

import Link from "next/link";

export default function LoginPage() {
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

          <form className="mt-10 space-y-5">

            <input
              type="email"
              placeholder="Email Address"
              className="h-14 w-full rounded-xl border border-[#E6DFDA] px-5 outline-none focus:border-[#8A5A6A]"
            />

            <input
              type="password"
              placeholder="Password"
              className="h-14 w-full rounded-xl border border-[#E6DFDA] px-5 outline-none focus:border-[#8A5A6A]"
            />

            <button
              className="w-full rounded-full bg-[#8A5A6A] py-4 font-semibold text-white transition hover:bg-[#734757]"
            >
              Sign In
            </button>

          </form>

          <div className="mt-6 flex justify-between text-sm">

            <Link
              href="/auth/forgot-password"
              className="text-[#8A5A6A]"
            >
              Forgot Password?
            </Link>

            <Link
              href="/auth/register"
              className="text-[#8A5A6A]"
            >
              Create Account
            </Link>

          </div>

        </div>

      </div>

    </main>
  );
}
