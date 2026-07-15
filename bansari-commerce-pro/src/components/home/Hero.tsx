"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function Hero() {
  return (
    <section className="bg-[#FFFDF9]">

      <div className="mx-auto grid min-h-[85vh] max-w-7xl items-center gap-16 px-6 py-16 lg:grid-cols-2">

        {/* LEFT */}

        <div>

          <span className="inline-block rounded-full bg-[#F6F0EB] px-5 py-2 text-sm font-medium text-[#8A5A6A]">
            ✨ New Collection 2026
          </span>

          <h1 className="mt-8 font-[family:var(--font-playfair)] text-6xl leading-tight font-bold lg:text-7xl">
            Where
            <br />
            Tradition
            <br />
            Meets
            <br />
            Timeless Style
          </h1>

          <p className="mt-8 max-w-xl text-lg leading-8 text-gray-600">
            Discover thoughtfully crafted ethnic wear designed for weddings,
            celebrations, festive occasions and everyday elegance.
          </p>

          <div className="mt-10 flex flex-wrap gap-4">

            <Link
              href="/shop"
              className="inline-flex items-center gap-2 rounded-full bg-[#8A5A6A] px-8 py-4 font-semibold text-white transition hover:bg-[#734757]"
            >
              Shop Collection

              <ArrowRight size={18} />

            </Link>

            <Link
              href="/collections"
              className="rounded-full border border-[#8A5A6A] px-8 py-4 font-semibold text-[#8A5A6A] transition hover:bg-[#F6F0EB]"
            >
              Explore Collections
            </Link>

          </div>

          {/* Brand Stats */}

          <div className="mt-16 grid grid-cols-3 gap-8">

            <div>
              <h3 className="text-3xl font-bold text-[#8A5A6A]">
                500+
              </h3>

              <p className="mt-2 text-sm text-gray-500">
                Curated Styles
              </p>
            </div>

            <div>
              <h3 className="text-3xl font-bold text-[#8A5A6A]">
                100%
              </h3>

              <p className="mt-2 text-sm text-gray-500">
                Quality Checked
              </p>
            </div>

            <div>
              <h3 className="text-3xl font-bold text-[#8A5A6A]">
                PAN India
              </h3>

              <p className="mt-2 text-sm text-gray-500">
                Delivery
              </p>
            </div>

          </div>

        </div>

        {/* RIGHT */}

        <div className="relative flex justify-center">

          <div className="absolute h-[550px] w-[550px] rounded-full bg-[#F7EDE6] blur-3xl" />

          <Image
            src="/hero/hero.png"
            alt="Bansari Collections"
            width={650}
            height={850}
            priority
            className="relative rounded-[40px] shadow-2xl"
          />

        </div>

      </div>

    </section>
  );
}