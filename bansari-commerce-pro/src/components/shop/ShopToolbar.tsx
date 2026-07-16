"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Grid2X2, LayoutGrid, Rows3 } from "lucide-react";

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
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const selectedLabel = SORT_OPTIONS.find((o) => o.value === sort)?.label ?? "Sort";

  return (
    <div className="mb-5 flex items-center justify-between border-b border-slate-200 pb-5">
      {/* Left — product count */}
      <p className="text-[11px] uppercase tracking-[0.12em] text-slate-400">
        Showing <span className="font-semibold text-slate-900">48</span> products
      </p>

      {/* Right — sort + grid toggle */}
      <div className="flex items-center gap-3">

        {/* Sort dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            aria-haspopup="listbox"
            aria-expanded={open}
            aria-label={`Sort by: ${selectedLabel}`}
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-2 border border-slate-200 bg-white px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-700 transition-all duration-200 hover:border-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A5A6A]"
          >
            <span className="hidden sm:inline text-slate-400">Sort:</span>
            <span>{selectedLabel}</span>
            <ChevronDown
              size={12}
              className={`text-slate-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
            />
          </button>

          {open && (
            <ul
              role="listbox"
              aria-label="Sort options"
              className="absolute right-0 top-full z-50 mt-1 min-w-[200px] border border-slate-200 bg-white shadow-xl shadow-slate-100"
            >
              {SORT_OPTIONS.map((opt) => (
                <li key={opt.value} role="presentation">
                  <button
                    type="button"
                    role="option"
                    aria-selected={sort === opt.value}
                    onClick={() => { setSort(opt.value); setOpen(false); }}
                    className={[
                      "flex w-full items-center justify-between px-4 py-3 text-left text-[11px] uppercase tracking-[0.1em] transition-colors duration-150 hover:bg-slate-50",
                      sort === opt.value
                        ? "font-semibold text-[#8A5A6A]"
                        : "font-medium text-slate-600",
                    ].join(" ")}
                  >
                    {opt.label}
                    {sort === opt.value && (
                      <svg width="10" height="8" viewBox="0 0 10 8" fill="none" aria-hidden="true">
                        <path d="M1 4l3 3 5-6" stroke="#8A5A6A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Grid toggle — desktop only */}
        <div
          className="hidden items-center gap-1 md:flex"
          role="group"
          aria-label="Grid layout"
        >
          {([
            { g: "2" as const, Icon: Rows3,      label: "2-column" },
            { g: "3" as const, Icon: LayoutGrid, label: "3-column" },
            { g: "4" as const, Icon: Grid2X2,   label: "4-column" },
          ]).map(({ g, Icon, label }) => (
            <button
              key={g}
              type="button"
              aria-label={`${label} grid`}
              aria-pressed={grid === g}
              onClick={() => setGrid(g)}
              className={[
                "flex h-8 w-8 items-center justify-center border transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A5A6A]",
                grid === g
                  ? "border-[#8A5A6A] bg-[#8A5A6A] text-white"
                  : "border-slate-200 bg-white text-slate-400 hover:border-slate-400 hover:text-slate-600",
              ].join(" ")}
            >
              <Icon size={13} aria-hidden="true" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
