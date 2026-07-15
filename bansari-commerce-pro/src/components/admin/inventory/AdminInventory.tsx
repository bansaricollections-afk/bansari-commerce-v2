"use client";

import { useEffect, useState, useCallback } from "react";
import { Boxes, Search, AlertTriangle, Check, X } from "lucide-react";

type InventoryRow = {
  id: number;
  name: string;
  sku: string;
  category: string;
  stock: number;
  price: number;
  active: boolean;
  updated_at: string;
};

const LOW = 10;

function fmt(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

export function AdminInventory() {
  const [items, setItems] = useState<InventoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "low" | "out">("all");
  const [editing, setEditing] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/admin/inventory")
      .then((r) => (r.ok ? r.json() : Promise.reject(r.statusText)))
      .then((d) => setItems(d))
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = items
    .filter((i) => {
      const matchSearch =
        i.name.toLowerCase().includes(search.toLowerCase()) ||
        i.sku.toLowerCase().includes(search.toLowerCase());
      if (!matchSearch) return false;
      if (filter === "low") return i.stock > 0 && i.stock <= LOW;
      if (filter === "out") return i.stock === 0;
      return true;
    });

  async function saveStock(id: number) {
    const val = parseInt(editValue, 10);
    if (isNaN(val) || val < 0) {
      setSaveError("Stock must be a non-negative integer.");
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch("/api/admin/inventory", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, stock: val }),
      });
      if (!res.ok) throw new Error(await res.text());
      setItems((prev) =>
        prev.map((i) =>
          i.id === id ? { ...i, stock: val } : i
        )
      );
      setEditing(null);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      {/* Controls */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-52">
          <Search className="absolute left-3 top-2.5 size-4 text-slate-400" />
          <input
            type="search"
            placeholder="Search product or SKU…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-4 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#8A5A6A]/30"
          />
        </div>
        <div className="flex gap-2">
          {(["all", "low", "out"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-lg px-4 py-2 text-xs font-semibold transition ${
                filter === f
                  ? "bg-[#8A5A6A] text-white"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              {f === "all" ? "All" : f === "low" ? "Low Stock" : "Out of Stock"}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="flex items-center gap-3 px-6 py-10">
          <div className="size-5 animate-spin rounded-full border-2 border-[#8A5A6A] border-t-transparent" />
          <span className="text-sm text-slate-500">Loading inventory…</span>
        </div>
      )}
      {error && (
        <div className="rounded-xl border border-red-100 bg-red-50 px-6 py-4 text-sm text-red-700">{error}</div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="flex min-h-[280px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white">
          <Boxes className="mb-3 size-10 text-slate-300" />
          <p className="text-sm text-slate-500">No items match your filter.</p>
        </div>
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          {saveError && (
            <div className="border-b border-red-100 bg-red-50 px-5 py-2 text-xs text-red-700">{saveError}</div>
          )}
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-3.5">Product</th>
                  <th className="px-5 py-3.5">SKU</th>
                  <th className="px-5 py-3.5">Category</th>
                  <th className="px-5 py-3.5">Price</th>
                  <th className="px-5 py-3.5">Stock</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((item) => {
                  const isLow = item.stock > 0 && item.stock <= LOW;
                  const isOut = item.stock === 0;
                  const isEditing = editing === item.id;
                  return (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="px-5 py-4 font-medium text-slate-900">{item.name}</td>
                      <td className="px-5 py-4 font-mono text-xs text-slate-500">{item.sku}</td>
                      <td className="px-5 py-4 text-slate-600">{item.category}</td>
                      <td className="px-5 py-4 text-slate-700">{fmt(item.price)}</td>
                      <td className="px-5 py-4">
                        {isEditing ? (
                          <input
                            type="number"
                            min={0}
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="w-20 rounded border border-slate-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#8A5A6A]/30"
                            autoFocus
                          />
                        ) : (
                          <span
                            className={`font-semibold ${
                              isOut ? "text-red-600" : isLow ? "text-amber-600" : "text-slate-900"
                            }`}
                          >
                            {item.stock}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        {isOut ? (
                          <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-600">Out of Stock</span>
                        ) : isLow ? (
                          <span className="flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                            <AlertTriangle className="size-3" /> Low
                          </span>
                        ) : (
                          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">In Stock</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            <button
                              disabled={saving}
                              onClick={() => saveStock(item.id)}
                              className="flex size-7 items-center justify-center rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-50"
                            >
                              <Check className="size-3.5" />
                            </button>
                            <button
                              onClick={() => { setEditing(null); setSaveError(null); }}
                              className="flex size-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100"
                            >
                              <X className="size-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => { setEditing(item.id); setEditValue(String(item.stock)); }}
                            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          >
                            Edit Stock
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="border-t border-slate-100 px-5 py-3 text-xs text-slate-400">
            {filtered.length} product{filtered.length !== 1 ? "s" : ""}
          </div>
        </div>
      )}
    </div>
  );
}
