"use client";

import { useRef, useState } from "react";
import Link from "next/link";

const PILLS = [
  { label: "All",             href: "/shop" },
  { label: "Kurta Sets",      href: "/shop?category=kurta-sets" },
  { label: "Sarees",          href: "/shop?category=sarees" },
  { label: "Lehengas",        href: "/shop?category=lehengas" },
  { label: "Co-ord Sets",     href: "/shop?category=coord-sets" },
  { label: "Gowns",           href: "/shop?category=gowns" },
  { label: "Ethnic Dresses",  href: "/shop?category=ethnic-dresses" },
  { label: "Festive Wear",    href: "/shop?category=festive-wear" },
  { label: "Wedding Edit",    href: "/shop?category=wedding-edit" },
  { label: "New Arrivals",    href: "/shop?category=new-arrivals" },
  { label: "On Sale",         href: "/shop?category=on-sale" },
];

export default function CategoryPills() {
  const [active, setActive] = useState("All");
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <div className="relative border-t border-slate-100 bg-white">
      {/* Scroll fade — right edge */}
      <div
        className="pointer-events-none absolute right-0 top-0 z-10 h-full w-16 bg-gradient-to-l from-white to-transparent"
        aria-hidden="true"
      />
      <div className="mx-auto max-w-[1440px] px-5 md:px-10 lg:px-16">
        <div
          ref={scrollRef}
          className="flex items-center overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
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
                  "relative shrink-0 whitespace-nowrap px-4 py-3.5",
                  "text-[10px] font-bold uppercase tracking-[0.18em]",
                  "transition-colors duration-200",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A5A6A] focus-visible:ring-inset",
                  // Underline indicator — no layout shift
                  "after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:transition-all after:duration-300",
                  isActive
                    ? "text-[#8A5A6A] after:bg-[#8A5A6A]"
                    : "text-slate-400 hover:text-slate-800 after:bg-transparent hover:after:bg-slate-200",
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