'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';

// ─── Types ──────────────────────────────────────────────────────────────────

type OrderRow = {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  grandTotal: number;
  currency: string;
  orderV2Status: string;
  paymentV2Status: string;
  fulfillmentStatus: string;
  createdAt: string;
};

type ApiResponse = {
  success: boolean;
  data: { data: OrderRow[]; total: number; page: number; pageSize: number };
};

const ORDER_STATUSES = [
  'pending', 'confirmed', 'processing', 'packed',
  'shipped', 'out_for_delivery', 'delivered',
  'cancelled', 'return_requested', 'returned',
  'exchange_requested', 'exchanged',
  'partially_refunded', 'refunded',
];

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
  exchanged:          'bg-amber-50 text-amber-800',
  partially_refunded: 'bg-pink-50 text-pink-700',
  refunded:           'bg-pink-50 text-pink-700',
};

const PAGE_SIZE = 20;

// ─── Component ──────────────────────────────────────────────────────────────

export default function OrdersPage() {
  const [orders, setOrders]   = useState<OrderRow[]>([]);
  const [total, setTotal]     = useState(0);
  const [page, setPage]       = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  // filters
  const [search, setSearch]   = useState('');
  const [status, setStatus]   = useState('');
  const searchRef             = useRef<HTMLInputElement>(null);

  const totalPages  = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const fetchOrders = useCallback(async (p: number, q: string, st: string) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page:     String(p),
        pageSize: String(PAGE_SIZE),
        sortBy:   'created_at',
        sortDir:  'desc',
      });
      if (q)  params.set('q',             q);
      if (st) params.set('orderV2Status', st);

      const res  = await fetch(`/api/admin/orders?${params.toString()}`);
      const json = (await res.json()) as ApiResponse;
      if (!json.success) throw new Error('Failed to load orders');

      setOrders(json.data.data);
      setTotal(json.data.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchOrders(page, search, status);
  }, [page, status, fetchOrders]); // search is submitted manually

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = searchRef.current?.value.trim() ?? '';
    setSearch(q);
    setPage(0);
    void fetchOrders(0, q, status);
  }

  function handleStatusChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setStatus(e.target.value);
    setPage(0);
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-400">
          Commerce Operations
        </p>
        <h1 className="mt-1 font-serif text-3xl text-neutral-900">Orders</h1>
        <p className="mt-2 text-sm text-neutral-500">Manage and fulfil customer orders.</p>
      </div>

      {/* Filters */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            ref={searchRef}
            defaultValue={search}
            placeholder="Search order # / customer / AWB"
            className="w-72 rounded-lg border border-neutral-300 px-3.5 py-2 text-sm shadow-sm focus:border-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-600"
          />
          <button
            type="submit"
            className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-700"
          >
            Search
          </button>
        </form>

        <select
          value={status}
          onChange={handleStatusChange}
          className="rounded-lg border border-neutral-300 px-3.5 py-2 text-sm shadow-sm focus:border-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-600"
        >
          <option value="">All Statuses</option>
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
          ))}
        </select>

        <span className="ml-auto text-sm text-neutral-500">
          {total} order{total !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
        {error ? (
          <p className="p-12 text-center text-red-600">{error}</p>
        ) : loading ? (
          <p className="p-12 text-center text-neutral-400">Loading orders…</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-left">
                <th className="px-5 py-3 font-medium text-neutral-500">Order #</th>
                <th className="px-5 py-3 font-medium text-neutral-500">Customer</th>
                <th className="px-5 py-3 font-medium text-neutral-500">Total</th>
                <th className="px-5 py-3 font-medium text-neutral-500">Status</th>
                <th className="px-5 py-3 font-medium text-neutral-500">Payment</th>
                <th className="px-5 py-3 font-medium text-neutral-500">Date</th>
                <th className="px-5 py-3 font-medium text-neutral-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {orders.length > 0 ? orders.map((order) => (
                <tr key={order.id} className="transition-colors hover:bg-neutral-50/70">
                  <td className="px-5 py-3.5 font-medium text-neutral-900">{order.orderNumber}</td>
                  <td className="px-5 py-3.5">
                    <div className="font-medium text-neutral-900">{order.customerName}</div>
                    <div className="text-xs text-neutral-500">{order.customerEmail}</div>
                  </td>
                  <td className="px-5 py-3.5 font-medium text-neutral-900">₹{Number(order.grandTotal).toLocaleString('en-IN')}</td>
                  <td className="px-5 py-3.5">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_COLORS[order.orderV2Status] ?? 'bg-neutral-100 text-neutral-700'}`}>
                      {order.orderV2Status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-neutral-600">{order.paymentV2Status?.replace(/_/g, ' ') ?? '—'}</span>
                  </td>
                  <td className="px-5 py-3.5 text-neutral-600">
                    {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-5 py-3.5">
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="font-medium text-neutral-700 hover:text-amber-700 hover:underline"
                    >
                      View →
                    </Link>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={7} className="px-6 py-14 text-center text-neutral-500">No orders found.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      <div className="mt-5 flex items-center justify-between">
        <button
          onClick={() => setPage((p) => Math.max(0, p - 1))}
          disabled={page === 0 || loading}
          className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Previous
        </button>
        <span className="text-sm text-neutral-500">Page {page + 1} of {totalPages}</span>
        <button
          onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
          disabled={page >= totalPages - 1 || loading}
          className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}
