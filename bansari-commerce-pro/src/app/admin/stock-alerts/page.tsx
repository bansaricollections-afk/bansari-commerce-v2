import type { Metadata } from 'next';
import Link from 'next/link';

import { createServiceRoleClient } from '@/lib/supabase/service';

/**
 * /admin/stock-alerts — shoppers waiting for a sold-out size.
 *
 * Read-only. Grouped by product and size, most-wanted first, because the
 * point is a restock decision: which size of which piece people asked for.
 * Emails are listed so the owner can write when the size is back; nothing is
 * sent automatically yet.
 */

export const metadata: Metadata = {
  title: 'Waiting for Stock | Bansari Commerce Pro',
  description: 'Back-in-stock requests by product and size.',
};

export const dynamic = 'force-dynamic';

type Row = {
  product_id: number;
  size_label: string | null;
  email: string;
  created_at: string;
  products: { name: string } | { name: string }[] | null;
};

export default async function StockAlertsPage() {
  const sb = createServiceRoleClient();
  const { data, error } = await sb
    .from('back_in_stock_requests')
    .select('product_id, size_label, email, created_at, products(name)')
    .is('notified_at', null)
    .order('created_at', { ascending: false })
    .limit(1000);

  const groups = new Map<string, { productId: number; name: string; size: string; emails: { email: string; at: string }[] }>();
  for (const r of (data ?? []) as Row[]) {
    const product = Array.isArray(r.products) ? r.products[0] : r.products;
    const key = `${r.product_id}:${r.size_label ?? ''}`;
    const g = groups.get(key) ?? {
      productId: r.product_id,
      name: product?.name ?? `Product #${r.product_id}`,
      size: r.size_label ?? '—',
      emails: [],
    };
    g.emails.push({ email: r.email, at: r.created_at });
    groups.set(key, g);
  }
  const rows = [...groups.values()].sort((a, b) => b.emails.length - a.emails.length);

  return (
    <div className="space-y-8">
      <header>
        <nav className="mb-2 flex items-center gap-1.5 text-xs text-slate-500">
          <Link href="/admin" className="hover:text-slate-700">Dashboard</Link>
          <span>/</span>
          <span className="font-medium text-slate-800">Waiting for stock</span>
        </nav>
        <h1 className="text-2xl font-bold text-slate-950">Waiting for stock</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          Shoppers who asked to be told when a sold-out size is back. Most-requested first —
          use it to decide what to restock. Emails are not sent automatically: when a size is
          back, write to these customers yourself.
        </p>
      </header>

      {error ? (
        <p className="rounded border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Could not load requests. If this is new, the back_in_stock_requests migration may not have been run yet.
        </p>
      ) : rows.length === 0 ? (
        <p className="rounded border border-slate-200 bg-white p-6 text-sm text-slate-600">
          No one is waiting for a size right now.
        </p>
      ) : (
        <div className="overflow-x-auto rounded border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Size</th>
                <th className="px-4 py-3">Waiting</th>
                <th className="px-4 py-3">Emails</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((g) => (
                <tr key={`${g.productId}:${g.size}`} className="align-top">
                  <td className="px-4 py-3">
                    <Link href={`/admin/products/${g.productId}`} className="font-medium text-slate-900 hover:underline">
                      {g.name}
                    </Link>
                    <div className="text-xs text-slate-500">#{g.productId}</div>
                  </td>
                  <td className="px-4 py-3 font-medium">{g.size}</td>
                  <td className="px-4 py-3 font-semibold tabular-nums">{g.emails.length}</td>
                  <td className="px-4 py-3 text-slate-700">
                    {g.emails.map((e) => (
                      <div key={e.email}>
                        {e.email}{' '}
                        <span className="text-xs text-slate-400">
                          {new Date(e.at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </span>
                      </div>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
