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
      className="mb-5 flex flex-wrap items-center gap-2"
    >
      {active.map((f) => (
        <button
          key={f}
          type="button"
          aria-label={`Remove filter: ${f}`}
          onClick={() => setActive((prev) => prev.filter((v) => v !== f))}
          className="flex items-center gap-1.5 border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-[#8A5A6A] hover:text-[#8A5A6A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A5A6A]"
        >
          {f}
          <X size={11} className="text-slate-400" aria-hidden="true" />
        </button>
      ))}
      <button
        type="button"
        onClick={() => setActive([])}
        className="text-xs font-medium text-[#8A5A6A] underline-offset-2 transition hover:underline focus-visible:outline-none"
      >
        Clear all
      </button>
    </div>
  );
}
