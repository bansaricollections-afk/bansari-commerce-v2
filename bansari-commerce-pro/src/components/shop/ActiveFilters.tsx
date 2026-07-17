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
      {/* Label */}
      <span className="mr-1 text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400">
        Filtered by:
      </span>

      {/* Filter chips */}
      {active.map((f) => (
        <button
          key={f}
          type="button"
          aria-label={`Remove filter: ${f}`}
          onClick={() => setActive((prev) => prev.filter((v) => v !== f))}
          className="group flex items-center gap-1.5 border border-slate-200 bg-white px-3 py-1.5 text-[10.5px] font-medium text-slate-700 transition-all duration-200 hover:border-[#8A5A6A] hover:bg-[#8A5A6A] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A5A6A]"
        >
          {f}
          <X
            size={9}
            className="text-slate-400 transition-colors duration-150 group-hover:text-white"
            aria-hidden="true"
          />
        </button>
      ))}

      {/* Clear all */}
      <button
        type="button"
        onClick={() => setActive([])}
        className="ml-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400 underline-offset-3 transition-all duration-200 hover:text-slate-900 hover:underline focus-visible:outline-none"
      >
        Clear all
      </button>
    </div>
  );
}