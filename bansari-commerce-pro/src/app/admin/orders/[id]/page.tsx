'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import type { OrderV2, OrderTimelineEntry } from '@/types/order-v2';

// ─── Types ──────────────────────────────────────────────────────────────────

type ApiOrderResponse  = { success: boolean; data: OrderV2 };
type ApiListResponse   = { success: boolean; data: OrderTimelineEntry[] };

// ─── Helpers ────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  pending:            'bg-yellow-100 text-yellow-800',
  confirmed:          'bg-blue-100 text-blue-800',
  processing:         'bg-blue-100 text-blue-800',
  packed:             'bg-indigo-100 text-indigo-800',
  shipped:            'bg-purple-100 text-purple-800',
  out_for_delivery:   'bg-purple-100 text-purple-800',
  delivered:          'bg-green-100 text-green-800',
  cancelled:          'bg-red-100 text-red-800',
  return_requested:   'bg-orange-100 text-orange-800',
  returned:           'bg-orange-100 text-orange-800',
  exchange_requested: 'bg-amber-100 text-amber-800',
  refunded:           'bg-pink-100 text-pink-800',
  partially_refunded: 'bg-pink-100 text-pink-800',
};

function badge(status: string) {
  return `inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-700'}`;
}

function fmt(n: number | string | null | undefined) {
  return `₹${Number(n ?? 0).toLocaleString('en-IN')}`;
}

async function apiPost<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  });
  return res.json() as Promise<T>;
}

async function apiPatch<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method:  'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  });
  return res.json() as Promise<T>;
}

