"use client";

import Link from "next/link";
import { Heart, Menu, Search, ShoppingBag, User } from "lucide-react";
import { useState } from "react";
import { useCart } from "@/store/cart";
import { useWishlist } from "@/store/wishlist";

const categories = [
  "Kurta Sets",
  "Ethnic Dresses",
  "Sarees",
  "Lehengas",
  "Co-ord Sets",
  "Gowns",
];

const collections = [
  "New Arrivals",
  "Best Sellers",
  "Wedding Edit",
  "Festive Edit",
  "Office Edit",
];

export default function Header() {
  const { items } = useCart();
  const { items: wishlist } = useWishlist();

  const [shopOpen, setShopOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-[#ECE7E2] bg-white/90 backdrop-blur-lg">

      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">

        {/* Logo */}

        <Link
          href="/"
          className="font-[family:var(--font-playfair)] text-3xl font-bold tracking-wide text-[#8A5A6A]"
        >
          Bansari
        </Link>

        {/* Desktop Navigation */}

        <nav className="hidden items-center gap-10 lg:flex">

          <div
            className="relative"
            onMouseEnter={() => setShopOpen(true)}
            onMouseLeave={() => setShopOpen(false)}
          >
            <button className="font-medium hover:text-[#8A5A6A]">
              Shop
            </button>

            {shopOpen && (
              <div className="absolute left-0 top-10 w-[620px] rounded-3xl border border-[#ECE7E2] bg-white p-8 shadow-2xl">

                <div className="grid grid-cols-2 gap-10">

                  <div>

                    <h3 className="mb-4 text-lg font-bold">
                      Categories
                    </h3>

                    <div className="space-y-3">

                      {categories.map((item) => (
                        <Link
                          key={item}
                          href="/shop"
                          className="block hover:text-[#8A5A6A]"
                        >
                          {item}
                        </Link>
                      ))}

                    </div>

                  </div>

                  <div>

                    <h3 className="mb-4 text-lg font-bold">
                      Collections
                    </h3>

                    <div className="space-y-3">

                      {collections.map((item) => (
                        <Link
                          key={item}
                          href="/shop"
                          className="block hover:text-[#8A5A6A]"
                        >
                          {item}
                        </Link>
                      ))}

                    </div>

                  </div>

                </div>

                <div className="mt-8 rounded-2xl bg-[#F8F2EE] p-6">

                  <p className="uppercase tracking-[4px] text-[#8A5A6A] text-sm">
                    Featured Collection
                  </p>

                  <h3 className="mt-2 text-2xl font-bold">
                    Wedding Edit 2026
                  </h3>

                  <p className="mt-2 text-gray-600">
                    Handcrafted festive styles curated for unforgettable celebrations.
                  </p>

                </div>

              </div>
            )}
          </div>

          <Link href="/new-arrivals">New Arrivals</Link>

          <Link href="/collections">Collections</Link>

          <Link href="/about">About</Link>

          <Link href="/contact">Contact</Link>

        </nav>

        {/* Right Side */}

        <div className="flex items-center gap-2">

          <button className="rounded-full p-3 hover:bg-[#F6F0EB]">
            <Search size={20} />
          </button>

          <Link
            href="/wishlist"
            className="relative rounded-full p-3 hover:bg-[#F6F0EB]"
          >
            <Heart size={20} />

            {wishlist.length > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#8A5A6A] text-xs text-white">
                {wishlist.length}
              </span>
            )}
          </Link>

          <Link
            href="/cart"
            className="relative rounded-full p-3 hover:bg-[#F6F0EB]"
          >
            <ShoppingBag size={20} />

            {items.length > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#8A5A6A] text-xs text-white">
                {items.length}
              </span>
            )}
          </Link>

          <Link
            href="/auth/login"
            className="rounded-full p-3 hover:bg-[#F6F0EB]"
          >
            <User size={20} />
          </Link>

          <button className="rounded-full p-3 lg:hidden">
            <Menu size={22} />
          </button>

        </div>

      </div>

    </header>
  );
}