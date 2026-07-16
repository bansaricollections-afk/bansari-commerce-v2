"use client";

import { useState } from "react";
import Link from "next/link";

const PILLS = [
  { label: "All",            href: "/shop" },
  { label: "Kurta Sets",     href: "/shop?category=kurta-sets" },
  { label: "Sarees",         href: "/shop?category=sarees" },
  { label: "Lehengas",       href: "/shop?category=lehengas" },
  { label: "Co-ord Sets",    href: "/shop?category=coord-sets" },
  { label: "Gowns",          href: "/shop?category=gowns" },
  { label: "Ethnic Dresses", href: "/shop?category=ethnic-dresses" },
  { label: "Festive Wear",   href: "/shop?category=festive-wear" },
  { label: "New Arrivals",   href: "/shop?category=new-arrivals" },
];

export default function CategoryPills() {
  const [active, setActive] = useState("All");

  return (
    <div
      className="border-t border-slate-100 bg-white"
      aria-label="Browse by category"
    >
      <div className="mx-auto max-w-[1440px] px-5 md:px-10 lg:px-16">
        <div
          className="flex items-center gap-0 overflow-x-auto py-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          role="tablist"
          aria-label="Product categories"
        >
          {PILLS.map((pill) => {
            const isActive = active === pill.label;
            return (
              <Link
                key={pill.label}
                href={pill.href}
                role="tab"
                aria-selected={isActive}
                onClick={() => setActive(pill.label)}
                className={[
                  "whitespace-nowrap border-b-2 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A5A6A] focus-visible:ring-inset",
                  isActive
                    ? "border-[#8A5A6A] text-[#8A5A6A]"
                    : "border-transparent text-slate-400 hover:border-slate-200 hover:text-slate-700",
                ].join(" ")}
              >
                {pill.label}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
