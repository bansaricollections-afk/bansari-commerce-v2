'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { receivePurchaseOrderAction } from '@/app/actions/inventory.actions';
import type { PurchaseOrder } from '@/services/inventory.service';

interface Props {
  po: PurchaseOrder;
}

export function ReceivePOForm({ po }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Each item: received_qty, damaged_qty, notes
  const [rows, setRows] = useState(
    (po.items ?? []).map(item => ({
      item_id:       item.id,
      product_id:    item.product_id,
      variant_id:    item.variant_id ?? undefined,
      ordered_qty:   item.ordered_qty,
      already_recv:  item.received_qty,
      remaining:     item.ordered_qty - item.received_qty,
      received_qty:  String(Math.max(0, item.ordered_qty - item.received_qty)),
      damaged_qty:   '0',
      unit_cost:     String(item.unit_cost),
      notes:         '',
    }))
  );

  const [error,   setError]   = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function updateRow(
    itemId: number,
    field: 'received_qty' | 'damaged_qty' | 'unit_cost' | 'notes',
    value: string
  ) {
    setRows(prev =>
      prev.map(r => (r.item_id === itemId ? { ...r, [field]: value } : r))
    );
  }

  const isValid = rows.some(
    r => Number(r.received_qty) > 0 || Number(r.damaged_qty) > 0
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid) return;
    setError(null);

    startTransition(async () => {
      const result = await receivePurchaseOrderAction({
        po_id: po.id,
        receipts: rows
          .filter(r => Number(r.received_qty) > 0 || Number(r.damaged_qty) > 0)
          .map(r => ({
            item_id:      r.item_id,
            received_qty: Number(r.received_qty),
            damaged_qty:  Number(r.damaged_qty),
            unit_cost:    parseFloat(r.unit_cost),
            notes:        r.notes.trim() || undefined,
          })),
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSuccess(true);
      setTimeout(() => router.push('/admin/inventory/purchase-orders'), 1500);
    });
  }

  if (success) {
    return (
      <div className="form-success" role="status">
        <span className="success-icon">✓</span>
        <strong>Stock received and inventory updated.</strong>
        <p>Redirecting…</p>
      </div>
    );
  }

  return (
    <form className="inv-form recv-form" onSubmit={handleSubmit} noValidate>
      <div className="po-info-banner">
        <span className="po-number mono">{po.po_number}</span>
        <span className="separator">·</span>
        <span>{po.vendor?.name}</span>
        <span className="separator">·</span>
        <span>{po.warehouse?.name}</span>
      </div>

      <div className="recv-table-wrapper">
        <table className="recv-table">
          <thead>
            <tr>
              <th>Product</th>
              <th className="num">Ordered</th>
              <th className="num">Already Recv.</th>
              <th className="num">Remaining</th>
              <th className="num">Receiving Now</th>
              <th className="num">Damaged</th>
              <th className="num">Unit Cost (₹)</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.item_id} className={row.remaining === 0 ? 'row-complete' : ''}>
                <td>
                  <span className="product-id-label">Product #{row.product_id}</span>
                  {row.variant_id && (
                    <span className="variant-label"> / Var #{row.variant_id}</span>
                  )}
                </td>
                <td className="num tabular">{row.ordered_qty}</td>
                <td className="num tabular text-muted">{row.already_recv}</td>
                <td className="num tabular">
                  {row.remaining > 0
                    ? <strong>{row.remaining}</strong>
                    : <span className="text-success">✓ Done</span>}
                </td>
                <td>
                  <input
                    type="number"
                    className="form-input form-input-sm"
                    value={row.received_qty}
                    onChange={e => updateRow(row.item_id, 'received_qty', e.target.value)}
                    min="0"
                    max={row.remaining}
                    disabled={row.remaining === 0}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    className="form-input form-input-sm"
                    value={row.damaged_qty}
                    onChange={e => updateRow(row.item_id, 'damaged_qty', e.target.value)}
                    min="0"
                    disabled={row.remaining === 0}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    className="form-input form-input-sm"
                    value={row.unit_cost}
                    onChange={e => updateRow(row.item_id, 'unit_cost', e.target.value)}
                    min="0"
                    step="0.01"
                  />
                </td>
                <td>
                  <input
                    type="text"
                    className="form-input form-input-sm"
                    value={row.notes}
                    onChange={e => updateRow(row.item_id, 'notes', e.target.value)}
                    placeholder="Optional"
                    maxLength={200}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {error && (
        <div className="form-error" role="alert">
          <span>⚠</span> {error}
        </div>
      )}

      <div className="form-actions">
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => router.back()}
          disabled={isPending}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={!isValid || isPending}
        >
          {isPending ? 'Receiving…' : 'Confirm Receipt'}
        </button>
      </div>
    </form>
  );
}
