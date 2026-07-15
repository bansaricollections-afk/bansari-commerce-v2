"use client";

import { useEffect, useState } from "react";
import {
  TrendingUp,
  ShoppingBag,
  BadgeDollarSign,
  PackageCheck,
  XCircle,
  Clock,
} from "lucide-react";

type Summary = {
  total_revenue: number;
  total_orders: number;
  average_order_value: number;
  delivered_orders: number;
  cancelled_orders: number;
  pending_orders: number;
};

type TopProduct = {
  product_name: string;
  product_sku: string | null;
  quantity_sold: number;
  revenue: number;
};

type DailyRevenue = {
  date: string;
  revenue: number;
  orders: number;
};

function fmt(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className={`flex size-11 items-center justify-center rounded-full ${color}`}>
        <Icon className="size-5" />
      </div>
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
        <p className="mt-0.5 text-xl font-bold text-slate-900">{value}</p>
      </div>
    </div>
  );
}

export function AdminAnalytics() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [daily, setDaily] = useState<DailyRevenue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/analytics").then((r) => r.json()),
      fetch("/api/admin/analytics/top-products").then((r) => r.json()),
      fetch("/api/admin/analytics/daily").then((r) => r.json()),
    ])
      .then(([s, tp, d]) => {
        setSummary(s);
        setTopProducts(tp);
        setDaily(d);
      })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return (
      <div className="flex items-center gap-3 py-10">
        <div className="size-5 animate-spin rounded-full border-2 border-[#8A5A6A] border-t-transparent" />
        <span className="text-sm text-slate-500">Loading analytics…</span>
      </div>
    );

  if (error)
    return (
      <div className="rounded-xl border border-red-100 bg-red-50 px-6 py-4 text-sm text-red-700">
        {error}
      </div>
    );

  if (!summary) return null;

  const maxRev = Math.max(...daily.map((d) => d.revenue), 1);

  return (
    <div className="space-y-8">
      {/* KPI grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatCard label="Total Revenue" value={fmt(summary.total_revenue)} icon={TrendingUp} color="bg-emerald-50 text-emerald-600" />
        <StatCard label="Total Orders" value={summary.total_orders} icon={ShoppingBag} color="bg-blue-50 text-blue-600" />
        <StatCard label="Avg. Order Value" value={fmt(summary.average_order_value)} icon={BadgeDollarSign} color="bg-violet-50 text-violet-600" />
        <StatCard label="Delivered" value={summary.delivered_orders} icon={PackageCheck} color="bg-teal-50 text-teal-600" />
        <StatCard label="Cancelled" value={summary.cancelled_orders} icon={XCircle} color="bg-red-50 text-red-500" />
        <StatCard label="Pending" value={summary.pending_orders} icon={Clock} color="bg-amber-50 text-amber-600" />
      </div>

      {/* Revenue bar chart (CSS-only) */}
      {daily.length > 0 && (
        <div className="rounded-2xl border border-slate-100 bg-white p-6">
          <h2 className="mb-4 text-sm font-semibold text-slate-700">Revenue — Last 30 Days</h2>
          <div className="flex h-40 items-end gap-1 overflow-x-auto pb-1">
            {daily.map((d) => (
              <div key={d.date} className="group relative flex flex-1 flex-col items-center">
                <div
                  className="w-full min-w-[6px] rounded-t bg-[#8A5A6A]/70 transition-all hover:bg-[#8A5A6A]"
                  style={{ height: `${(d.revenue / maxRev) * 100}%` }}
                />
                {/* tooltip */}
                <span className="pointer-events-none absolute bottom-full mb-1 hidden whitespace-nowrap rounded bg-slate-800 px-2 py-1 text-xs text-white group-hover:block">
                  {d.date}: {fmt(d.revenue)}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-right text-xs text-slate-400">{daily.length} days</p>
        </div>
      )}

      {/* Top products */}
      {topProducts.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white">
          <div className="border-b border-slate-100 px-6 py-4">
            <h2 className="text-sm font-semibold text-slate-700">Top Products by Revenue</h2>
          </div>
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-5 py-3">#</th>
                <th className="px-5 py-3">Product</th>
                <th className="px-5 py-3">SKU</th>
                <th className="px-5 py-3">Units Sold</th>
                <th className="px-5 py-3">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {topProducts.map((p, i) => (
                <tr key={i} className="hover:bg-slate-50">
                  <td className="px-5 py-3.5 text-slate-400">{i + 1}</td>
                  <td className="px-5 py-3.5 font-medium text-slate-900">{p.product_name}</td>
                  <td className="px-5 py-3.5 font-mono text-xs text-slate-500">{p.product_sku ?? "—"}</td>
                  <td className="px-5 py-3.5 text-slate-700">{p.quantity_sold}</td>
                  <td className="px-5 py-3.5 font-semibold text-slate-900">{fmt(p.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
