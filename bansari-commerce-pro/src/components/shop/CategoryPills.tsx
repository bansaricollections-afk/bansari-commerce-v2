"use client";

import { useState } from "react";

const PILLS = [
  { label: "All", value: "all" },
  { label: "Kurta Sets", value: "kurta-sets" },
  { label: "Sarees", value: "sarees" },
  { label: "Lehengas", value: "lehengas" },
  { label: "Co-ord Sets", value: "coord-sets" },
  { label: "Gowns", value: "gowns" },
  { label: "Ethnic Dresses", value: "ethnic-dresses" },
  { label: "New Arrivals", value: "new-arrivals" },
];

export default function CategoryPills() {
  const [selected, setSelected] = useState("all");

  return (
    <div
      className="flex gap-2 overflow-x-auto pb-1 scrollbar-none"
      role="tablist"
      aria-label="Filter by category"
    >
      {PILLS.map((pill) => (
        <button
          key={pill.value}
          type="button"
          role="tab"
          aria-selected={selected === pill.value}
          onClick={() => setSelected(pill.value)}
          className={`shrink-0 border px-4 py-2 text-xs font-medium whitespace-nowrap transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A5A6A] focus-visible:ring-offset-1 ${
            selected === pill.value
              ? "border-[#8A5A6A] bg-[#8A5A6A] text-white"
              : "border-slate-200 bg-white text-slate-600 hover:border-slate-400 hover:text-slate-900"
          }`}
        >
          {pill.label}
        </button>
      ))}
    </div>
  );
}
