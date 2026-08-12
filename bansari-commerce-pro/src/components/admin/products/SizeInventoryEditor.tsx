'use client';

import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';

import {
  saveSizeInventoryAction,
  setSizeSemanticAction,
} from '@/app/actions/size-inventory.actions';
import type { AdminProductInventory, SizeSemantic } from '@/services/size-inventory.service';

const SEMANTICS: { value: SizeSemantic; label: string }[] = [
  { value: 'REGULAR', label: 'Regular' },
  { value: 'PLUS', label: 'Plus' },
  { value: 'FREE_SIZE', label: 'Free Size' },
  { value: 'UNCLASSIFIED', label: 'Unclassified' },
];

function statusChip(available: number, hasVariant: boolean) {
  if (!hasVariant) {
    return { text: 'Not offered', className: 'bg-slate-100 text-slate-500' };
  }
  if (available === 0) return { text: 'Sold Out', className: 'bg-rose-50 text-rose-700' };
  if (available === 1) return { text: 'Only 1 Left', className: 'bg-amber-50 text-amber-700' };
  if (available <= 5) return { text: 'Low Stock', className: 'bg-amber-50 text-amber-700' };
  return { text: 'Available', className: 'bg-emerald-50 text-emerald-700' };
}

export default function SizeInventoryEditor({ data }: { data: AdminProductInventory }) {
  const [stockBySize, setStockBySize] = useState<Record<number, string>>(() =>
    Object.fromEntries(
      data.rows.map((r) => [
        r.sizeId,
        r.variantId !== null && r.variantStatus === 'active' ? String(r.stock ?? 0) : '',
      ])
    )
  );
  const [semanticBySize, setSemanticBySize] = useState<Record<number, SizeSemantic>>(() =>
    Object.fromEntries(data.rows.map((r) => [r.sizeId, r.semantic]))
  );
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const suggested = useMemo(
    () => new Set(data.legacyProductSizes.map((s) => s.trim().toLowerCase())),
    [data.legacyProductSizes]
  );

  function handleSave() {
    setMessage(null);

    const rows = data.rows.map((r) => {
      const raw = (stockBySize[r.sizeId] ?? '').trim();
      return { sizeId: r.sizeId, stock: raw === '' ? null : Number(raw) };
    });

    const invalid = rows.find(
      (r) => r.stock !== null && (!Number.isInteger(r.stock) || r.stock < 0)
    );
    if (invalid) {
      setMessage({ ok: false, text: 'Stock must be a whole number of 0 or more.' });
      return;
    }

    startTransition(async () => {
      const result = await saveSizeInventoryAction(data.productId, rows);
      setMessage(
        result.ok
          ? {
              ok: true,
              text: `Saved. ${result.data.created} size(s) created, ${result.data.updated} updated${
                result.data.deactivated ? `, ${result.data.deactivated} withdrawn` : ''
              }.`,
            }
          : { ok: false, text: result.error }
      );
    });
  }

  function handleSemantic(sizeId: number, semantic: SizeSemantic) {
    setSemanticBySize((prev) => ({ ...prev, [sizeId]: semantic }));
    startTransition(async () => {
      const result = await setSizeSemanticAction(sizeId, semantic);
      if (!result.ok) setMessage({ ok: false, text: result.error });
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Context strip */}
      <div className="border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900">{data.productName}</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              SKU {data.productSku ?? '—'} · Product ID {data.productId}
            </p>
          </div>
          <span
            className={`px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${
              data.sizeManaged
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-slate-100 text-slate-600'
            }`}
          >
            {data.sizeManaged ? 'Size-level inventory active' : 'Not yet size-managed'}
          </span>
        </div>

        {!data.sizeManaged && (
          <p className="mt-3 text-xs leading-relaxed text-slate-600">
            This product still uses the single product-level stock figure
            {data.legacyProductStock !== null ? ` (${data.legacyProductStock})` : ''}. The moment you
            save stock for at least one size below, the storefront switches to size-level
            availability for this product — sizes you leave blank are simply not offered.
          </p>
        )}
      </div>

      {/* Size table */}
      <div className="overflow-x-auto border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left">
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600">Size</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600">Semantic</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600">SKU</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600">Stock</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600">Reserved</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600">Available</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600">Status</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row) => {
              const raw = stockBySize[row.sizeId] ?? '';
              const entered = raw.trim() === '' ? null : Number(raw);
              const projected =
                entered === null ? 0 : Math.max(0, entered - row.reserved);
              const chip = statusChip(projected, entered !== null);

              return (
                <tr key={row.sizeId} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3">
                    <span className="font-medium text-slate-900">{row.label}</span>
                    {suggested.has(row.label.trim().toLowerCase()) && (
                      <span className="ml-2 text-[10px] uppercase tracking-wide text-slate-400">
                        listed on product
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={semanticBySize[row.sizeId] ?? 'UNCLASSIFIED'}
                      onChange={(e) => handleSemantic(row.sizeId, e.target.value as SizeSemantic)}
                      className="border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 focus:border-slate-400 focus:outline-none"
                      aria-label={`Size semantic for ${row.label}`}
                    >
                      {SEMANTICS.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{row.sku ?? '—'}</td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      min={0}
                      step={1}
                      inputMode="numeric"
                      value={raw}
                      placeholder="—"
                      onChange={(e) =>
                        setStockBySize((prev) => ({ ...prev, [row.sizeId]: e.target.value }))
                      }
                      className="w-24 border border-slate-200 px-2 py-1 text-sm tabular-nums text-slate-900 focus:border-slate-400 focus:outline-none"
                      aria-label={`Stock for size ${row.label}`}
                    />
                  </td>
                  <td className="px-4 py-3 tabular-nums text-slate-600">{row.reserved}</td>
                  <td className="px-4 py-3 tabular-nums font-medium text-slate-900">
                    {entered === null ? '—' : projected}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${chip.className}`}>
                      {chip.text}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs leading-relaxed text-slate-500">
        Leave a size blank to stop offering it — the size is withdrawn from the storefront but its
        record is kept so past orders stay intact. Stock can never be set below the units already
        reserved for open orders.
      </p>

      {/* Action bar — sticks to the bottom of the viewport so Save is always
          reachable while working down a long size table.
          The background colour is set inline on purpose: globals.css declares
          an unlayered `button { background: none }` rule that overrides
          Tailwind bg-* utilities on raw buttons, which rendered this control
          invisible (white label on a cream page). */}
      <div className="sticky bottom-0 -mx-1 flex flex-wrap items-center gap-3 border-t border-slate-200 bg-white/95 px-1 py-4 backdrop-blur">
        <button
          type="button"
          onClick={handleSave}
          disabled={pending}
          style={{ backgroundColor: pending ? '#64748b' : '#0f172a', color: '#ffffff' }}
          className="px-5 py-2.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-70"
        >
          {pending ? 'Saving…' : 'Save size inventory'}
        </button>
        <Link
          href="/admin/products"
          className="px-4 py-2.5 text-sm text-slate-600 transition-colors hover:text-slate-900"
        >
          Back to products
        </Link>
        {message && (
          <span
            className="text-sm font-medium"
            style={{ color: message.ok ? '#047857' : '#be123c' }}
            role="status"
          >
            {message.text}
          </span>
        )}
      </div>
    </div>
  );
}