// ─── Modal ──────────────────────────────────────────────────────────────────

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-xl font-semibold">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl bg-white p-8 shadow-sm">
      <h2 className="mb-5 text-xl font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between py-1 text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-right max-w-xs">{value ?? '—'}</span>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function OrderDetailPage() {
  const { id }   = useParams<{ id: string }>();
  const router   = useRouter();

  const [order,    setOrder]    = useState<OrderV2 | null>(null);
  const [timeline, setTimeline] = useState<OrderTimelineEntry[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);
  const [busy,     setBusy]     = useState(false);

  // modal state
  const [modal, setModal] = useState<
    | null
    | 'ship' | 'cancel' | 'refund' | 'return' | 'exchange' | 'note' | 'notes'
  >(null);

  // ship form
  const [courier, setCourier]     = useState('');
  const [awb, setAwb]             = useState('');
  const [trackingUrl, setTracking] = useState('');
  const [expected, setExpected]   = useState('');

  // cancel / return / exchange / note forms
  const [reason, setReason]   = useState('');

  // refund form
  const [refundAmt, setRefundAmt]   = useState('');
  const [refundRef, setRefundRef]   = useState('');

  // notes form
  const [internalNote, setInternal] = useState('');
  const [customerNote, setCustomer] = useState('');
  const [packingNote,  setPacking]  = useState('');

  // ── Fetch order ───────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [orderRes, timelineRes] = await Promise.all([
        fetch(`/api/admin/orders/${id}`).then((r) => r.json() as Promise<ApiOrderResponse>),
        fetch(`/api/admin/orders/${id}/timeline`).then((r) => r.json() as Promise<ApiListResponse>),
      ]);
      if (!orderRes.success) throw new Error('Order not found');
      setOrder(orderRes.data);
      if (timelineRes.success) setTimeline(timelineRes.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load order');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  // ── Actions ───────────────────────────────────────────────────────────────

  async function doDeliver() {
    if (!confirm('Mark this order as delivered?')) return;
    setBusy(true);
    await fetch(`/api/admin/orders/${id}/deliver`, { method: 'POST' });
    setBusy(false);
    void load();
  }

  async function doShip() {
    if (!courier || !awb) return;
    setBusy(true);
    await apiPost(`/api/admin/orders/${id}/ship`, {
      courierName: courier, awbNumber: awb,
      trackingUrl: trackingUrl || undefined,
      expectedDeliveryDate: expected || undefined,
    });
    setBusy(false);
    setModal(null);
    void load();
  }

  async function doCancel() {
    if (!reason) return;
    setBusy(true);
    await apiPost(`/api/admin/orders/${id}/cancel`, { reason });
    setBusy(false);
    setModal(null);
    void load();
  }

  async function doRefund() {
    if (!refundAmt) return;
    setBusy(true);
    await apiPost(`/api/admin/orders/${id}/refund`, {
      amount: Number(refundAmt),
      reference: refundRef || undefined,
      reason: reason || undefined,
    });
    setBusy(false);
    setModal(null);
    void load();
  }

  async function doReturn() {
    if (!reason) return;
    setBusy(true);
    await apiPost(`/api/admin/orders/${id}/return`, { reason });
    setBusy(false);
    setModal(null);
    void load();
  }

  async function doExchange() {
    if (!reason) return;
    setBusy(true);
    await apiPost(`/api/admin/orders/${id}/exchange`, { reason });
    setBusy(false);
    setModal(null);
    void load();
  }

  async function doNote() {
    if (!reason) return;
    setBusy(true);
    await apiPost(`/api/admin/orders/${id}/timeline`, { note: reason });
    setBusy(false);
    setModal(null);
    void load();
  }

  async function doSaveNotes() {
    setBusy(true);
    await apiPatch(`/api/admin/orders/${id}/notes`, {
      internalNotes: internalNote || null,
      customerNotes: customerNote || null,
      packingNotes:  packingNote  || null,
    });
    setBusy(false);
    setModal(null);
    void load();
  }

  function openNotes() {
    setInternal(order?.internalNotes ?? '');
    setCustomer(order?.customerNotes ?? '');
    setPacking(order?.packingNotes  ?? '');
    setModal('notes');
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return <main className="flex min-h-screen items-center justify-center"><p className="text-gray-400">Loading order…</p></main>;
  }
  if (error || !order) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4">
        <p className="text-red-500">{error ?? 'Order not found'}</p>
        <Link href="/admin/orders" className="text-[#8A5A6A] underline">Back to orders</Link>
      </main>
    );
  }

  const status = order.orderV2Status;
  const canShip     = ['confirmed','processing','packed'].includes(status);
  const canDeliver  = status === 'shipped' || status === 'out_for_delivery';
  const canCancel   = !['cancelled','delivered','refunded','returned','exchanged'].includes(status);
  const canRefund   = ['delivered','shipped','partially_refunded'].includes(status);
  const canReturn   = ['delivered','shipped','out_for_delivery'].includes(status);
  const canExchange = status === 'delivered';

  return (
    <main className="min-h-screen bg-[#F8F8F8]">
      <div className="mx-auto max-w-5xl px-6 py-12 space-y-8">

        {/* ── Header ── */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-[family:var(--font-playfair)] text-4xl font-bold">{order.orderNumber}</h1>
            <p className="mt-2 text-gray-500 text-sm">
              Placed {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className={badge(status)}>{status.replace(/_/g, ' ')}</span>
              <span className={badge(order.paymentV2Status ?? '')}>{(order.paymentV2Status ?? '').replace(/_/g, ' ')}</span>
              <span className={badge(order.fulfillmentStatus ?? '')}>{(order.fulfillmentStatus ?? '').replace(/_/g, ' ')}</span>
            </div>
          </div>
          <Link href="/admin/orders" className="rounded-full border border-[#8A5A6A] px-5 py-2.5 text-sm font-medium text-[#8A5A6A] transition hover:bg-[#8A5A6A] hover:text-white">
            ← Back
          </Link>
        </div>

        {/* ── Action Bar ── */}
        <div className="flex flex-wrap gap-3">
          {canShip     && <ActionBtn color="purple" onClick={() => { setCourier(''); setAwb(''); setTracking(''); setExpected(''); setModal('ship'); }}>Ship Order</ActionBtn>}
          {canDeliver  && <ActionBtn color="green"  onClick={() => { void doDeliver(); }} disabled={busy}>Mark Delivered</ActionBtn>}
          {canReturn   && <ActionBtn color="orange" onClick={() => { setReason(''); setModal('return'); }}>Request Return</ActionBtn>}
          {canExchange && <ActionBtn color="amber"  onClick={() => { setReason(''); setModal('exchange'); }}>Request Exchange</ActionBtn>}
          {canRefund   && <ActionBtn color="pink"   onClick={() => { setReason(''); setRefundAmt(''); setRefundRef(''); setModal('refund'); }}>Issue Refund</ActionBtn>}
          {canCancel   && <ActionBtn color="red"    onClick={() => { setReason(''); setModal('cancel'); }}>Cancel Order</ActionBtn>}
          <ActionBtn color="indigo" onClick={() => { setReason(''); setModal('note'); }}>Add Note</ActionBtn>
          <ActionBtn color="gray"  onClick={openNotes}>Edit Notes</ActionBtn>
        </div>

        {/* ── Customer + Shipping ── */}
        <div className="grid gap-6 md:grid-cols-2">
          <Section title="Customer">
            <Row label="Name"  value={order.customerName} />
            <Row label="Email" value={order.customerEmail} />
            <Row label="Phone" value={order.customerPhone} />
          </Section>

          <Section title="Shipping Address">
            <Row label="Name"    value={order.shippingName} />
            <Row label="Phone"   value={order.shippingPhone} />
            <Row label="Line 1"  value={order.shippingAddressLine1} />
            {order.shippingAddressLine2 && <Row label="Line 2" value={order.shippingAddressLine2} />}
            <Row label="City"    value={`${order.shippingCity}, ${order.shippingState} ${order.shippingPostalCode}`} />
            <Row label="Country" value={order.shippingCountry} />
          </Section>
        </div>

        {/* ── Payment ── */}
        <Section title="Payment">
          <div className="grid gap-1 md:grid-cols-2">
            <Row label="Provider"       value={order.paymentProvider} />
            <Row label="Method"         value={order.paymentMethod} />
            <Row label="Reference"      value={order.paymentReference} />
            <Row label="Razorpay Order" value={order.razorpayOrderId} />
            <Row label="Razorpay Pmnt"  value={order.razorpayPaymentId} />
            <Row label="Paid At"        value={order.paidAt ? new Date(order.paidAt).toLocaleString('en-IN') : null} />
          </div>
        </Section>

        {/* ── Courier ── */}
        {order.courierName && (
          <Section title="Shipment">
            <Row label="Courier" value={order.courierName} />
            <Row label="AWB"     value={order.courierAwb} />
            {order.courierUrl && (
              <Row label="Tracking" value={
                <a href={order.courierUrl} target="_blank" rel="noopener noreferrer" className="text-[#8A5A6A] underline">Track</a>
              } />
            )}
            <Row label="Shipped At"          value={order.shippedAt ? new Date(order.shippedAt).toLocaleString('en-IN') : null} />
            <Row label="Expected Delivery"   value={order.expectedDeliveryDate ?? null} />
          </Section>
        )}

        {/* ── Order Items ── */}
        <section className="overflow-hidden rounded-3xl bg-white shadow-sm">
          <h2 className="px-8 pt-8 pb-4 text-xl font-semibold">Order Items</h2>
          <table className="w-full">
            <thead className="bg-[#FAF8F5]">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold">Product</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Variant</th>
                <th className="px-6 py-3 text-right text-sm font-semibold">Unit Price</th>
                <th className="px-6 py-3 text-right text-sm font-semibold">Qty</th>
                <th className="px-6 py-3 text-right text-sm font-semibold">Total</th>
              </tr>
            </thead>
            <tbody>
              {(order.items ?? []).map((item) => (
                <tr key={item.id} className="border-t">
                  <td className="px-6 py-4 font-medium">
                    {item.productName}
                    {item.productSku && <span className="block text-xs text-gray-400">{item.productSku}</span>}
                  </td>
                  <td className="px-6 py-4 text-sm">{[item.variantColor, item.variantSize].filter(Boolean).join(' / ') || '—'}</td>
                  <td className="px-6 py-4 text-right text-sm">{fmt(item.unitPrice)}</td>
                  <td className="px-6 py-4 text-right text-sm">{item.quantity}</td>
                  <td className="px-6 py-4 text-right text-sm font-medium">{fmt(item.lineTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="space-y-1 border-t px-8 py-6">
            <Row label="Subtotal"  value={fmt(order.subtotal)} />
            <Row label="Discount"  value={fmt(order.discount)} />
            <Row label="Shipping"  value={fmt(order.shippingFee)} />
            <Row label="Tax"       value={fmt(order.tax)} />
            <div className="flex justify-between pt-2 text-lg font-bold">
              <span>Grand Total</span>
              <span>{fmt(order.grandTotal)}</span>
            </div>
          </div>
        </section>

        {/* ── Notes ── */}
        {(order.internalNotes || order.customerNotes || order.packingNotes) && (
          <Section title="Notes">
            {order.internalNotes && <Row label="Internal" value={order.internalNotes} />}
            {order.customerNotes && <Row label="Customer" value={order.customerNotes} />}
            {order.packingNotes  && <Row label="Packing"  value={order.packingNotes}  />}
          </Section>
        )}

        {/* ── Return / Exchange / Refund info ── */}
        {(order.returnStatus || order.refundAmount) && (
          <Section title="Return / Refund">
            {order.returnStatus   && <Row label="Return Status"   value={order.returnStatus.replace(/_/g, ' ')} />}
            {order.returnReason   && <Row label="Return Reason"   value={order.returnReason} />}
            {order.exchangeStatus && <Row label="Exchange Status" value={order.exchangeStatus.replace(/_/g, ' ')} />}
            {order.refundAmount   && <Row label="Refund Amount"   value={fmt(order.refundAmount)} />}
            {order.refundReference && <Row label="Refund Ref"     value={order.refundReference} />}
            {order.refundedAt     && <Row label="Refunded At"     value={new Date(order.refundedAt).toLocaleString('en-IN')} />}
          </Section>
        )}

        {/* ── Timeline ── */}
        <Section title="Timeline">
          {timeline.length === 0 ? (
            <p className="text-sm text-gray-400">No timeline events yet.</p>
          ) : (
            <ol className="relative border-l border-gray-200 space-y-4 pl-6">
              {timeline.map((entry) => (
                <li key={entry.id} className="text-sm">
                  <div className="absolute -left-1.5 mt-1 h-3 w-3 rounded-full border border-white bg-[#8A5A6A]" />
                  <time className="text-xs text-gray-400">{new Date(entry.createdAt).toLocaleString('en-IN')}</time>
                  <p className="font-medium capitalize">{entry.event.replace(/_/g, ' ')}</p>
                  {entry.reason    && <p className="text-gray-500">{entry.reason}</p>}
                  {entry.actorName && <p className="text-gray-400 text-xs">by {entry.actorName}</p>}
                  {entry.previousStatus && entry.newStatus && (
                    <p className="text-gray-400 text-xs">{entry.previousStatus} → {entry.newStatus}</p>
                  )}
                </li>
              ))}
            </ol>
          )}
        </Section>

      </div>

      {/* ── Modals ── */}

      {modal === 'ship' && (
        <Modal title="Ship Order" onClose={() => setModal(null)}>
          <div className="space-y-4">
            <Field label="Courier Name *"><input value={courier} onChange={(e) => setCourier(e.target.value)} className={inputCls} placeholder="Delhivery" /></Field>
            <Field label="AWB / Tracking # *"><input value={awb} onChange={(e) => setAwb(e.target.value)} className={inputCls} placeholder="1234567890" /></Field>
            <Field label="Tracking URL"><input value={trackingUrl} onChange={(e) => setTracking(e.target.value)} className={inputCls} placeholder="https://…" /></Field>
            <Field label="Expected Delivery Date"><input type="date" value={expected} onChange={(e) => setExpected(e.target.value)} className={inputCls} /></Field>
            <ModalActions onCancel={() => setModal(null)} onConfirm={() => { void doShip(); }} busy={busy} confirmLabel="Ship" confirmColor="purple" />
          </div>
        </Modal>
      )}

      {modal === 'cancel' && (
        <Modal title="Cancel Order" onClose={() => setModal(null)}>
          <div className="space-y-4">
            <Field label="Reason *"><textarea value={reason} onChange={(e) => setReason(e.target.value)} className={`${inputCls} h-28 resize-none`} placeholder="Why is this order being cancelled?" /></Field>
            <ModalActions onCancel={() => setModal(null)} onConfirm={() => { void doCancel(); }} busy={busy} confirmLabel="Cancel Order" confirmColor="red" />
          </div>
        </Modal>
      )}

      {modal === 'refund' && (
        <Modal title="Issue Refund" onClose={() => setModal(null)}>
          <div className="space-y-4">
            <Field label={`Amount (max ${fmt(order.grandTotal)}) *`}><input type="number" min="1" max={order.grandTotal} value={refundAmt} onChange={(e) => setRefundAmt(e.target.value)} className={inputCls} /></Field>
            <Field label="Reference (gateway refund ID)"><input value={refundRef} onChange={(e) => setRefundRef(e.target.value)} className={inputCls} /></Field>
            <Field label="Reason"><input value={reason} onChange={(e) => setReason(e.target.value)} className={inputCls} /></Field>
            <ModalActions onCancel={() => setModal(null)} onConfirm={() => { void doRefund(); }} busy={busy} confirmLabel="Issue Refund" confirmColor="pink" />
          </div>
        </Modal>
      )}

      {modal === 'return' && (
        <Modal title="Request Return" onClose={() => setModal(null)}>
          <div className="space-y-4">
            <Field label="Reason *"><textarea value={reason} onChange={(e) => setReason(e.target.value)} className={`${inputCls} h-28 resize-none`} /></Field>
            <ModalActions onCancel={() => setModal(null)} onConfirm={() => { void doReturn(); }} busy={busy} confirmLabel="Request Return" confirmColor="orange" />
          </div>
        </Modal>
      )}

      {modal === 'exchange' && (
        <Modal title="Request Exchange" onClose={() => setModal(null)}>
          <div className="space-y-4">
            <Field label="Reason *"><textarea value={reason} onChange={(e) => setReason(e.target.value)} className={`${inputCls} h-28 resize-none`} /></Field>
            <ModalActions onCancel={() => setModal(null)} onConfirm={() => { void doExchange(); }} busy={busy} confirmLabel="Request Exchange" confirmColor="amber" />
          </div>
        </Modal>
      )}

      {modal === 'note' && (
        <Modal title="Add Timeline Note" onClose={() => setModal(null)}>
          <div className="space-y-4">
            <Field label="Note *"><textarea value={reason} onChange={(e) => setReason(e.target.value)} className={`${inputCls} h-28 resize-none`} placeholder="Internal note visible on timeline…" /></Field>
            <ModalActions onCancel={() => setModal(null)} onConfirm={() => { void doNote(); }} busy={busy} confirmLabel="Add Note" confirmColor="indigo" />
          </div>
        </Modal>
      )}

      {modal === 'notes' && (
        <Modal title="Edit Order Notes" onClose={() => setModal(null)}>
          <div className="space-y-4">
            <Field label="Internal Notes"><textarea value={internalNote} onChange={(e) => setInternal(e.target.value)} className={`${inputCls} h-20 resize-none`} placeholder="Visible only to admin" /></Field>
            <Field label="Customer Notes"><textarea value={customerNote} onChange={(e) => setCustomer(e.target.value)} className={`${inputCls} h-20 resize-none`} placeholder="Visible to customer" /></Field>
            <Field label="Packing Notes"><textarea value={packingNote}  onChange={(e) => setPacking(e.target.value)}  className={`${inputCls} h-20 resize-none`} placeholder="For warehouse" /></Field>
            <ModalActions onCancel={() => setModal(null)} onConfirm={() => { void doSaveNotes(); }} busy={busy} confirmLabel="Save Notes" confirmColor="gray" />
          </div>
        </Modal>
      )}

    </main>
  );
}

// ─── Tiny shared sub-components ──────────────────────────────────────────────

const inputCls = 'w-full rounded-2xl border border-gray-300 px-4 py-2.5 text-sm focus:border-[#8A5A6A] focus:outline-none';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block space-y-1"><span className="text-sm font-medium text-gray-700">{label}</span>{children}</label>;
}

const CONFIRM_COLORS: Record<string, string> = {
  purple: 'bg-purple-600 hover:bg-purple-700',
  green:  'bg-green-600 hover:bg-green-700',
  red:    'bg-red-600 hover:bg-red-700',
  orange: 'bg-orange-500 hover:bg-orange-600',
  amber:  'bg-amber-500 hover:bg-amber-600',
  pink:   'bg-pink-600 hover:bg-pink-700',
  indigo: 'bg-indigo-600 hover:bg-indigo-700',
  gray:   'bg-[#8A5A6A] hover:bg-[#7a4a5a]',
};

function ModalActions({ onCancel, onConfirm, busy, confirmLabel, confirmColor }: {
  onCancel:     () => void;
  onConfirm:    () => void;
  busy:         boolean;
  confirmLabel: string;
  confirmColor: string;
}) {
  return (
    <div className="flex justify-end gap-3 pt-2">
      <button onClick={onCancel} disabled={busy} className="rounded-full border border-gray-300 px-5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">Cancel</button>
      <button onClick={onConfirm} disabled={busy} className={`rounded-full px-5 py-2 text-sm font-medium text-white transition disabled:opacity-50 ${CONFIRM_COLORS[confirmColor] ?? CONFIRM_COLORS.gray}`}>
        {busy ? 'Please wait…' : confirmLabel}
      </button>
    </div>
  );
}

const ACTION_COLORS: Record<string, string> = {
  purple: 'border-purple-500 text-purple-600 hover:bg-purple-500 hover:text-white',
  green:  'border-green-600 text-green-700 hover:bg-green-600 hover:text-white',
  red:    'border-red-500 text-red-600 hover:bg-red-500 hover:text-white',
  orange: 'border-orange-400 text-orange-600 hover:bg-orange-400 hover:text-white',
  amber:  'border-amber-400 text-amber-600 hover:bg-amber-400 hover:text-white',
  pink:   'border-pink-500 text-pink-600 hover:bg-pink-500 hover:text-white',
  indigo: 'border-indigo-500 text-indigo-600 hover:bg-indigo-500 hover:text-white',
  gray:   'border-gray-400 text-gray-600 hover:bg-gray-400 hover:text-white',
};

function ActionBtn({ color, onClick, disabled, children }: {
  color: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded-full border px-5 py-2 text-sm font-medium transition disabled:opacity-40 disabled:cursor-not-allowed ${ACTION_COLORS[color] ?? ACTION_COLORS.gray}`}
    >
      {children}
    </button>
  );
}
