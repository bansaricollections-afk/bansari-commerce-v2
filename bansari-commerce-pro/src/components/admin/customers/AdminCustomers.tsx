"use client";

import { useEffect, useState } from "react";
import { Users, Search, ChevronUp, ChevronDown } from "lucide-react";

type CustomerSummary = {
  email: string;
  name: string;
  phone: string | null;
  order_count: number;
  total_spent: number;
  last_order_at: string;
};

type SortKey = keyof CustomerSummary;

function fmt(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function AdminCustomers() {
  const [customers, setCustomers] = useState<CustomerSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("last_order_at");
  const [sortAsc, setSortAsc] = useState(false);

  useEffect(() => {
    fetch("/api/admin/customers")
      .then((r) => (r.ok ? r.json() : Promise.reject(r.statusText)))
      .then((d) => setCustomers(d))
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  const filtered = customers
    .filter(
      (c) =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.email.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === "number" && typeof bv === "number")
        return sortAsc ? av - bv : bv - av;
      return sortAsc
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc((p) => !p);
    else { setSortKey(key); setSortAsc(false); }
  }

  const SortIcon = ({ k }: { k: SortKey }) =>
    sortKey === k ? (
      sortAsc ? <ChevronUp className="inline size-3" /> : <ChevronDown className="inline size-3" />
    ) : null;

  return (
    <div>
      {/* Search */}
      <div className="relative mb-5 max-w-sm">
        <Search className="absolute left-3 top-2.5 size-4 text-slate-400" />
        <input
          type="search"
          placeholder="Search by name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-4 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#8A5A6A]/30"
        />
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white px-6 py-10">
          <div className="size-5 animate-spin rounded-full border-2 border-[#8A5A6A] border-t-transparent" />
          <span className="text-sm text-slate-500">Loading customers…</span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-100 bg-red-50 px-6 py-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Empty */}
      {!loading && !error && filtered.length === 0 && (
        <div className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white text-center">
          <Users className="mb-3 size-10 text-slate-300" />
          <p className="text-sm text-slate-500">No customers found.</p>
        </div>
      )}

      {/* Table */}
      {!loading && !error && filtered.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {[
                    { label: "Customer", k: "name" as SortKey },
                    { label: "Email", k: "email" as SortKey },
                    { label: "Phone", k: "phone" as SortKey },
                    { label: "Orders", k: "order_count" as SortKey },
                    { label: "Spent", k: "total_spent" as SortKey },
                    { label: "Last Order", k: "last_order_at" as SortKey },
                  ].map(({ label, k }) => (
                    <th
                      key={k}
                      onClick={() => toggleSort(k)}
                      className="cursor-pointer px-5 py-3.5 hover:text-slate-800"
                    >
                      {label} <SortIcon k={k} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((c) => (
                  <tr key={c.email} className="hover:bg-slate-50">
                    <td className="px-5 py-4 font-medium text-slate-900">{c.name}</td>
                    <td className="px-5 py-4 text-slate-600">{c.email}</td>
                    <td className="px-5 py-4 text-slate-600">{c.phone ?? "—"}</td>
                    <td className="px-5 py-4 text-slate-700">{c.order_count}</td>
                    <td className="px-5 py-4 font-semibold text-slate-900">{fmt(c.total_spent)}</td>
                    <td className="px-5 py-4 text-slate-500">{fmtDate(c.last_order_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-slate-100 px-5 py-3 text-xs text-slate-400">
            {filtered.length} customer{filtered.length !== 1 ? "s" : ""}
          </div>
        </div>
      )}
    </div>
  );
}
