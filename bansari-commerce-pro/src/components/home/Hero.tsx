"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-[#FFFDF9]">
      <div className="mx-auto grid min-h-[85vh] max-w-7xl items-center gap-12 px-6 py-16 lg:grid-cols-2">

        <div>
          <p className="mb-4 uppercase tracking-[0.4em] text-sm text-[#8A5A6A]">
            New Collection 2026
          </p>

          <h1 className="text-5xl font-bold leading-tight md:text-7xl">
            Wear What
            <br />
            Words
            <br />
            Cannot Say
          </h1>

          <p className="mt-8 max-w-xl text-lg text-gray-600">
            Discover premium sarees, kurta sets, co-ord sets and ethnic wear
            designed for celebrations, weddings and everyday elegance.
          </p>

          <div className="mt-10 flex gap-5">
            <Link
              href="/shop"
              className="rounded-full bg-[#8A5A6A] px-8 py-4 text-white transition hover:bg-[#714857]"
            >
              Shop Now
            </Link>

            <Link
              href="/collections"
              className="flex items-center gap-2 rounded-full border px-8 py-4 hover:bg-gray-100"
            >
              View Collection
              <ArrowRight size={18} />
            </Link>
          </div>
        </div>

        <div className="relative">
          <img
            src="/hero/model.png"
            alt="Bansari Collections"
            className="mx-auto max-h-[750px] object-contain"
          />
        </div>

      </div>
    </section>
  );
}
