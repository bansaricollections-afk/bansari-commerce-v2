"use client";

import { useState, useCallback } from "react";
import { ChevronDown, X } from "lucide-react";

const CATEGORIES = ["Kurta Sets", "Ethnic Dresses", "Sarees", "Lehengas", "Co-ord Sets", "Gowns"];
const OCCASIONS  = ["Wedding", "Festive", "Office", "Party", "Travel", "Casual"];
const FABRICS    = ["Cotton", "Silk", "Rayon", "Georgette", "Organza", "Chiffon"];
const SIZES      = ["XS", "S", "M", "L", "XL", "XXL"];
const COLORS: { hex: string; label: string }[] = [
  { hex: "#FFFFFF", label: "White" },
  { hex: "#1C1917", label: "Black" },
  { hex: "#C2344E", label: "Red" },
  { hex: "#E8A0B4", label: "Pink" },
  { hex: "#4A7C59", label: "Green" },
  { hex: "#3D5A80", label: "Navy" },
  { hex: "#C9A84C", label: "Gold" },
  { hex: "#7B52A6", label: "Purple" },
  { hex: "#D97941", label: "Orange" },
  { hex: "#8A5A6A", label: "Mauve" },
];

type FilterState = {
  categories: string[];
  occasions: string[];
  fabrics: string[];
  sizes: string[];
  colors: string[];
  priceMin: number;
  priceMax: number;
};

const INITIAL: FilterState = {
  categories: [],
  occasions: [],
  fabrics: [],
  sizes: [],
  colors: [],
  priceMin: 499,
  priceMax: 29999,
};

