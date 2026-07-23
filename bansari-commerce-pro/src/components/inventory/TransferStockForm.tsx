'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { transferStockAction } from '@/app/actions/inventory.actions';
import type { Warehouse, InventorySummaryRow } from '@/types/inventory';

interface Props {
  warehouses:    Warehouse[];
  inventoryRows: InventorySummaryRow[];
  preselectedInventoryId?: number;
}

export function TransferStockForm({ warehouses, inventoryRows, preselectedInventoryId }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // derive from preselected row
  const preRow = preselectedInventoryId
    ? inventoryRows.find(r => r.id === preselectedInventoryId)
    : undefined;

  const [fromWarehouseId, setFromWarehouseId] = useState<string>(
    preRow ? String(preRow.warehouse_id) : ''
  );
  const [toWarehouseId, setToWarehouseId] = useState<string>('');
  const [productId,    setProductId]    = useState<string>(
    preRow ? String(preRow.product_id) : ''
  );
  const [variantId,    setVariantId]    = useState<string>(
    preRow?.variant_id ? String(preRow.variant_id) : ''
  );
  const [quantity,     setQuantity]     = useState<string>('');
  const [notes,        setNotes]        = useState('');
  const [error,        setError]        = useState<string | null>(null);
  const [success,      setSuccess]      = useState(false);

  // derive available stock from selected from+product combination
  const sourceRow = inventoryRows.find(
    r =>
      r.warehouse_id === Number(fromWarehouseId) &&
      r.product_id   === Number(productId) &&
      (variantId ? r.variant_id === Number(variantId) : r.variant_id == null)
  );

  // unique products available in from-warehouse
  const fromWarehouseRows = fromWarehouseId
    ? inventoryRows.filter(r => r.warehouse_id === Number(fromWarehouseId))
    : inventoryRows;

  const uniqueProducts = Array.from(
    new Map(fromWarehouseRows.map(r => [r.product_id, r])).values()
  );

  const variantsForProduct = productId
    ? fromWarehouseRows.filter(
        r => r.product_id === Number(productId) && r.variant_id != null
      )
    : [];

  const parsedQty = Number(quantity);
  const maxQty    = sourceRow?.available_qty ?? Infinity;
  const isValid   =
    fromWarehouseId &&
    toWarehouseId &&
    fromWarehouseId !== toWarehouseId &&
    productId &&
    quantity !== '' &&
    parsedQty > 0 &&
    parsedQty <= maxQty;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid) return;
    setError(null);

    startTransition(async () => {
      const result = await transferStockAction({
        from_warehouse_id: Number(fromWarehouseId),
        to_warehouse_id:   Number(toWarehouseId),
        product_id:        Number(productId),
        variant_id:        variantId ? Number(variantId) : undefined,
        quantity:          parsedQty,
        notes:             notes.trim() || undefined,
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
        <strong>Stock transferred successfully.</strong>
        <p>Redirecting to inventory…</p>
      </div>
    );
  }

  return (
    <form className="inv-form" onSubmit={handleSubmit} noValidate>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label" htmlFor="tf-from">
            From Warehouse <span className="required">*</span>
          </label>
          <select
            id="tf-from"
            className="form-select"
            value={fromWarehouseId}
            onChange={e => {
              setFromWarehouseId(e.target.value);
              setProductId('');
              setVariantId('');
            }}
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

        <div className="form-group">
          <label className="form-label" htmlFor="tf-to">
            To Warehouse <span className="required">*</span>
          </label>
          <select
            id="tf-to"
            className="form-select"
            value={toWarehouseId}
            onChange={e => setToWarehouseId(e.target.value)}
            required
          >
            <option value="">Select warehouse…</option>
            {warehouses
              .filter(wh => String(wh.id) !== fromWarehouseId)
              .map(wh => (
                <option key={wh.id} value={wh.id}>
                  {wh.name} ({wh.code})
                </option>
              ))}
          </select>
          {fromWarehouseId && toWarehouseId && fromWarehouseId === toWarehouseId && (
            <p className="form-error-inline">Source and destination must differ.</p>
          )}
        </div>
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="tf-product">
          Product <span className="required">*</span>
        </label>
        <select
          id="tf-product"
          className="form-select"
          value={productId}
          onChange={e => {
            setProductId(e.target.value);
            setVariantId('');
          }}
          disabled={!fromWarehouseId}
          required
        >
          <option value="">{fromWarehouseId ? 'Select product…' : 'Select from-warehouse first'}</option>
          {uniqueProducts.map(r => (
            <option key={r.product_id} value={r.product_id}>
              {r.product_name} — {r.available_qty} available
            </option>
          ))}
        </select>
      </div>

      {variantsForProduct.length > 0 && (
        <div className="form-group">
          <label className="form-label" htmlFor="tf-variant">Variant</label>
          <select
            id="tf-variant"
            className="form-select"
            value={variantId}
            onChange={e => setVariantId(e.target.value)}
          >
            <option value="">All variants (base)</option>
            {variantsForProduct.map(r => (
              <option key={r.variant_id} value={r.variant_id!}>
                {r.size_label ?? r.variant_sku} — {r.available_qty} available
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="form-group">
        <label className="form-label" htmlFor="tf-qty">
          Quantity <span className="required">*</span>
        </label>
        <input
          id="tf-qty"
          type="number"
          className="form-input"
          value={quantity}
          onChange={e => setQuantity(e.target.value)}
          placeholder="Units to transfer"
          min="1"
          max={sourceRow?.available_qty}
          required
        />
        {sourceRow && (
          <p className="form-hint">
            Available at source: <strong>{sourceRow.available_qty}</strong> units
          </p>
        )}
        {quantity !== '' && parsedQty > maxQty && (
          <p className="form-error-inline">
            Cannot exceed available quantity ({maxQty}).
          </p>
        )}
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="tf-notes">Notes</label>
        <textarea
          id="tf-notes"
          className="form-textarea"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Optional: reason for transfer"
          rows={2}
          maxLength={500}
        />
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
          {isPending ? 'Transferring…' : 'Transfer Stock'}
        </button>
      </div>
    </form>
  );
}
