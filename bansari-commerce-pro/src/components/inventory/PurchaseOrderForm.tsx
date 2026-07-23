'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createPurchaseOrderAction } from '@/app/actions/inventory.actions';
import type { Vendor, Warehouse } from '@/types/inventory';

interface LineItem {
  product_id:  string;
  variant_id:  string;
  ordered_qty: string;
  unit_cost:   string;
  hsn_code:    string;
  _key:        number; // stable local key for list rendering
}

interface Props {
  vendors:    Vendor[];
  warehouses: Warehouse[];
}

let _itemKey = 0;
function newItem(): LineItem {
  return { product_id: '', variant_id: '', ordered_qty: '', unit_cost: '', hsn_code: '', _key: ++_itemKey };
}

export function PurchaseOrderForm({ vendors, warehouses }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [vendorId,     setVendorId]     = useState('');
  const [warehouseId,  setWarehouseId]  = useState('');
  const [expectedDate, setExpectedDate] = useState('');
  const [notes,        setNotes]        = useState('');
  const [items,        setItems]        = useState<LineItem[]>([newItem()]);
  const [error,        setError]        = useState<string | null>(null);
  const [success,      setSuccess]      = useState<{ poNumber: string } | null>(null);

  // ── line-item helpers ──────────────────────────────────
  function updateItem(key: number, field: keyof LineItem, value: string) {
    setItems(prev =>
      prev.map(it => (it._key === key ? { ...it, [field]: value } : it))
    );
  }

  function removeItem(key: number) {
    if (items.length === 1) return; // always keep ≥1 row
    setItems(prev => prev.filter(it => it._key !== key));
  }

  // ── derived totals ─────────────────────────────────────
  const subtotal = items.reduce((acc, it) => {
    const qty  = parseFloat(it.ordered_qty) || 0;
    const cost = parseFloat(it.unit_cost)   || 0;
    return acc + qty * cost;
  }, 0);

  // ── validation ────────────────────────────────────────
  const validItems = items.filter(
    it =>
      it.product_id.trim() &&
      Number(it.ordered_qty) > 0 &&
      Number(it.unit_cost)   >= 0
  );
  const isFormValid = vendorId && warehouseId && validItems.length > 0;

  // ── submit ────────────────────────────────────────────
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isFormValid) return;
    setError(null);

    startTransition(async () => {
      const result = await createPurchaseOrderAction({
        vendor_id:     Number(vendorId),
        warehouse_id:  Number(warehouseId),
        expected_date: expectedDate || undefined,
        notes:         notes.trim() || undefined,
        items: validItems.map(it => ({
          product_id:  Number(it.product_id),
          variant_id:  it.variant_id ? Number(it.variant_id) : undefined,
          ordered_qty: Number(it.ordered_qty),
          unit_cost:   parseFloat(it.unit_cost),
          hsn_code:    it.hsn_code.trim() || undefined,
        })),
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSuccess({ poNumber: result.data.poNumber });
    });
  }

  if (success) {
    return (
      <div className="form-success" role="status">
        <span className="success-icon">✓</span>
        <strong>Purchase order {success.poNumber} created.</strong>
        <div className="success-actions">
          <a href="/admin/inventory/purchase-orders" className="btn btn-primary">
            View all POs
          </a>
          <button className="btn btn-ghost" onClick={() => {
            setSuccess(null);
            setItems([newItem()]);
            setVendorId('');
            setWarehouseId('');
          }}>
            Create another
          </button>
        </div>
      </div>
    );
  }

  return (
    <form className="inv-form po-form" onSubmit={handleSubmit} noValidate>
      {/* ── Header fields ─── */}
      <div className="form-row">
        <div className="form-group">
          <label className="form-label" htmlFor="po-vendor">
            Vendor <span className="required">*</span>
          </label>
          <select
            id="po-vendor"
            className="form-select"
            value={vendorId}
            onChange={e => setVendorId(e.target.value)}
            required
          >
            <option value="">Select vendor…</option>
            {vendors.map(v => (
              <option key={v.id} value={v.id}>
                {v.name} ({v.code})
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="po-warehouse">
            Deliver to Warehouse <span className="required">*</span>
          </label>
          <select
            id="po-warehouse"
            className="form-select"
            value={warehouseId}
            onChange={e => setWarehouseId(e.target.value)}
            required
          >
            <option value="">Select warehouse…</option>
            {warehouses.map(wh => (
              <option key={wh.id} value={wh.id}>
                {wh.name} ({wh.code})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label" htmlFor="po-expected">Expected Delivery Date</label>
          <input
            id="po-expected"
            type="date"
            className="form-input"
            value={expectedDate}
            min={new Date().toISOString().slice(0, 10)}
            onChange={e => setExpectedDate(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="po-notes">Notes</label>
          <input
            id="po-notes"
            type="text"
            className="form-input"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Optional order notes"
            maxLength={500}
          />
        </div>
      </div>

      {/* ── Line items ─── */}
      <div className="po-items-section">
        <div className="po-items-header">
          <h2 className="section-title">Line Items</h2>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setItems(prev => [...prev, newItem()])}
          >
            + Add Item
          </button>
        </div>

        <div className="po-items-table-wrapper">
          <table className="po-items-table">
            <thead>
              <tr>
                <th>Product ID</th>
                <th>Variant ID</th>
                <th>Qty</th>
                <th>Unit Cost (₹)</th>
                <th>HSN Code</th>
                <th className="num">Line Total</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => {
                const lineTotal = (parseFloat(item.ordered_qty) || 0) * (parseFloat(item.unit_cost) || 0);
                return (
                  <tr key={item._key}>
                    <td>
                      <input
                        type="number"
                        className="form-input form-input-sm"
                        value={item.product_id}
                        onChange={e => updateItem(item._key, 'product_id', e.target.value)}
                        placeholder="ID"
                        min="1"
                        required
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        className="form-input form-input-sm"
                        value={item.variant_id}
                        onChange={e => updateItem(item._key, 'variant_id', e.target.value)}
                        placeholder="Optional"
                        min="1"
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        className="form-input form-input-sm"
                        value={item.ordered_qty}
                        onChange={e => updateItem(item._key, 'ordered_qty', e.target.value)}
                        placeholder="0"
                        min="1"
                        required
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        className="form-input form-input-sm"
                        value={item.unit_cost}
                        onChange={e => updateItem(item._key, 'unit_cost', e.target.value)}
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                        required
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        className="form-input form-input-sm"
                        value={item.hsn_code}
                        onChange={e => updateItem(item._key, 'hsn_code', e.target.value)}
                        placeholder="e.g. 6006"
                        maxLength={8}
                      />
                    </td>
                    <td className="num tabular">
                      {lineTotal > 0
                        ? `₹${lineTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                        : '—'}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn-remove-item"
                        onClick={() => removeItem(item._key)}
                        disabled={items.length === 1}
                        aria-label="Remove line item"
                        title="Remove"
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={5} className="text-right subtotal-label">
                  Subtotal
                </td>
                <td className="num tabular subtotal-value">
                  ₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
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
          disabled={!isFormValid || isPending}
        >
          {isPending ? 'Creating PO…' : 'Create Purchase Order'}
        </button>
      </div>
    </form>
  );
}
