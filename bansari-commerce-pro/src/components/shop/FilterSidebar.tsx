"use client";

import { useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { ChevronDown, SlidersHorizontal, X } from "lucide-react";

// ─── Static option lists ─────────────────────────────────────────────────────

const CATEGORIES = ["Kurta Sets", "Ethnic Dresses", "Sarees", "Lehengas", "Co-ord Sets", "Gowns"];
const OCCASIONS  = ["Wedding", "Festive", "Office", "Party", "Travel", "Casual"];
const FABRICS    = ["Cotton", "Silk", "Rayon", "Georgette", "Organza", "Chiffon", "Crepe", "Linen"];
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
const AVAILABILITY_OPTIONS = [
  { label: "In Stock",     value: "in_stock" },
  { label: "Out of Stock", value: "out_of_stock" },
  { label: "New Arrival",  value: "new_arrival" },
];

// ─── Shared URL-builder ───────────────────────────────────────────────────────

function useFilterUrl() {
  const router   = useRouter();
  const pathname = usePathname();
  const params   = useSearchParams();

  const build = useCallback(
    (key: string, value: string | null) => {
      const next = new URLSearchParams(params.toString());
      if (value === null || value === "") {
        next.delete(key);
      } else {
        next.set(key, value);
      }
      if (key !== "page") next.set("page", "1");
      return `${pathname}?${next.toString()}`;
    },
    [params, pathname]
  );

  const navigate = useCallback(
    (key: string, value: string | null) => {
      router.replace(build(key, value), { scroll: false });
    },
    [router, build]
  );

  return { params, navigate, build };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Checkbox({
  checked, onChange, label,
}: {
  checked: boolean; onChange: () => void; label: string;
}) {
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
  // Accordion open/close is purely visual — local useState is correct here
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

// ─── Core sidebar implementation ──────────────────────────────────────────────

function FilterSidebarInner() {
  const { params, navigate } = useFilterUrl();

  const category     = params.get("category")     ?? "";
  const occasion     = params.get("occasion")     ?? "";
  const fabric       = params.get("fabric")       ?? "";
  const size         = params.get("size")         ?? "";
  const color        = params.get("color")        ?? "";
  const availability = params.get("availability") ?? "";
  const priceMin     = params.get("priceMin")     ?? "";
  const priceMax     = params.get("priceMax")     ?? "";

  const totalActive = [
    category, occasion, fabric, size, color, availability, priceMin, priceMax,
  ].filter(Boolean).length;

  const clearAll = useCallback(() => {
    const next = new URLSearchParams();
    const sort = params.get("sort");
    if (sort) next.set("sort", sort);
    next.set("page", "1");
    window.location.href = `${window.location.pathname}?${next.toString()}`;
  }, [params]);

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

      {/* Category */}
      <AccordionSection title="Category" count={category ? 1 : 0} defaultOpen>
        <div className="space-y-1.5">
          {CATEGORIES.map((c) => (
            <Checkbox
              key={c} label={c}
              checked={category === c}
              onChange={() => navigate("category", category === c ? null : c)}
            />
          ))}
        </div>
      </AccordionSection>

      {/* Occasion */}
      <AccordionSection title="Occasion" count={occasion ? 1 : 0} defaultOpen>
        <div className="space-y-1.5">
          {OCCASIONS.map((o) => (
            <Checkbox
              key={o} label={o}
              checked={occasion === o}
              onChange={() => navigate("occasion", occasion === o ? null : o)}
            />
          ))}
        </div>
      </AccordionSection>

      {/* Fabric */}
      <AccordionSection title="Fabric" count={fabric ? 1 : 0}>
        <div className="space-y-1.5">
          {FABRICS.map((f) => (
            <Checkbox
              key={f} label={f}
              checked={fabric === f}
              onChange={() => navigate("fabric", fabric === f ? null : f)}
            />
          ))}
        </div>
      </AccordionSection>

      {/* Size chips */}
      <AccordionSection title="Size" count={size ? 1 : 0}>
        <div className="flex flex-wrap gap-1.5">
          {SIZES.map((s) => {
            const active = size === s;
            return (
              <button
                key={s} type="button"
                aria-pressed={active}
                onClick={() => navigate("size", active ? null : s)}
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
      <AccordionSection title="Colour" count={color ? 1 : 0}>
        <div className="flex flex-wrap gap-2">
          {COLORS.map(({ hex, label }) => {
            const active = color === hex;
            const lightBg = ["#FFFFFF", "#C9A84C", "#E8A0B4", "#B5A09A"].includes(hex);
            return (
              <button
                key={hex} type="button"
                aria-label={label} aria-pressed={active} title={label}
                onClick={() => navigate("color", active ? null : hex)}
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
                      <path
                        d="M1 3l2 2 4-4"
                        stroke={lightBg ? "#1C1917" : "white"}
                        strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
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
      <AccordionSection title="Price Range" count={priceMin || priceMax ? 1 : 0}>
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="mb-1 block text-[9px] uppercase tracking-widest text-slate-400">Min (₹)</label>
            <input
              type="number" min={0} placeholder="499"
              value={priceMin}
              onChange={(e) => navigate("priceMin", e.target.value || null)}
              className="w-full border border-slate-200 px-2 py-1.5 text-[11px] text-slate-700 focus:border-[#8A5A6A] focus:outline-none"
              aria-label="Minimum price"
            />
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-[9px] uppercase tracking-widest text-slate-400">Max (₹)</label>
            <input
              type="number" min={0} placeholder="29999"
              value={priceMax}
              onChange={(e) => navigate("priceMax", e.target.value || null)}
              className="w-full border border-slate-200 px-2 py-1.5 text-[11px] text-slate-700 focus:border-[#8A5A6A] focus:outline-none"
              aria-label="Maximum price"
            />
          </div>
        </div>
      </AccordionSection>

      {/* Availability */}
      <AccordionSection title="Availability" count={availability ? 1 : 0}>
        <div className="space-y-1.5">
          {AVAILABILITY_OPTIONS.map(({ label, value }) => (
            <Checkbox
              key={value} label={label}
              checked={availability === value}
              onChange={() => navigate("availability", availability === value ? null : value)}
            />
          ))}
        </div>
      </AccordionSection>
    </aside>
  );
}

// ─── Public export — wrapped in Suspense for useSearchParams ──────────────────
export default function FilterSidebar() {
  return (
    <Suspense fallback={<div className="w-[260px]" />}>
      <FilterSidebarInner />
    </Suspense>
  );
}
