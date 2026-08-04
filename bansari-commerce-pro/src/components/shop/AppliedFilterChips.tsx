"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { X } from "lucide-react";
import { Suspense, useCallback } from "react";

// Human-readable labels for URL param keys and values
const KEY_LABELS: Record<string, string> = {
  category:     "Category",
  occasion:     "Occasion",
  fabric:       "Fabric",
  size:         "Size",
  color:        "Colour",
  availability: "Availability",
  priceMin:     "Min Price",
  priceMax:     "Max Price",
  collection:   "Collection",
};

const AVAILABILITY_LABELS: Record<string, string> = {
  in_stock:    "In Stock",
  out_of_stock: "Out of Stock",
  new_arrival: "New Arrival",
};

const FILTER_KEYS = Object.keys(KEY_LABELS);

function valueLabel(key: string, value: string): string {
  if (key === "availability") return AVAILABILITY_LABELS[value] ?? value;
  if (key === "priceMin") return `From ₹${Number(value).toLocaleString("en-IN")}`;
  if (key === "priceMax") return `Up to ₹${Number(value).toLocaleString("en-IN")}`;
  if (key === "color") {
    // Show swatch inline — label is handled by the chip element itself
    return value;
  }
  return value;
}

const COLOR_LABELS: Record<string, string> = {
  "#FFFFFF": "White", "#1C1917": "Black", "#C2344E": "Red",
  "#E8A0B4": "Pink",  "#4A7C59": "Green", "#3D5A80": "Navy",
  "#C9A84C": "Gold",  "#7B52A6": "Purple", "#D97941": "Orange",
  "#8A5A6A": "Mauve", "#B5A09A": "Beige",  "#6B7280": "Grey",
};

function AppliedFilterChipsInner() {
  const router   = useRouter();
  const pathname = usePathname();
  const params   = useSearchParams();

  // Collect active filter chips
  const chips: { key: string; value: string; displayKey: string; displayVal: string }[] = [];
  FILTER_KEYS.forEach((key) => {
    const value = params.get(key);
    if (!value) return;
    chips.push({
      key,
      value,
      displayKey: KEY_LABELS[key],
      displayVal: key === "color" ? (COLOR_LABELS[value] ?? value) : valueLabel(key, value),
    });
  });

  const removeFilter = useCallback(
    (key: string) => {
      const next = new URLSearchParams(params.toString());
      next.delete(key);
      next.set("page", "1");
      router.replace(`${pathname}?${next.toString()}`, { scroll: false });
    },
    [params, pathname, router]
  );

  const clearAll = useCallback(() => {
    const next = new URLSearchParams();
    const sort = params.get("sort");
    if (sort) next.set("sort", sort);
    next.set("page", "1");
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  }, [params, pathname, router]);

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 py-3" role="group" aria-label="Active filters">
      {chips.map(({ key, value, displayKey, displayVal }) => (
        <span
          key={key}
          className="flex items-center gap-1.5 rounded-full border border-[#8A5A6A]/30 bg-[#8A5A6A]/5 px-3 py-1 text-[11px] font-medium text-slate-700"
        >
          {key === "color" && (
            <span
              className="inline-block h-3 w-3 rounded-full border border-slate-300"
              style={{ backgroundColor: value }}
              aria-hidden="true"
            />
          )}
          <span className="text-slate-400">{displayKey}:</span>
          <span>{displayVal}</span>
          <button
            type="button"
            aria-label={`Remove ${displayKey} filter`}
            onClick={() => removeFilter(key)}
            className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-[#8A5A6A]/10 hover:text-[#8A5A6A] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#8A5A6A]"
          >
            <X size={9} aria-hidden="true" />
          </button>
        </span>
      ))}

      {chips.length > 1 && (
        <button
          type="button"
          onClick={clearAll}
          className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#8A5A6A] underline-offset-2 transition-colors hover:text-slate-900 hover:underline focus-visible:outline-none"
        >
          Clear all
        </button>
      )}
    </div>
  );
}

export default function AppliedFilterChips() {
  return (
    <Suspense fallback={null}>
      <AppliedFilterChipsInner />
    </Suspense>
  );
}
