'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import type { OrderV2, OrderTimelineEntry } from '@/types/order-v2';

// ─── Types ──────────────────────────────────────────────────────────────────

/*
 * These must mirror what the routes actually send. apiSuccess() SPREADS its
 * argument — `{ success: true, ...data }` — so `apiSuccess({ order })` puts
 * the order under `order`, not under `data`. There is no `data` key at all.
 *
 * Typing it as `{ data: OrderV2 }` compiled perfectly and silently read
 * undefined, so the page reported "Order not found" for orders that existed
 * and loaded fine. The list page works only because ITS route spreads a
 * result object that happens to contain a `data` field of its own.
 */
type ApiOrderResponse =
  | { success: true; order: OrderV2 }
  | { success: false; code?: string; message?: string };

type ApiListResponse =
  | { success: true; timeline: OrderTimelineEntry[] }
  | { success: false; code?: string; message?: string };

// ─── Helpers ────────────────────────────────────────────────────────────────

const GOLD = '#C9A96E';

const STATUS_COLORS: Record<string, string> = {
  pending:            'bg-amber-50 text-amber-800',
  confirmed:          'bg-blue-50 text-blue-700',
  processing:         'bg-blue-50 text-blue-700',
  packed:             'bg-neutral-100 text-neutral-700',
  shipped:            'bg-violet-50 text-violet-700',
  out_for_delivery:   'bg-violet-50 text-violet-700',
  delivered:          'bg-emerald-50 text-emerald-700',
  cancelled:          'bg-red-50 text-red-700',
  return_requested:   'bg-orange-50 text-orange-700',
  returned:           'bg-orange-50 text-orange-700',
  exchange_requested: 'bg-amber-50 text-amber-800',
  refunded:           'bg-pink-50 text-pink-700',
  partially_refunded: 'bg-pink-50 text-pink-700',
};

function badge(status: string) {
  return `inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_COLORS[status] ?? 'bg-neutral-100 text-neutral-700'}`;
}

function fmt(n: number | string | null | undefined) {
  return `₹${Number(n ?? 0).toLocaleString('en-IN')}`;
}

/*
 * WHY THESE THROW
 *
 * These used to `return res.json()` without ever looking at res.ok, and every
 * caller ignored the result. A 403 (session expired / MFA), a 422 (invalid
 * status transition) or a 500 all looked identical to success: the modal
 * closed, the page reloaded, and nothing had changed. That is how a real
 * shipment silently failed to save — and the same silence covered Issue
 * Refund, which moves money.
 *
 * Failing loudly is the whole point. Callers surface the message.
 */
async function apiSend<T>(method: 'POST' | 'PATCH', url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  });

  let json: unknown = null;
  try {
    json = await res.json();
  } catch {
    // A non-JSON body (proxy error page, empty 204) is still a real outcome.
  }

  const payload = json as { success?: boolean; message?: string; error?: string; code?: string } | null;

  if (!res.ok || payload?.success === false) {
    const detail = payload?.message || payload?.error || `${res.status} ${res.statusText}`;
    const code = payload?.code ? ` (${payload.code})` : '';
    throw new Error(`${detail}${code}`);
  }

  return payload as T;
}

const apiPost  = <T,>(url: string, body: unknown) => apiSend<T>('POST',  url, body);
const apiPatch = <T,>(url: string, body: unknown) => apiSend<T>('PATCH', url, body);