function AccordionSection({
  title,
  count,
  defaultOpen = false,
  children,
}: {
  title: string;
  count?: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-slate-100">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between py-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A5A6A] focus-visible:ring-inset"
      >
        <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-700">
          {title}
          {count !== undefined && count > 0 && (
            <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#8A5A6A] px-1 text-[9px] font-bold text-white">
              {count}
            </span>
          )}
        </span>
        <ChevronDown
          size={13}
          className={`text-slate-300 transition-transform duration-300 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      <div
        className="overflow-hidden transition-all duration-300 ease-in-out"
        style={{ maxHeight: open ? "600px" : "0px", opacity: open ? 1 : 0 }}
      >
        <div className="pb-5">{children}</div>
      </div>
    </div>
  );
}

export default function FilterSidebar() {
  const [filters, setFilters] = useState<FilterState>(INITIAL);

  const toggle = useCallback(
    (key: keyof Pick<FilterState, "categories" | "occasions" | "fabrics" | "sizes" | "colors">, val: string) => {
      setFilters((prev) => {
        const arr = prev[key] as string[];
        return {
          ...prev,
          [key]: arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val],
        };
      });
    },
    []
  );

  const clearAll = useCallback(() => setFilters(INITIAL), []);

  const totalActive =
    filters.categories.length +
    filters.occasions.length +
    filters.fabrics.length +
    filters.sizes.length +
    filters.colors.length +
    (filters.priceMin !== INITIAL.priceMin || filters.priceMax !== INITIAL.priceMax ? 1 : 0);

  return (
    <aside
      className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto bg-white"
      aria-label="Product filters"
    >
      {/* Sidebar header */}
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <span className="flex items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-900">
            Filters
          </span>
          {totalActive > 0 && (
            <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#8A5A6A] px-1.5 text-[9px] font-bold text-white">
              {totalActive}
            </span>
          )}
        </span>
        {totalActive > 0 && (
          <button
            type="button"
            onClick={clearAll}
            className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#8A5A6A] transition-colors duration-200 hover:text-slate-900 focus-visible:outline-none"
          >
            <X size={11} aria-hidden="true" /> Clear all
          </button>
        )}
      </div>

      <div className="px-5">
        {/* Category */}
        <AccordionSection title="Category" count={filters.categories.length} defaultOpen>
          <div className="space-y-2.5">
            {CATEGORIES.map((c) => (
              <label key={c} className="flex cursor-pointer items-center gap-3 group/item">
                <span
                  className={[
                    "flex h-4 w-4 shrink-0 items-center justify-center border transition-all duration-150",
                    filters.categories.includes(c)
                      ? "border-[#8A5A6A] bg-[#8A5A6A]"
                      : "border-slate-200 bg-white group-hover/item:border-slate-400",
                  ].join(" ")}
                  aria-hidden="true"
                >
                  {filters.categories.includes(c) && (
                    <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                      <path d="M1 3l2 2 4-4" stroke="white" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </span>
                <input
                  type="checkbox"
                  checked={filters.categories.includes(c)}
                  onChange={() => toggle("categories", c)}
                  className="sr-only"
                />
                <span className="text-[12px] text-slate-600">{c}</span>
              </label>
            ))}
          </div>
        </AccordionSection>

        {/* Occasion */}
        <AccordionSection title="Occasion" count={filters.occasions.length} defaultOpen>
          <div className="space-y-2.5">
            {OCCASIONS.map((o) => (
              <label key={o} className="flex cursor-pointer items-center gap-3 group/item">
                <span
                  className={[
                    "flex h-4 w-4 shrink-0 items-center justify-center border transition-all duration-150",
                    filters.occasions.includes(o)
                      ? "border-[#8A5A6A] bg-[#8A5A6A]"
                      : "border-slate-200 bg-white group-hover/item:border-slate-400",
                  ].join(" ")}
                  aria-hidden="true"
                >
                  {filters.occasions.includes(o) && (
                    <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                      <path d="M1 3l2 2 4-4" stroke="white" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </span>
                <input
                  type="checkbox"
                  checked={filters.occasions.includes(o)}
                  onChange={() => toggle("occasions", o)}
                  className="sr-only"
                />
                <span className="text-[12px] text-slate-600">{o}</span>
              </label>
            ))}
          </div>
        </AccordionSection>

        {/* Fabric */}
        <AccordionSection title="Fabric" count={filters.fabrics.length}>
          <div className="space-y-2.5">
            {FABRICS.map((f) => (
              <label key={f} className="flex cursor-pointer items-center gap-3 group/item">
                <span
                  className={[
                    "flex h-4 w-4 shrink-0 items-center justify-center border transition-all duration-150",
                    filters.fabrics.includes(f)
                      ? "border-[#8A5A6A] bg-[#8A5A6A]"
                      : "border-slate-200 bg-white group-hover/item:border-slate-400",
                  ].join(" ")}
                  aria-hidden="true"
                >
                  {filters.fabrics.includes(f) && (
                    <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                      <path d="M1 3l2 2 4-4" stroke="white" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </span>
                <input
                  type="checkbox"
                  checked={filters.fabrics.includes(f)}
                  onChange={() => toggle("fabrics", f)}
                  className="sr-only"
                />
                <span className="text-[12px] text-slate-600">{f}</span>
              </label>
            ))}
          </div>
        </AccordionSection>

        {/* Size chips */}
        <AccordionSection title="Size" count={filters.sizes.length}>
          <div className="flex flex-wrap gap-2">
            {SIZES.map((s) => {
              const active = filters.sizes.includes(s);
              return (
                <button
                  key={s}
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggle("sizes", s)}
                  className={[
                    "flex h-9 w-11 items-center justify-center border text-[11px] font-semibold tracking-wider transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A5A6A]",
                    active
                      ? "border-[#8A5A6A] bg-[#8A5A6A] text-white"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-400",
                  ].join(" ")}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </AccordionSection>

        {/* Colour swatches */}
        <AccordionSection title="Colour" count={filters.colors.length}>
          <div className="flex flex-wrap gap-2.5">
            {COLORS.map(({ hex, label }) => {
              const active = filters.colors.includes(hex);
              return (
                <button
                  key={hex}
                  type="button"
                  aria-label={label}
                  aria-pressed={active}
                  onClick={() => toggle("colors", hex)}
                  title={label}
                  className={[
                    "relative h-7 w-7 rounded-full border-2 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A5A6A] focus-visible:ring-offset-1",
                    active ? "scale-110 border-[#8A5A6A]" : "border-slate-200 hover:scale-105",
                  ].join(" ")}
                  style={{ backgroundColor: hex }}
                >
                  {hex === "#FFFFFF" && (
                    <span className="absolute inset-0 rounded-full border border-slate-200" />
                  )}
                  {active && (
                    <span className="absolute inset-0 flex items-center justify-center rounded-full">
                      <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                        <path
                          d="M1 3l2 2 4-4"
                          stroke={hex === "#FFFFFF" || hex === "#C9A84C" ? "#1C1917" : "white"}
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </AccordionSection>

        {/* Price Range */}
        <AccordionSection title="Price Range">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-700">
                ₹{filters.priceMin.toLocaleString("en-IN")}
              </span>
              <span className="text-[11px] font-semibold text-slate-700">
                ₹{filters.priceMax.toLocaleString("en-IN")}
              </span>
            </div>
            <div className="relative h-1 rounded-full bg-slate-100">
              <div
                className="absolute h-full rounded-full bg-[#8A5A6A]"
                style={{
                  left: `${((filters.priceMin - 499) / (29999 - 499)) * 100}%`,
                  right: `${100 - ((filters.priceMax - 499) / (29999 - 499)) * 100}%`,
                }}
                aria-hidden="true"
              />
            </div>
            <input
              type="range"
              min={499}
              max={29999}
              step={500}
              value={filters.priceMax}
              onChange={(e) =>
                setFilters((p) => ({ ...p, priceMax: Number(e.target.value) }))
              }
              className="w-full accent-[#8A5A6A]"
              aria-label="Maximum price"
            />
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="mb-1 block text-[9px] uppercase tracking-widest text-slate-400">Min</label>
                <input
                  type="number"
                  min={499}
                  max={filters.priceMax}
                  value={filters.priceMin}
                  onChange={(e) =>
                    setFilters((p) => ({ ...p, priceMin: Number(e.target.value) }))
                  }
                  className="w-full border border-slate-200 px-2 py-1.5 text-[11px] text-slate-700 focus:border-[#8A5A6A] focus:outline-none"
                  aria-label="Minimum price"
                />
              </div>
              <div className="flex-1">
                <label className="mb-1 block text-[9px] uppercase tracking-widest text-slate-400">Max</label>
                <input
                  type="number"
                  min={filters.priceMin}
                  max={29999}
                  value={filters.priceMax}
                  onChange={(e) =>
                    setFilters((p) => ({ ...p, priceMax: Number(e.target.value) }))
                  }
                  className="w-full border border-slate-200 px-2 py-1.5 text-[11px] text-slate-700 focus:border-[#8A5A6A] focus:outline-none"
                  aria-label="Maximum price"
                />
              </div>
            </div>
          </div>
        </AccordionSection>

        {/* Availability */}
        <AccordionSection title="Availability">
          <div className="space-y-2.5">
            {["In Stock", "On Sale", "New Arrivals"].map((v) => (
              <label key={v} className="flex cursor-pointer items-center gap-3 group/item">
                <span
                  className="flex h-4 w-4 shrink-0 items-center justify-center border border-slate-200 bg-white transition-all duration-150 group-hover/item:border-slate-400"
                  aria-hidden="true"
                />
                <input type="checkbox" className="sr-only" />
                <span className="text-[12px] text-slate-600">{v}</span>
              </label>
            ))}
          </div>
        </AccordionSection>
      </div>
    </aside>
  );
}
