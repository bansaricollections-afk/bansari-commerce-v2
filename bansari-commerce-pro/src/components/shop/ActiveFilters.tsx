"use client";

import { X } from "lucide-react";
import { useState } from "react";

const DEMO_FILTERS = ["Wedding", "Kurta Sets", "Cotton", "M", "₹1,000 – ₹5,000"];

export default function ActiveFilters() {
  const [active, setActive] = useState<string[]>(DEMO_FILTERS);

  if (active.length === 0) return null;

  return (
    <div
      role="region"
      aria-label="Active filters"
      className="mb-6 flex flex-wrap items-center gap-2"
    >
      <span className="mr-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-400">
        Filtering by:
      </span>
      {active.map((f) => (
        <button
          key={f}
          type="button"
          aria-label={`Remove filter: ${f}`}
          onClick={() => setActive((prev) => prev.filter((v) => v !== f))}
          className="flex items-center gap-1.5 border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-700 transition-all duration-200 hover:border-[#8A5A6A] hover:bg-[#8A5A6A]/5 hover:text-[#8A5A6A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A5A6A]"
        >
          {f}
          <X size={10} className="text-slate-300" aria-hidden="true" />
        </button>
      ))}
      <button
        type="button"
        onClick={() => setActive([])}
        className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#8A5A6A] underline-offset-2 transition-colors duration-200 hover:text-slate-900 hover:underline focus-visible:outline-none"
      >
        Clear all
      </button>
    </div>
  );
}
