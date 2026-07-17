"use client";

import { useState, useCallback } from "react";
import { ChevronDown, X, SlidersHorizontal } from "lucide-react";

const CATEGORIES = ["Kurta Sets", "Ethnic Dresses", "Sarees", "Lehengas", "Co-ord Sets", "Gowns"];
const OCCASIONS  = ["Wedding", "Festive", "Office", "Party", "Travel", "Casual"];
const FABRICS    = ["Cotton", "Silk", "Rayon", "Georgette", "Organza", "Chiffon", "Crepe", "Linen"];
const SLEEVES    = ["Sleeveless", "Half Sleeve", "Full Sleeve", "Puff Sleeve", "Bell Sleeve"];
const NECK_TYPES = ["Round Neck", "V-Neck", "Boat Neck", "Collar", "Halter", "Square Neck"];
const FIT_TYPES  = ["Regular", "Slim Fit", "Relaxed", "Flared", "Straight"];
const SIZES      = ["XS", "S", "M", "L", "XL", "XXL", "3XL"];
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
  { hex: "#B5A09A", label: "Beige" },
  { hex: "#6B7280", label: "Grey" },
];
const AVAILABILITY = ["In Stock", "On Sale", "New Arrivals", "Limited Edition"];
const DISCOUNT_RANGES = ["10% and above", "20% and above", "30% and above", "50% and above"];

type FilterState = {
  categories: string[];
  occasions: string[];
  fabrics: string[];
  sleeves: string[];
  neck: string[];
  fit: string[];
  sizes: string[];
  colors: string[];
  availability: string[];
  discount: string[];
  priceMin: number;
  priceMax: number;
};

const INITIAL: FilterState = {
  categories: [], occasions: [], fabrics: [],
  sleeves: [], neck: [], fit: [],
  sizes: [], colors: [],
  availability: [], discount: [],
  priceMin: 499, priceMax: 29999,
};

