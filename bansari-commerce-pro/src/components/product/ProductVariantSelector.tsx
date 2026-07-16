'use client';

import type { ProductVariant } from '@/types/product';

interface Props {
  variants: ProductVariant[];
  selected: ProductVariant | null;
  onSelect: (variant: ProductVariant) => void;
}

export default function ProductVariantSelector({ variants, selected, onSelect }: Props) {
  const sizes = [...new Set(variants.map((v) => v.size).filter(Boolean))];
  const colors = [...new Set(variants.map((v) => v.color).filter(Boolean))];
  const hasMultipleColors = colors.length > 1;

  return (
    <div className="flex flex-col gap-5">
      {/* Size selector */}
      {sizes.length > 0 && (
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <label className="text-[11px] tracking-[0.15em] uppercase text-slate-500 font-medium">
              Size
              {selected?.size && (
                <span className="ml-2 text-slate-700 normal-case tracking-normal font-normal">
                  — {selected.size}
                </span>
              )}
            </label>
            <button className="text-[10px] tracking-[0.12em] uppercase text-[#8A5A6A] underline underline-offset-2 hover:no-underline transition-all">
              Size Guide
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {sizes.map((size) => {
              const sizeVariant = variants.find((v) => v.size === size && (!selected?.color || v.color === selected.color));
              const isSelected = selected?.size === size;
              const isUnavailable = sizeVariant ? sizeVariant.stock === 0 : false;
              return (
                <button
                  key={size}
                  onClick={() => sizeVariant && onSelect(sizeVariant)}
                  disabled={isUnavailable}
                  aria-pressed={isSelected}
                  aria-label={`Size ${size}${isUnavailable ? ', unavailable' : ''}`}
                  className={`min-w-[44px] h-11 px-4 text-sm border rounded-sm transition-all duration-200 relative ${
                    isSelected
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : isUnavailable
                      ? 'border-slate-200 text-slate-300 cursor-not-allowed bg-slate-50'
                      : 'border-slate-200 text-slate-700 hover:border-slate-400'
                  }`}
                >
                  {size}
                  {isUnavailable && (
                    <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <span className="absolute w-full h-[1px] bg-slate-300 rotate-45 origin-center" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Color selector */}
      {hasMultipleColors && (
        <div className="flex flex-col gap-2.5">
          <label className="text-[11px] tracking-[0.15em] uppercase text-slate-500 font-medium">
            Colour
            {selected?.color && (
              <span className="ml-2 text-slate-700 normal-case tracking-normal font-normal">
                — {selected.color}
              </span>
            )}
          </label>
          <div className="flex flex-wrap gap-2">
            {colors.map((color) => {
              const colorVariant = variants.find((v) => v.color === color);
              const isSelected = selected?.color === color;
              return (
                <button
                  key={color}
                  onClick={() => colorVariant && onSelect(colorVariant)}
                  aria-pressed={isSelected}
                  aria-label={`Colour: ${color}`}
                  className={`h-11 px-4 text-sm border rounded-sm transition-all duration-200 ${
                    isSelected
                      ? 'border-[#8A5A6A] bg-[#8A5A6A]/5 text-[#8A5A6A]'
                      : 'border-slate-200 text-slate-700 hover:border-slate-400'
                  }`}
                >
                  {color}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
