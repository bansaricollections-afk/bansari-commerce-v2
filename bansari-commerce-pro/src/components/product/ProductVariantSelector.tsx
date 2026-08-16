'use client';

import { useState } from 'react';
import type { ProductVariant, SizeAvailability } from '@/types/product';

interface Props {
  variants: ProductVariant[];
  selected: ProductVariant | null;
  onSelect: (variant: ProductVariant) => void;
  /**
   * Size-level inventory. When present it is authoritative: each size carries
   * its own availability and a sold-out size cannot be selected. Absent for
   * products that are not yet size-managed (legacy product-level path).
   */
  sizeAvailability?: SizeAvailability[];
  selectedSize?: SizeAvailability | null;
  onSelectSize?: (size: SizeAvailability) => void;
}

const SIZE_ORDER = ['XXS','XS','S','M','L','XL','XXL','3XL','4XL','Free Size'];

function SizeGuideModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Size Guide"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
    >
      {/* Backdrop */}
      <button
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close size guide"
      />
      {/* Sheet */}
      <div className="relative z-10 bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-sm font-medium text-slate-900 tracking-wide">Size Guide</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-6 py-5 overflow-x-auto">
          <p className="text-xs text-slate-500 mb-4 leading-relaxed">
            Our pieces are crafted with generous sizing. We recommend checking measurements before ordering. All measurements in inches.
          </p>
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200">
                {['Size','Bust','Waist','Hip','Length'].map(h => (
                  <th key={h} className="py-2 pr-4 text-left text-[10px] tracking-[0.15em] uppercase text-slate-400 font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {[
                ['XS','32"','26"','36"','52"'],
                ['S','34"','28"','38"','52"'],
                ['M','36"','30"','40"','53"'],
                ['L','38"','32"','42"','53"'],
                ['XL','40"','34"','44"','54"'],
                ['XXL','42"','36"','46"','54"'],
                ['3XL','44"','38"','48"','55"'],
              ].map(([sz, ...rest]) => (
                <tr key={sz}>
                  <td className="py-2 pr-4 font-semibold text-slate-800">{sz}</td>
                  {rest.map((v, i) => <td key={i} className="py-2 pr-4 text-slate-500">{v}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-[11px] text-slate-400 mt-3">Model wears size S. When in doubt, size up.</p>
        </div>
      </div>
    </div>
  );
}

export default function ProductVariantSelector({
  variants,
  selected,
  onSelect,
  sizeAvailability,
  selectedSize,
  onSelectSize,
}: Props) {
  const [guideOpen, setGuideOpen] = useState(false);

  // ── Size-managed products: one independent inventory unit per size ───────
  if (sizeAvailability && sizeAvailability.length > 0) {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2.5">
          {sizeAvailability.map((s) => {
            const soldOut = s.status === 'SOLD_OUT';
            const isSelected = selectedSize?.variantId === s.variantId;

            return (
              <button
                key={s.variantId}
                type="button"
                onClick={() => !soldOut && onSelectSize?.(s)}
                disabled={soldOut}
                aria-pressed={isSelected}
                aria-label={`Size ${s.label}${soldOut ? ' — sold out' : s.status === 'ONLY_ONE_LEFT' ? ' — only 1 left' : ' — available'}`}
                /* Selected state is brand mauve (#8A5A6A / --bc-brand-mauve),
                   matching every other "chosen" affordance on the storefront.
                   Sharp corners are kept (the brand runs radius 0), as is the
                   heavier selected weight. Sold-out stays a greyed, struck,
                   non-interactive chip so the three states remain distinct at a
                   glance. Availability is still driven entirely by s.status. */
                className={[
                  'relative min-w-[56px] h-[52px] px-4 text-sm tracking-[0.04em] border transition-all duration-150 select-none',
                  isSelected
                    ? 'border-[#8A5A6A] bg-[#8A5A6A] text-white font-semibold'
                    : soldOut
                    ? 'border-slate-200 text-slate-300 cursor-not-allowed bg-slate-50/70 font-normal'
                    : 'border-slate-300 text-slate-800 font-medium hover:border-[#8A5A6A] hover:text-[#8A5A6A] bg-white',
                ].join(' ')}
              >
                {s.label}
                {soldOut && (
                  <span className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
                    <span className="absolute w-[130%] h-px bg-slate-300 rotate-[-20deg]" />
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Per-size truth line — never derived from a product-level total. */}
        <div className="min-h-[18px]">
          {selectedSize ? (
            selectedSize.status === 'ONLY_ONE_LEFT' ? (
              <span className="flex items-center gap-2 text-[12px] font-semibold text-amber-700">
                <span className="relative flex h-2 w-2 flex-shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
                </span>
                Size {selectedSize.label} — only 1 left
              </span>
            ) : selectedSize.status === 'LOW_STOCK' ? (
              <span className="flex items-center gap-2 text-[12px] font-medium text-amber-700">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block flex-shrink-0" />
                Size {selectedSize.label} — only {selectedSize.available} left
              </span>
            ) : (
              <span className="flex items-center gap-2 text-[12px] text-slate-700">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 inline-block flex-shrink-0" />
                Size {selectedSize.label} — in stock
              </span>
            )
          ) : (
            <span className="text-[12px] text-slate-500">Select a size to see availability</span>
          )}
        </div>
      </div>
    );
  }

  const sizes = [
    ...new Set(
      variants
        .map((v) => v.size)
        .filter(Boolean) as string[]
    ),
  ].sort((a, b) => {
    const ai = SIZE_ORDER.indexOf(a);
    const bi = SIZE_ORDER.indexOf(b);
    if (ai === -1 && bi === -1) return a.localeCompare(b);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });

  const colors = [...new Set(variants.map((v) => v.color).filter(Boolean))] as string[];
  const hasMultipleColors = colors.length > 1;

  return (
    <>
      {guideOpen && <SizeGuideModal onClose={() => setGuideOpen(false)} />}

      <div className="flex flex-col gap-5">
        {/* ── Size selector ── */}
        {sizes.length > 0 && (
          <div className="flex flex-col gap-3">
            {/* Header row */}
            <div className="flex items-center justify-between">
              <p className="text-[10px] tracking-[0.2em] uppercase text-slate-500 font-medium">
                Size
                {selected?.size ? (
                  <span className="ml-2 text-[#8A5A6A] normal-case tracking-normal font-semibold">
                    {selected.size}
                  </span>
                ) : (
                  <span className="ml-2 text-slate-400 normal-case tracking-normal font-normal italic">
                    — Select your size
                  </span>
                )}
              </p>
              <button
                type="button"
                onClick={() => setGuideOpen(true)}
                className="text-[10px] tracking-[0.12em] uppercase text-[#8A5A6A] underline underline-offset-2 hover:no-underline transition-all"
              >
                Size Guide
              </button>
            </div>

            {/* Size buttons */}
            <div className="flex flex-wrap gap-2">
              {sizes.map((size) => {
                const sizeVariant = variants.find(
                  (v) => v.size === size && (!selected?.color || v.color === selected.color)
                );
                const isSelected = selected?.size === size;
                const isUnavailable = sizeVariant ? (sizeVariant.stock ?? 1) === 0 : false;

                return (
                  <button
                    key={size}
                    type="button"
                    onClick={() => sizeVariant && !isUnavailable && onSelect(sizeVariant)}
                    disabled={isUnavailable}
                    aria-pressed={isSelected}
                    aria-label={`Size ${size}${isUnavailable ? ' — unavailable' : ''}`}
                    className={[
                      'relative min-w-[56px] h-[52px] px-4 text-sm tracking-[0.04em] border transition-all duration-150 select-none',
                      isSelected
                        ? 'border-[#8A5A6A] bg-[#8A5A6A] text-white font-semibold'
                        : isUnavailable
                        ? 'border-slate-200 text-slate-300 cursor-not-allowed bg-slate-50/70 font-normal'
                        : 'border-slate-300 text-slate-800 font-medium hover:border-[#8A5A6A] hover:text-[#8A5A6A] bg-white',
                    ].join(' ')}
                  >
                    {size}
                    {isUnavailable && (
                      <span className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
                        <span className="absolute w-[130%] h-px bg-slate-300 rotate-[-20deg]" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Colour selector ── */}
        {hasMultipleColors && (
          <div className="flex flex-col gap-3">
            <p className="text-[10px] tracking-[0.2em] uppercase text-slate-500 font-medium">
              Colour
              {selected?.color && (
                <span className="ml-2 text-[#8A5A6A] normal-case tracking-normal font-semibold">
                  {selected.color}
                </span>
              )}
            </p>
            <div className="flex flex-wrap gap-2">
              {colors.map((color) => {
                const cv = variants.find((v) => v.color === color);
                const isSelected = selected?.color === color;
                return (
                  <button
                    key={color}
                    type="button"
                    onClick={() => cv && onSelect(cv)}
                    aria-pressed={isSelected}
                    aria-label={`Colour: ${color}`}
                    className={[
                      'h-12 px-4 text-sm border transition-all duration-150',
                      /* Colour keeps its lighter mauve-tint treatment rather
                         than a solid fill, so a chosen colour never competes
                         with the chosen size directly above it. */
                      isSelected
                        ? 'border-[#8A5A6A] bg-[#8A5A6A]/[0.06] text-[#8A5A6A] font-medium'
                        : 'border-slate-300 text-slate-800 hover:border-[#8A5A6A] hover:text-[#8A5A6A] bg-white',
                    ].join(' ')}
                  >
                    {color}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
