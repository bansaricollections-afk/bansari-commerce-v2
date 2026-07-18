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
  exchanged:          'bg-amber-100 text-amber-800',
  partially_refunded: 'bg-pink-100 text-pink-800',
  refunded:           'bg-pink-100 text-pink-800',
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
    <main className="min-h-screen bg-[#F8F8F8]">
      <div className="mx-auto max-w-7xl px-6 py-12">

        {/* Header */}
        <div className="mb-10 flex items-center justify-between">
          <div>
            <h1 className="font-[family:var(--font-playfair)] text-5xl font-bold">Orders</h1>
            <p className="mt-3 text-gray-600">Manage and fulfil customer orders.</p>
          </div>
          <Link
            href="/admin"
            className="rounded-full border border-[#8A5A6A] px-6 py-3 font-medium text-[#8A5A6A] transition hover:bg-[#8A5A6A] hover:text-white"
          >
            Dashboard
          </Link>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              ref={searchRef}
              defaultValue={search}
              placeholder="Search order # / customer / AWB"
              className="w-72 rounded-full border border-gray-300 px-5 py-2 text-sm focus:border-[#8A5A6A] focus:outline-none"
            />
            <button
              type="submit"
              className="rounded-full bg-[#8A5A6A] px-5 py-2 text-sm font-medium text-white transition hover:bg-[#7a4a5a]"
            >
              Search
            </button>
          </form>

          <select
            value={status}
            onChange={handleStatusChange}
            className="rounded-full border border-gray-300 px-5 py-2 text-sm focus:border-[#8A5A6A] focus:outline-none"
          >
            <option value="">All Statuses</option>
            {ORDER_STATUSES.map((s) => (
              <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
            ))}
          </select>

          <span className="ml-auto text-sm text-gray-500">
            {total} order{total !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-3xl bg-white shadow-sm">
          {error ? (
            <p className="p-12 text-center text-red-500">{error}</p>
          ) : loading ? (
            <p className="p-12 text-center text-gray-400">Loading orders…</p>
          ) : (
            <table className="w-full">
              <thead className="bg-[#FAF8F5]">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Order #</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Customer</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Total</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Payment</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Date</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.length > 0 ? orders.map((order) => (
                  <tr key={order.id} className="border-t hover:bg-[#FAFAFA] transition">
                    <td className="px-6 py-4 font-medium">{order.orderNumber}</td>
                    <td className="px-6 py-4">
                      <div className="font-medium">{order.customerName}</div>
                      <div className="text-xs text-gray-500">{order.customerEmail}</div>
                    </td>
                    <td className="px-6 py-4">₹{Number(order.grandTotal).toLocaleString('en-IN')}</td>
                    <td className="px-6 py-4">
                      <span className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_COLORS[order.orderV2Status] ?? 'bg-gray-100 text-gray-700'}`}>
                        {order.orderV2Status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600">{order.paymentV2Status?.replace(/_/g, ' ') ?? '—'}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="font-medium text-[#8A5A6A] hover:underline"
                      >
                        View →
                      </Link>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">No orders found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        <div className="mt-6 flex items-center justify-between">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0 || loading}
            className="rounded-full border border-[#8A5A6A] px-6 py-3 font-medium text-[#8A5A6A] transition hover:bg-[#8A5A6A] hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="text-sm text-gray-600">Page {page + 1} of {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1 || loading}
            className="rounded-full border border-[#8A5A6A] px-6 py-3 font-medium text-[#8A5A6A] transition hover:bg-[#8A5A6A] hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>

      </div>
    </main>
  );
}