// ─── Modal ──────────────────────────────────────────────────────────────────

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl border border-neutral-200 bg-white p-7 shadow-lg">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-base font-semibold text-neutral-900">{title}</h3>
          <button onClick={onClose} className="text-xl leading-none text-neutral-400 hover:text-neutral-700">&times;</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-neutral-200 bg-white p-6">
      <div className="mb-4 flex items-center gap-2">
        <span className="h-3.5 w-0.5 rounded-full" style={{ background: GOLD }} />
        <h2 className="text-xs font-bold uppercase tracking-[0.12em] text-neutral-700">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 text-sm">
      <span className="text-neutral-500">{label}</span>
      <span className="max-w-xs text-right font-medium text-neutral-900">{value ?? '—'}</span>
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
  /* Failure of an action (ship, refund, cancel …), shown until the next attempt. */
  const [actionError, setActionError] = useState<string | null>(null);

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
      /*
       * Surface the API's own message rather than a blanket "Order not
       * found". A 500 from a bad column or an expired admin session used to
       * render as "Order not found", which sends you looking for a missing
       * row instead of the actual fault.
       */
      if (!orderRes.success) {
        throw new Error(orderRes.message || 'Order could not be loaded.');
      }
      if (!orderRes.order) {
        throw new Error('Order response did not include an order.');
      }
      setOrder(orderRes.order);

      // Timeline is supplementary: the order still renders without it.
      if (timelineRes.success) setTimeline(timelineRes.timeline ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load order');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  // ── Actions ───────────────────────────────────────────────────────────────

  /**
   * Runs an action, and makes failure visible.
   *
   * On success the modal closes and the order reloads. On failure the modal
   * STAYS OPEN with the error shown, so the typed-in courier and AWB are not
   * lost and the merchant can see why it did not go through.
   */
  async function run(fn: () => Promise<unknown>, closeModal = true) {
    setBusy(true);
    setActionError(null);
    try {
      await fn();
      if (closeModal) setModal(null);
      void load();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Action failed.');
    } finally {
      setBusy(false);
    }
  }

  /**
   * One gentle follow-up asking for a review. The server enforces the rules
   * (delivered only, unreviewed items only, once per order) and its refusal
   * message is shown as-is — "a reminder has already been sent" is an answer
   * the merchant should read, not a generic failure.
   */
  async function doReviewReminder() {
    if (
      !confirm(
        'Send the customer one gentle reminder to review this order?\n\n' +
          'They will get their review link again, plus the 10% thank-you offer for a photo review. ' +
          'Only one reminder can ever be sent per order.'
      )
    ) {
      return;
    }
    await run(async () => {
      const r = await fetch(`/api/admin/orders/${id}/review-reminder`, { method: 'POST' });
      const json = (await r.json().catch(() => null)) as { message?: string } | null;
      if (!r.ok) throw new Error(json?.message ?? `Reminder failed: ${r.status}`);
      alert('Review reminder sent.');
    }, false);
  }

  async function doDeliver() {
    if (!confirm('Mark this order as delivered?')) return;
    await run(() =>
      fetch(`/api/admin/orders/${id}/deliver`, { method: 'POST' }).then((r) => {
        if (!r.ok) throw new Error(`Mark delivered failed: ${r.status} ${r.statusText}`);
      })
    );
  }

  /**
   * Moves a paid order out of `pending` and into the fulfilment pipeline.
   *
   * Without this the order screen is a dead end: "Ship Order" is only offered
   * from confirmed/processing/packed, so a paid order stuck at `pending` could
   * never have a courier and AWB recorded. Sends no customer email — the
   * customer already has their order confirmation.
   */
  async function doConfirm() {
    await run(() =>
      apiPost(`/api/admin/orders/${id}/confirm`, {})
    );
  }

  /**
   * Moves a shipped order to out_for_delivery, which is what sends the
   * "out for delivery" email to the customer.
   */
  async function doOutForDelivery() {
    if (!confirm('Mark as out for delivery? This emails the customer.')) return;
    await run(() =>
      apiPost(`/api/admin/orders/${id}/out-for-delivery`, {})
    );
  }

  async function doShip() {
    if (!courier || !awb) return;
    await run(() =>
      apiPost(`/api/admin/orders/${id}/ship`, {
        courierName: courier,
        awbNumber: awb,
        trackingUrl: trackingUrl || undefined,
        expectedDeliveryDate: expected || undefined,
      })
    );
  }

  async function doCancel() {
    if (!reason) return;
    await run(() =>
      apiPost(`/api/admin/orders/${id}/cancel`, { reason })
    );
  }

  async function doRefund() {
    if (!refundAmt) return;
    await run(() =>
      apiPost(`/api/admin/orders/${id}/refund`, {
        amount: Number(refundAmt),
        reference: refundRef || undefined,
        reason: reason || undefined,
      })
    );
  }

  async function doReturn() {
    if (!reason) return;
    await run(() =>
      apiPost(`/api/admin/orders/${id}/return`, { reason })
    );
  }

  async function doExchange() {
    if (!reason) return;
    await run(() =>
      apiPost(`/api/admin/orders/${id}/exchange`, { reason })
    );
  }

  async function doNote() {
    if (!reason) return;
    await run(() =>
      apiPost(`/api/admin/orders/${id}/timeline`, { note: reason })
    );
  }

  async function doSaveNotes() {
    await run(() =>
      apiPatch(`/api/admin/orders/${id}/notes`, {
        internalNotes: internalNote || null,
        customerNotes: customerNote || null,
        packingNotes:  packingNote  || null,
      })
    );
  }

  function openNotes() {
    setInternal(order?.internalNotes ?? '');
    setCustomer(order?.customerNotes ?? '');
    setPacking(order?.packingNotes  ?? '');
    setModal('notes');
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return <main className="flex min-h-screen items-center justify-center bg-[#FBF9F6]"><p className="text-neutral-400">Loading order…</p></main>;
  }
  if (error || !order) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#FBF9F6]">
        <p className="text-red-600">{error ?? 'Order not found'}</p>
        <Link href="/admin/orders" className="text-neutral-700 underline hover:text-amber-700">Back to orders</Link>
      </main>
    );
  }

  const status = order.orderV2Status;
  /*
   * Confirm is the first forward step of the lifecycle and the gate in front of
   * shipping. Offered only once the money is in — confirming an unpaid order
   * would move it into fulfilment on a payment that may never land.
   */
  const canConfirm  = status === 'pending' && order.paymentV2Status === 'paid';
  const canShip     = ['confirmed','processing','packed'].includes(status);
  const canDeliver  = status === 'shipped' || status === 'out_for_delivery';
  /*
   * Only offered from `shipped` — it is the sole transition into
   * out_for_delivery, and the only one that sends that customer email.
   * Skipping it and going straight to Delivered stays valid.
   */
  const canOutForDelivery = status === 'shipped';
  const canCancel   = !['cancelled','delivered','refunded','returned','exchanged'].includes(status);
  const canRefund   = ['delivered','shipped','partially_refunded'].includes(status);
  const canReturn   = ['delivered','shipped','out_for_delivery'].includes(status);
  const canExchange = status === 'delivered';

  // First applicable forward-moving action gets primary (solid) emphasis; the rest stay
  // as quiet outline buttons so the action bar reads as one dominant next-step, not a
  // row of equally-weighted colored pills.
  const primaryAction: 'confirm' | 'ship' | 'deliver' | 'return' | 'exchange' | 'refund' | null =
    canConfirm ? 'confirm' : canShip ? 'ship' : canDeliver ? 'deliver' : canReturn ? 'return' : canExchange ? 'exchange' : canRefund ? 'refund' : null;

  return (
    <div>
      <div className="mx-auto max-w-5xl space-y-6">

        {/* ── Header ── */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-400">
              Order
            </p>
            <h1 className="mt-1 font-serif text-3xl text-neutral-900">{order.orderNumber}</h1>
            <p className="mt-2 text-sm text-neutral-500">
              Placed {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className={badge(status)}>{status.replace(/_/g, ' ')}</span>
              <span className={badge(order.paymentV2Status ?? '')}>{(order.paymentV2Status ?? '').replace(/_/g, ' ')}</span>
              <span className={badge(order.fulfillmentStatus ?? '')}>{(order.fulfillmentStatus ?? '').replace(/_/g, ' ')}</span>
            </div>
          </div>
          <Link href="/admin/orders" className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50">
            ← Back
          </Link>
        </div>

        {/* ── Action failure ──
           Sits above the action bar so it is impossible to miss. Previously an
           action that failed left no trace on screen at all. */}
        {actionError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3" role="alert">
            <p className="text-sm font-semibold text-red-800">That action did not go through</p>
            <p className="mt-1 text-sm text-red-700">{actionError}</p>
          </div>
        )}

        {/* ── Action Bar ── */}
        <div className="flex flex-wrap gap-2.5">
          {canConfirm  && <ActionBtn primary={primaryAction === 'confirm'}  onClick={() => { void doConfirm(); }} disabled={busy}>Confirm Order</ActionBtn>}
          {canShip     && <ActionBtn primary={primaryAction === 'ship'}     onClick={() => { setCourier(''); setAwb(''); setTracking(''); setExpected(''); setModal('ship'); }}>Ship Order</ActionBtn>}
          {canOutForDelivery && <ActionBtn onClick={() => { void doOutForDelivery(); }} disabled={busy}>Out for Delivery</ActionBtn>}
          {canDeliver  && <ActionBtn primary={primaryAction === 'deliver'}  onClick={() => { void doDeliver(); }} disabled={busy}>Mark Delivered</ActionBtn>}
          {canReturn   && <ActionBtn primary={primaryAction === 'return'}   onClick={() => { setReason(''); setModal('return'); }}>Request Return</ActionBtn>}
          {canExchange && <ActionBtn primary={primaryAction === 'exchange'} onClick={() => { setReason(''); setModal('exchange'); }}>Request Exchange</ActionBtn>}
          {status === 'delivered' && <ActionBtn onClick={() => { void doReviewReminder(); }} disabled={busy}>Send Review Reminder</ActionBtn>}
          {canRefund   && <ActionBtn primary={primaryAction === 'refund'}   onClick={() => { setReason(''); setRefundAmt(''); setRefundRef(''); setModal('refund'); }}>Issue Refund</ActionBtn>}
          {canCancel   && <ActionBtn destructive onClick={() => { setReason(''); setModal('cancel'); }}>Cancel Order</ActionBtn>}
          <ActionBtn onClick={() => { setReason(''); setModal('note'); }}>Add Note</ActionBtn>
          <ActionBtn onClick={openNotes}>Edit Notes</ActionBtn>
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
            {/* Gateway references — only the provider that actually handled
                this order writes its columns, so render whichever is present. */}
            <Row label="Razorpay Order" value={order.razorpayOrderId} />
            <Row label="Razorpay Pmnt"  value={order.razorpayPaymentId} />
            <Row label="Cashfree Order" value={order.cfOrderId} />
            <Row label="Cashfree Pmnt"  value={order.cfPaymentId} />
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
                <a href={order.courierUrl} target="_blank" rel="noopener noreferrer" className="text-neutral-700 underline hover:text-amber-700">Track</a>
              } />
            )}
            <Row label="Shipped At"          value={order.shippedAt ? new Date(order.shippedAt).toLocaleString('en-IN') : null} />
            <Row label="Expected Delivery"   value={order.expectedDeliveryDate ?? null} />
          </Section>
        )}

        {/* ── Order Items ── */}
        <section className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
          <div className="flex items-center gap-2 px-6 pt-6 pb-4">
            <span className="h-3.5 w-0.5 rounded-full" style={{ background: GOLD }} />
            <h2 className="text-xs font-bold uppercase tracking-[0.12em] text-neutral-700">Order Items</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-y border-neutral-200 text-left">
                <th className="px-6 py-3 font-medium text-neutral-500">Product</th>
                <th className="px-6 py-3 font-medium text-neutral-500">Variant</th>
                <th className="px-6 py-3 text-right font-medium text-neutral-500">Unit Price</th>
                <th className="px-6 py-3 text-right font-medium text-neutral-500">Qty</th>
                <th className="px-6 py-3 text-right font-medium text-neutral-500">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {(order.items ?? []).map((item) => (
                <tr key={item.id}>
                  <td className="px-6 py-3.5 font-medium text-neutral-900">
                    {item.productName}
                    {item.productSku && <span className="block text-xs font-normal text-neutral-400">{item.productSku}</span>}
                  </td>
                  <td className="px-6 py-3.5 text-neutral-600">{[item.variantColor, item.variantSize].filter(Boolean).join(' / ') || '—'}</td>
                  <td className="px-6 py-3.5 text-right text-neutral-600">{fmt(item.unitPrice)}</td>
                  <td className="px-6 py-3.5 text-right text-neutral-600">{item.quantity}</td>
                  <td className="px-6 py-3.5 text-right font-medium text-neutral-900">{fmt(item.lineTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="space-y-1 border-t border-neutral-200 px-6 py-5">
            <Row label="Subtotal"  value={fmt(order.subtotal)} />
            <Row label="Discount"  value={fmt(order.discount)} />
            <Row label="Shipping"  value={fmt(order.shippingFee)} />
            <Row label="Tax"       value={fmt(order.tax)} />
            <div className="flex items-baseline justify-between pt-3">
              <span className="text-xs font-bold uppercase tracking-[0.12em] text-neutral-500">Grand Total</span>
              <span className="font-serif text-2xl text-neutral-900">{fmt(order.grandTotal)}</span>
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
            <p className="text-sm text-neutral-400">No timeline events yet.</p>
          ) : (
            <ol className="relative space-y-4 border-l border-neutral-200 pl-6">
              {timeline.map((entry) => (
                <li key={entry.id} className="text-sm">
                  <div className="absolute -left-1.5 mt-1 h-3 w-3 rounded-full border border-white" style={{ background: GOLD }} />
                  <time className="text-xs text-neutral-400">{new Date(entry.createdAt).toLocaleString('en-IN')}</time>
                  <p className="font-medium capitalize text-neutral-900">{entry.event.replace(/_/g, ' ')}</p>
                  {entry.reason    && <p className="text-neutral-500">{entry.reason}</p>}
                  {entry.actorName && <p className="text-xs text-neutral-400">by {entry.actorName}</p>}
                  {entry.previousStatus && entry.newStatus && (
                    <p className="text-xs text-neutral-400">{entry.previousStatus} → {entry.newStatus}</p>
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
            <ModalActions onCancel={() => setModal(null)} onConfirm={() => { void doShip(); }} busy={busy} confirmLabel="Ship" />
          </div>
        </Modal>
      )}

      {modal === 'cancel' && (
        <Modal title="Cancel Order" onClose={() => setModal(null)}>
          <div className="space-y-4">
            <Field label="Reason *"><textarea value={reason} onChange={(e) => setReason(e.target.value)} className={`${inputCls} h-28 resize-none`} placeholder="Why is this order being cancelled?" /></Field>
            <ModalActions onCancel={() => setModal(null)} onConfirm={() => { void doCancel(); }} busy={busy} confirmLabel="Cancel Order" destructive />
          </div>
        </Modal>
      )}

      {modal === 'refund' && (
        <Modal title="Issue Refund" onClose={() => setModal(null)}>
          <div className="space-y-4">
            <Field label={`Amount (max ${fmt(order.grandTotal)}) *`}><input type="number" min="1" max={order.grandTotal} value={refundAmt} onChange={(e) => setRefundAmt(e.target.value)} className={inputCls} /></Field>
            <Field label="Reference (gateway refund ID)"><input value={refundRef} onChange={(e) => setRefundRef(e.target.value)} className={inputCls} /></Field>
            <Field label="Reason"><input value={reason} onChange={(e) => setReason(e.target.value)} className={inputCls} /></Field>
            <ModalActions onCancel={() => setModal(null)} onConfirm={() => { void doRefund(); }} busy={busy} confirmLabel="Issue Refund" />
          </div>
        </Modal>
      )}

      {modal === 'return' && (
        <Modal title="Request Return" onClose={() => setModal(null)}>
          <div className="space-y-4">
            <Field label="Reason *"><textarea value={reason} onChange={(e) => setReason(e.target.value)} className={`${inputCls} h-28 resize-none`} /></Field>
            <ModalActions onCancel={() => setModal(null)} onConfirm={() => { void doReturn(); }} busy={busy} confirmLabel="Request Return" />
          </div>
        </Modal>
      )}

      {modal === 'exchange' && (
        <Modal title="Request Exchange" onClose={() => setModal(null)}>
          <div className="space-y-4">
            <Field label="Reason *"><textarea value={reason} onChange={(e) => setReason(e.target.value)} className={`${inputCls} h-28 resize-none`} /></Field>
            <ModalActions onCancel={() => setModal(null)} onConfirm={() => { void doExchange(); }} busy={busy} confirmLabel="Request Exchange" />
          </div>
        </Modal>
      )}

      {modal === 'note' && (
        <Modal title="Add Timeline Note" onClose={() => setModal(null)}>
          <div className="space-y-4">
            <Field label="Note *"><textarea value={reason} onChange={(e) => setReason(e.target.value)} className={`${inputCls} h-28 resize-none`} placeholder="Internal note visible on timeline…" /></Field>
            <ModalActions onCancel={() => setModal(null)} onConfirm={() => { void doNote(); }} busy={busy} confirmLabel="Add Note" />
          </div>
        </Modal>
      )}

      {modal === 'notes' && (
        <Modal title="Edit Order Notes" onClose={() => setModal(null)}>
          <div className="space-y-4">
            <Field label="Internal Notes"><textarea value={internalNote} onChange={(e) => setInternal(e.target.value)} className={`${inputCls} h-20 resize-none`} placeholder="Visible only to admin" /></Field>
            <Field label="Customer Notes"><textarea value={customerNote} onChange={(e) => setCustomer(e.target.value)} className={`${inputCls} h-20 resize-none`} placeholder="Visible to customer" /></Field>
            <Field label="Packing Notes"><textarea value={packingNote}  onChange={(e) => setPacking(e.target.value)}  className={`${inputCls} h-20 resize-none`} placeholder="For warehouse" /></Field>
            <ModalActions onCancel={() => setModal(null)} onConfirm={() => { void doSaveNotes(); }} busy={busy} confirmLabel="Save Notes" />
          </div>
        </Modal>
      )}

    </div>
  );
}

// ─── Tiny shared sub-components ──────────────────────────────────────────────

const inputCls = 'w-full rounded-lg border border-neutral-300 px-3.5 py-2 text-sm shadow-sm focus:border-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-600';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block space-y-1"><span className="text-sm font-medium text-neutral-700">{label}</span>{children}</label>;
}

function ModalActions({ onCancel, onConfirm, busy, confirmLabel, destructive }: {
  onCancel:     () => void;
  onConfirm:    () => void;
  busy:         boolean;
  confirmLabel: string;
  destructive?: boolean;
}) {
  return (
    <div className="flex justify-end gap-2.5 pt-2">
      <button onClick={onCancel} disabled={busy} className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50">Cancel</button>
      <button
        onClick={onConfirm}
        disabled={busy}
        className={`rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors disabled:opacity-50 ${
          destructive ? 'bg-red-600 hover:bg-red-700' : 'bg-neutral-900 hover:bg-amber-700'
        }`}
      >
        {busy ? 'Please wait…' : confirmLabel}
      </button>
    </div>
  );
}

function ActionBtn({ primary, destructive, onClick, disabled, children }: {
  primary?: boolean;
  destructive?: boolean;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  const style = primary
    ? 'border-neutral-900 bg-neutral-900 text-white hover:bg-amber-700 hover:border-amber-700'
    : destructive
    ? 'border-red-200 text-red-700 hover:bg-red-50'
    : 'border-neutral-300 text-neutral-700 hover:bg-neutral-50';
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${style}`}
    >
      {children}
    </button>
  );
}
