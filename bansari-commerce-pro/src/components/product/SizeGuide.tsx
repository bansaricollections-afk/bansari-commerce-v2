'use client';

import { useEffect, useRef } from 'react';

/**
 * The size guide modal, shared by ProductInfo and ProductVariantSelector
 * (each previously carried its own identical copy of one generic table).
 *
 * Shows the product's assigned chart from Admin (size_charts): body
 * measurements per size plus the style's typical length and how to choose.
 * Rows are narrowed to the sizes this product is actually sold in. With no
 * chart assigned it falls back to the standard body measurements.
 */

export type SizeChartRow = { size: string; bust?: number; waist?: number; hip?: number };
export type SizeChartData = { name: string; description: string | null; rows: SizeChartRow[] };

const DEFAULT_ROWS: SizeChartRow[] = [
  { size: 'XS', bust: 32, waist: 26, hip: 36 },
  { size: 'S', bust: 34, waist: 28, hip: 38 },
  { size: 'M', bust: 36, waist: 30, hip: 40 },
  { size: 'L', bust: 38, waist: 32, hip: 42 },
  { size: 'XL', bust: 40, waist: 34, hip: 44 },
  { size: 'XXL', bust: 42, waist: 36, hip: 46 },
];

export function SizeGuideModal({
  onClose,
  chart = null,
  sizes = [],
}: {
  onClose: () => void;
  chart?: SizeChartData | null;
  /** Size labels this product is sold in; empty shows every row. */
  sizes?: string[];
}) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  // Escape closes; focus moves in on open, is trapped with Tab, and returns
  // to the opener on close.
  useEffect(() => {
    const dialog = dialogRef.current;
    const opener = document.activeElement as HTMLElement | null;
    const raf = requestAnimationFrame(() => closeButtonRef.current?.focus());

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !dialog) return;
      const focusables = dialog.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusables.length === 0) return;
      const first = focusables[0]!;
      const last = focusables[focusables.length - 1]!;
      if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      } else if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('keydown', onKeyDown);
      opener?.focus?.();
    };
  }, [onClose]);

  const allRows = chart?.rows?.length ? chart.rows : DEFAULT_ROWS;
  const wanted = new Set(sizes.map((s) => s.trim().toUpperCase()));
  const narrowed = allRows.filter((r) => wanted.has(r.size.toUpperCase()));
  const rows = narrowed.length > 0 ? narrowed : allRows;

  return (
    <div
      ref={dialogRef}
      className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-4"
      role="dialog"
      aria-label="Size guide"
      aria-modal="true"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white w-full max-w-md rounded-sm shadow-2xl overflow-auto max-h-[85vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-sm font-medium tracking-[0.12em] uppercase text-slate-900">Size Guide</h2>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            aria-label="Close size guide"
            className="text-slate-400 hover:text-slate-700 transition-colors p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A5A6A]"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-6 py-5">
          <p className="text-[11px] tracking-[0.18em] uppercase text-[#8A5A6A] font-medium">
            {chart?.name ?? 'Indian Ethnic Sizing'}
          </p>
          {chart?.description && (
            <p className="mt-2 text-[13px] leading-relaxed text-slate-700">{chart.description}</p>
          )}
          <table className="mt-4 w-full text-sm text-slate-700">
            <caption className="sr-only">Body measurements in inches for each size</caption>
            <thead>
              <tr className="border-b border-slate-100">
                {['Size', 'Bust', 'Waist', 'Hip'].map((h) => (
                  <th key={h} className="text-left text-[10px] tracking-widest uppercase text-slate-400 pb-2 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {rows.map((r) => (
                <tr key={r.size}>
                  <td className="py-2 font-medium text-slate-900">{r.size}</td>
                  <td className="py-2 text-slate-600">{r.bust ?? '—'}</td>
                  <td className="py-2 text-slate-600">{r.waist ?? '—'}</td>
                  <td className="py-2 text-slate-600">{r.hip ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-5 text-[11px] text-slate-500 leading-relaxed">
            These are <strong>body</strong> measurements in inches — the body each size is made
            to fit. Measure over your fullest points. If you are between sizes, size up.
            Unsure? Message us on WhatsApp and we will help.
          </p>
        </div>
      </div>
    </div>
  );
}
