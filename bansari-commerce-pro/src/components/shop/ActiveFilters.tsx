"use client";

import { X } from "lucide-react";

const activeFilters = [
  "Wedding",
  "Pink",
  "Cotton",
  "M",
  "₹1000 - ₹3000",
];

export default function ActiveFilters() {
  return (
    <div className="mb-8 flex flex-wrap items-center gap-3">

      {activeFilters.map((filter) => (
        <button
          key={filter}
          className="flex items-center gap-2 rounded-full bg-[#F7F2EE] px-4 py-2 text-sm font-medium text-[#8A5A6A] transition hover:bg-[#E9DDD6]"
        >
          {filter}

          <X size={14} />
        </button>
      ))}

      <button className="text-sm font-semibold text-red-600 hover:underline">
        Clear All
      </button>

    </div>
  );
}