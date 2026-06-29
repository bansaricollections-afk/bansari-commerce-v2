"use client";

import Link from "next/link";
import { Heart, Search, ShoppingBag, User } from "lucide-react";

const menu = [
  { name: "New Arrivals", href: "/shop/new-arrivals" },
  { name: "Sarees", href: "/shop/sarees" },
  { name: "Kurta Sets", href: "/shop/kurta-sets" },
  { name: "Co-ord Sets", href: "/shop/co-ord-sets" },
  { name: "Gowns", href: "/shop/gowns" },
  { name: "Sale", href: "/sale" },
];

export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">

        <Link href="/" className="text-3xl font-bold tracking-wide">
          BANSARI
        </Link>

        <nav className="hidden gap-8 lg:flex">
          {menu.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="text-sm font-medium transition hover:text-[#8A5A6A]"
            >
              {item.name}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-5">

          <Search
            className="cursor-pointer transition hover:text-[#8A5A6A]"
            size={20}
          />

          <Heart
            className="cursor-pointer transition hover:text-[#8A5A6A]"
            size={20}
          />

          <ShoppingBag
            className="cursor-pointer transition hover:text-[#8A5A6A]"
            size={20}
          />

          <User
            className="cursor-pointer transition hover:text-[#8A5A6A]"
            size={20}
          />

        </div>
      </div>
    </header>
  );
}
