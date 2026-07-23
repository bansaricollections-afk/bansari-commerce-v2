'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { adjustStockAction } from '@/app/actions/inventory.actions';
import type { AdjustmentReason } from '@/types/inventory';

const REASONS: { value: AdjustmentReason; label: string; desc: string }[] = [
  { value: 'cycle_count',       label: 'Cycle Count',        desc: 'Physical count correction' },
  { value: 'damage_write_off',  label: 'Damage Write-off',   desc: 'Stock damaged beyond use' },
  { value: 'damage_recovery',   label: 'Damage Recovery',    desc: 'Previously damaged stock recovered' },
  { value: 'theft_loss',        label: 'Theft / Loss',       desc: 'Stock missing / stolen' },
  { value: 'expiry',            label: 'Expiry',             desc: 'Stock expired / past sell-by' },
  { value: 'found_surplus',     label: 'Found Surplus',      desc: 'Extra stock discovered during audit' },
  { value: 'vendor_credit',     label: 'Vendor Credit',      desc: 'Credit note from vendor' },
  { value: 'sample_used',       label: 'Sample Used',        desc: 'Stock taken as sample / marketing use' },
  { value: 'other',             label: 'Other',              desc: 'Miscellaneous reason — add note' },
];

interface Props {
  inventoryId?: number;
  productName?: string;
  currentQty?:  number;
}

export function AdjustStockForm({ inventoryId, productName, currentQty }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [invId,    setInvId]    = useState<string>(inventoryId ? String(inventoryId) : '');
  const [qtyChange, setQtyChange] = useState<string>('');
  const [reason,   setReason]   = useState<AdjustmentReason>('cycle_count');
  const [notes,    setNotes]    = useState('');
  const [error,    setError]    = useState<string | null>(null);
  const [success,  setSuccess]  = useState(false);

  const parsedQty = Number(qtyChange);
  const isValid   = invId && qtyChange !== '' && !isNaN(parsedQty) && parsedQty !== 0;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid) return;
    setError(null);

    startTransition(async () => {
      const result = await adjustStockAction({
        inventory_id: Number(invId),
        qty_change:   parsedQty,
        reason,
        notes:        notes.trim() || undefined,
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSuccess(true);
      setTimeout(() => router.push('/admin/inventory'), 1500);
    });
  }

  if (success) {
    return (
      <div className="form-success" role="status">
        <span className="success-icon">✓</span>
        <strong>Stock adjusted successfully.</strong>
        <p>Redirecting to inventory…</p>
      </div>
    );
  }

  return (
    <form className="inv-form" onSubmit={handleSubmit} noValidate>
      {productName && (
        <div className="form-context">
          <span className="context-label">Adjusting</span>
          <span className="context-value">{productName}</span>
          {currentQty !== undefined && (
            <span className="context-qty">Current qty: <strong>{currentQty}</strong></span>
          )}
        </div>
      )}

      {!inventoryId && (
        <div className="form-group">
          <label className="form-label" htmlFor="adj-inv-id">
            Inventory Record ID <span className="required">*</span>
          </label>
          <input
            id="adj-inv-id"
            type="number"
            className="form-input"
            value={invId}
            onChange={e => setInvId(e.target.value)}
            placeholder="Enter inventory record ID"
            min="1"
            required
          />
          <p className="form-hint">Find the ID in the inventory table → Ledger link.</p>
        </div>
      )}

      <div className="form-group">
        <label className="form-label" htmlFor="adj-qty">
          Quantity Change <span className="required">*</span>
        </label>
        <input
          id="adj-qty"
          type="number"
          className="form-input"
          value={qtyChange}
          onChange={e => setQtyChange(e.target.value)}
          placeholder="e.g. -5 to remove, +10 to add"
          required
        />
        {qtyChange !== '' && !isNaN(parsedQty) && parsedQty !== 0 && (
          <p className="form-hint">
            Will {parsedQty > 0 ? 'add' : 'remove'}{' '}
            <strong>{Math.abs(parsedQty)}</strong> unit{Math.abs(parsedQty) !== 1 ? 's' : ''}
            {currentQty !== undefined && (
              <> · new total: <strong>{currentQty + parsedQty}</strong></>
            )}
          </p>
        )}
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="adj-reason">
          Reason <span className="required">*</span>
        </label>
        <select
          id="adj-reason"
          className="form-select"
          value={reason}
          onChange={e => setReason(e.target.value as AdjustmentReason)}
          required
        >
          {REASONS.map(r => (
            <option key={r.value} value={r.value}>
              {r.label} — {r.desc}
            </option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="adj-notes">Notes</label>
        <textarea
          id="adj-notes"
          className="form-textarea"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Optional: additional context for the audit log"
          rows={3}
          maxLength={500}
        />
        <p className="form-hint char-count">{notes.length}/500</p>
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
          {isPending ? 'Saving…' : 'Apply Adjustment'}
        </button>
      </div>
    </form>
  );
}
