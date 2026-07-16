"use client";

import { useState } from "react";
import { ChevronDown, LayoutGrid, Rows3 } from "lucide-react";

const SORT_OPTIONS = [
  { value: "newest",     label: "Newest First" },
  { value: "bestseller", label: "Best Selling" },
  { value: "price_asc",  label: "Price: Low → High" },
  { value: "price_desc", label: "Price: High → Low" },
  { value: "rating",     label: "Highest Rated" },
  { value: "featured",   label: "Featured" },
  { value: "az",         label: "A → Z" },
];

export default function ShopToolbar() {
  const [sort, setSort] = useState("newest");
  const [grid, setGrid] = useState<"2" | "3" | "4">("3");
  const [open, setOpen] = useState(false);

  const selectedLabel = SORT_OPTIONS.find((o) => o.value === sort)?.label ?? "Sort";

  return (
    <div className="mb-4 flex items-center justify-between border-b border-slate-200 pb-4">
      {/* Left — product count */}
      <p className="text-xs text-slate-500">
        Showing <span className="font-semibold text-slate-900">48</span> products
      </p>

      {/* Right — sort + view */}
      <div className="flex items-center gap-4">
        {/* Sort dropdown */}
        <div className="relative">
          <button
            type="button"
            aria-haspopup="listbox"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-2 border border-slate-200 bg-white px-4 py-2.5 text-xs font-medium text-slate-700 transition hover:border-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A5A6A]"
          >
            <span className="hidden sm:inline">Sort:</span> {selectedLabel}
            <ChevronDown size={13} className={`text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
          </button>

          {open && (
            <ul
              role="listbox"
              aria-label="Sort options"
              className="absolute right-0 top-full z-50 mt-1 min-w-[180px] border border-slate-200 bg-white shadow-lg"
            >
              {SORT_OPTIONS.map((opt) => (
                <li key={opt.value}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={sort === opt.value}
                    onClick={() => { setSort(opt.value); setOpen(false); }}
                    className={`w-full px-4 py-2.5 text-left text-xs transition hover:bg-slate-50 ${
                      sort === opt.value ? "font-semibold text-[#8A5A6A]" : "text-slate-700"
                    }`}
                  >
                    {opt.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Grid toggle — desktop only */}
        <div className="hidden items-center gap-1 md:flex" role="group" aria-label="Grid layout">
          {(["2", "3", "4"] as const).map((g) => (
            <button
              key={g}
              type="button"
              aria-label={`${g}-column grid`}
              aria-pressed={grid === g}
              onClick={() => setGrid(g)}
              className={`flex h-8 w-8 items-center justify-center border transition ${
                grid === g
                  ? "border-[#8A5A6A] bg-[#8A5A6A] text-white"
                  : "border-slate-200 bg-white text-slate-400 hover:border-slate-400"
              } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A5A6A]`}
            >
              {g === "2" ? <Rows3 size={13} /> : <LayoutGrid size={13} />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
