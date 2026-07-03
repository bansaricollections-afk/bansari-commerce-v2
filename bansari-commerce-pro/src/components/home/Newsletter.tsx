"use client";

import { Mail } from "lucide-react";

export default function Newsletter() {
  return (
    <section className="bg-[#8A5A6A] py-24 text-white">

      <div className="mx-auto max-w-4xl px-6 text-center">

        <p className="uppercase tracking-[5px] text-[#F5E6D3]">
          Bansari Privé Club
        </p>

        <h2 className="mt-4 font-[family:var(--font-playfair)] text-5xl font-bold">
          Be the First to Discover Every Collection
        </h2>

        <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-white/80">
          Join our community for early access to new arrivals, festive edits,
          exclusive member offers and styling inspiration delivered directly to
          your inbox.
        </p>

        <div className="mx-auto mt-12 flex max-w-2xl flex-col gap-4 md:flex-row">

          <div className="relative flex-1">

            <Mail
              size={20}
              className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400"
            />

            <input
              type="email"
              placeholder="Enter your email address"
              className="h-14 w-full rounded-full bg-white pl-14 pr-5 text-black outline-none"
            />

          </div>

          <button
            className="rounded-full bg-[#C9A96E] px-10 py-4 font-semibold text-black transition hover:opacity-90"
          >
            Join Now
          </button>

        </div>

        <div className="mt-12 grid gap-8 md:grid-cols-4">

          <div>
            <h3 className="text-2xl font-bold">Early Access</h3>
            <p className="mt-2 text-sm text-white/70">
              New launches before everyone else.
            </p>
          </div>

          <div>
            <h3 className="text-2xl font-bold">Member Offers</h3>
            <p className="mt-2 text-sm text-white/70">
              Exclusive promotions and rewards.
            </p>
          </div>

          <div>
            <h3 className="text-2xl font-bold">Style Tips</h3>
            <p className="mt-2 text-sm text-white/70">
              Seasonal styling inspiration.
            </p>
          </div>

          <div>
            <h3 className="text-2xl font-bold">Celebration Edits</h3>
            <p className="mt-2 text-sm text-white/70">
              Curated looks for every occasion.
            </p>
          </div>

        </div>

      </div>

    </section>
  );
}