function Checkbox({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <label className="group/item flex cursor-pointer items-center gap-3 py-0.5">
      <span
        className={[
          "flex h-[15px] w-[15px] shrink-0 items-center justify-center border transition-all duration-150",
          checked
            ? "border-[#8A5A6A] bg-[#8A5A6A]"
            : "border-slate-200 bg-white group-hover/item:border-[#8A5A6A]/50",
        ].join(" ")}
        aria-hidden="true"
      >
        {checked && (
          <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
            <path d="M1 3l2 2 4-4" stroke="white" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      <input type="checkbox" checked={checked} onChange={onChange} className="sr-only" />
      <span className="text-[12px] leading-relaxed text-slate-600 transition-colors duration-150 group-hover/item:text-slate-900">
        {label}
      </span>
    </label>
  );
}

function AccordionSection({
  title, count, defaultOpen = false, children,
}: {
  title: string; count?: number; defaultOpen?: boolean; children: React.ReactNode;
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
        <span className="flex items-center gap-2">
          <span className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-slate-700">
            {title}
          </span>
          {count !== undefined && count > 0 && (
            <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#8A5A6A] px-1 text-[9px] font-bold text-white">
              {count}
            </span>
          )}
        </span>
        <ChevronDown
          size={12}
          className={`text-slate-300 transition-transform duration-300 ${open ? "rotate-180" : ""}`}
        />
      </button>
      <div
        className="overflow-hidden transition-all duration-300 ease-in-out"
        style={{ maxHeight: open ? "800px" : "0px", opacity: open ? 1 : 0 }}
      >
        <div className="pb-5">{children}</div>
      </div>
    </div>
  );
}

export default function FilterSidebar() {
  const [filters, setFilters] = useState<FilterState>(INITIAL);

  const toggle = useCallback(
    (key: keyof Pick<FilterState, "categories" | "occasions" | "fabrics" | "sleeves" | "neck" | "fit" | "sizes" | "colors" | "availability" | "discount">, val: string) => {
      setFilters((prev) => {
        const arr = prev[key] as string[];
        return { ...prev, [key]: arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val] };
      });
    },
    []
  );

  const clearAll = useCallback(() => setFilters(INITIAL), []);

  const totalActive =
    filters.categories.length + filters.occasions.length + filters.fabrics.length +
    filters.sleeves.length + filters.neck.length + filters.fit.length +
    filters.sizes.length + filters.colors.length + filters.availability.length +
    filters.discount.length +
    (filters.priceMin !== INITIAL.priceMin || filters.priceMax !== INITIAL.priceMax ? 1 : 0);

  return (
    <aside
      className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto bg-white [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      aria-label="Product filters"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 py-4">
        <span className="flex items-center gap-2">
          <SlidersHorizontal size={13} className="text-slate-400" aria-hidden="true" />
          <span className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-slate-900">Filters</span>
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
            <X size={10} aria-hidden="true" /> Clear all
          </button>
        )}
      </div>

      {/* All sections */}
      <AccordionSection title="Category" count={filters.categories.length} defaultOpen>
        <div className="space-y-1.5">
          {CATEGORIES.map((c) => <Checkbox key={c} label={c} checked={filters.categories.includes(c)} onChange={() => toggle("categories", c)} />)}
        </div>
      </AccordionSection>

      <AccordionSection title="Occasion" count={filters.occasions.length} defaultOpen>
        <div className="space-y-1.5">
          {OCCASIONS.map((o) => <Checkbox key={o} label={o} checked={filters.occasions.includes(o)} onChange={() => toggle("occasions", o)} />)}
        </div>
      </AccordionSection>

      <AccordionSection title="Fabric" count={filters.fabrics.length}>
        <div className="space-y-1.5">
          {FABRICS.map((f) => <Checkbox key={f} label={f} checked={filters.fabrics.includes(f)} onChange={() => toggle("fabrics", f)} />)}
        </div>
      </AccordionSection>

      <AccordionSection title="Sleeve" count={filters.sleeves.length}>
        <div className="space-y-1.5">
          {SLEEVES.map((s) => <Checkbox key={s} label={s} checked={filters.sleeves.includes(s)} onChange={() => toggle("sleeves", s)} />)}
        </div>
      </AccordionSection>

      <AccordionSection title="Neck Type" count={filters.neck.length}>
        <div className="space-y-1.5">
          {NECK_TYPES.map((n) => <Checkbox key={n} label={n} checked={filters.neck.includes(n)} onChange={() => toggle("neck", n)} />)}
        </div>
      </AccordionSection>

      <AccordionSection title="Fit" count={filters.fit.length}>
        <div className="space-y-1.5">
          {FIT_TYPES.map((f) => <Checkbox key={f} label={f} checked={filters.fit.includes(f)} onChange={() => toggle("fit", f)} />)}
        </div>
      </AccordionSection>

      {/* Size chips */}
      <AccordionSection title="Size" count={filters.sizes.length}>
        <div className="flex flex-wrap gap-1.5">
          {SIZES.map((s) => {
            const active = filters.sizes.includes(s);
            return (
              <button
                key={s}
                type="button"
                aria-pressed={active}
                onClick={() => toggle("sizes", s)}
                className={[
                  "flex h-9 min-w-[40px] items-center justify-center border px-2 text-[11px] font-semibold tracking-wide transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A5A6A]",
                  active ? "border-[#8A5A6A] bg-[#8A5A6A] text-white" : "border-slate-200 bg-white text-slate-600 hover:border-slate-900",
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
        <div className="flex flex-wrap gap-2">
          {COLORS.map(({ hex, label }) => {
            const active = filters.colors.includes(hex);
            const lightBg = ["#FFFFFF", "#C9A84C", "#E8A0B4", "#B5A09A"].includes(hex);
            return (
              <button
                key={hex}
                type="button"
                aria-label={label}
                aria-pressed={active}
                title={label}
                onClick={() => toggle("colors", hex)}
                className={[
                  "relative h-7 w-7 rounded-full border-2 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A5A6A] focus-visible:ring-offset-1",
                  active ? "scale-110 border-[#8A5A6A] shadow-sm" : "border-slate-200 hover:scale-110 hover:border-slate-400",
                ].join(" ")}
                style={{ backgroundColor: hex }}
              >
                {hex === "#FFFFFF" && <span className="absolute inset-0 rounded-full border border-slate-200" />}
                {active && (
                  <span className="absolute inset-0 flex items-center justify-center rounded-full">
                    <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                      <path d="M1 3l2 2 4-4" stroke={lightBg ? "#1C1917" : "white"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </AccordionSection>

      {/* Price range */}
      <AccordionSection title="Price Range">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-700">₹{filters.priceMin.toLocaleString("en-IN")}</span>
            <span className="text-[11px] font-semibold text-slate-700">₹{filters.priceMax.toLocaleString("en-IN")}</span>
          </div>
          <div className="relative h-1 rounded-full bg-slate-100" aria-hidden="true">
            <div
              className="absolute h-full rounded-full bg-[#8A5A6A]"
              style={{
                left: `${((filters.priceMin - 499) / (29999 - 499)) * 100}%`,
                right: `${100 - ((filters.priceMax - 499) / (29999 - 499)) * 100}%`,
              }}
            />
          </div>
          <input
            type="range" min={499} max={29999} step={500}
            value={filters.priceMax}
            onChange={(e) => setFilters((p) => ({ ...p, priceMax: Number(e.target.value) }))}
            className="w-full accent-[#8A5A6A]"
            aria-label="Maximum price"
          />
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="mb-1 block text-[9px] uppercase tracking-widest text-slate-400">Min</label>
              <input
                type="number" min={499} max={filters.priceMax} value={filters.priceMin}
                onChange={(e) => setFilters((p) => ({ ...p, priceMin: Number(e.target.value) }))}
                className="w-full border border-slate-200 px-2 py-1.5 text-[11px] text-slate-700 focus:border-[#8A5A6A] focus:outline-none"
                aria-label="Minimum price"
              />
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-[9px] uppercase tracking-widest text-slate-400">Max</label>
              <input
                type="number" min={filters.priceMin} max={29999} value={filters.priceMax}
                onChange={(e) => setFilters((p) => ({ ...p, priceMax: Number(e.target.value) }))}
                className="w-full border border-slate-200 px-2 py-1.5 text-[11px] text-slate-700 focus:border-[#8A5A6A] focus:outline-none"
                aria-label="Maximum price"
              />
            </div>
          </div>
        </div>
      </AccordionSection>

      {/* Availability */}
      <AccordionSection title="Availability" count={filters.availability.length}>
        <div className="space-y-1.5">
          {AVAILABILITY.map((v) => (
            <Checkbox key={v} label={v} checked={filters.availability.includes(v)} onChange={() => toggle("availability", v)} />
          ))}
        </div>
      </AccordionSection>

      {/* Discount */}
      <AccordionSection title="Discount" count={filters.discount.length}>
        <div className="space-y-1.5">
          {DISCOUNT_RANGES.map((d) => (
            <Checkbox key={d} label={d} checked={filters.discount.includes(d)} onChange={() => toggle("discount", d)} />
          ))}
        </div>
      </AccordionSection>
    </aside>
  );
}