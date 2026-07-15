"use client";

import { useEffect, useState } from "react";
import { Tags, Pencil, Check, X } from "lucide-react";

type CategorySummary = {
  name: string;
  product_count: number;
  active_count: number;
};

export function AdminCategories() {
  const [categories, setCategories] = useState<CategorySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    fetch("/api/admin/categories")
      .then((r) => (r.ok ? r.json() : Promise.reject(r.statusText)))
      .then((d) => setCategories(d))
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function saveRename(oldName: string) {
    const newName = renameValue.trim();
    if (!newName || newName === oldName) { setRenaming(null); return; }
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch("/api/admin/categories", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ old_name: oldName, new_name: newName }),
      });
      if (!res.ok) throw new Error(await res.text());
      setCategories((prev) =>
        prev.map((c) => (c.name === oldName ? { ...c, name: newName } : c))
      );
      setRenaming(null);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      {loading && (
        <div className="flex items-center gap-3 py-10">
          <div className="size-5 animate-spin rounded-full border-2 border-[#8A5A6A] border-t-transparent" />
          <span className="text-sm text-slate-500">Loading categories…</span>
        </div>
      )}
      {error && (
        <div className="rounded-xl border border-red-100 bg-red-50 px-6 py-4 text-sm text-red-700">{error}</div>
      )}
      {!loading && !error && categories.length === 0 && (
        <div className="flex min-h-[280px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white">
          <Tags className="mb-3 size-10 text-slate-300" />
          <p className="text-sm text-slate-500">No categories found.</p>
        </div>
      )}
      {!loading && !error && categories.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          {saveError && (
            <div className="border-b border-red-100 bg-red-50 px-5 py-2 text-xs text-red-700">{saveError}</div>
          )}
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-3.5">Category Name</th>
                  <th className="px-5 py-3.5">Total Products</th>
                  <th className="px-5 py-3.5">Active Products</th>
                  <th className="px-5 py-3.5">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {categories.map((cat) => {
                  const isRenaming = renaming === cat.name;
                  return (
                    <tr key={cat.name} className="hover:bg-slate-50">
                      <td className="px-5 py-4 font-medium text-slate-900">
                        {isRenaming ? (
                          <input
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            className="rounded border border-slate-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#8A5A6A]/30"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter") saveRename(cat.name);
                              if (e.key === "Escape") setRenaming(null);
                            }}
                          />
                        ) : (
                          cat.name
                        )}
                      </td>
                      <td className="px-5 py-4 text-slate-700">{cat.product_count}</td>
                      <td className="px-5 py-4 text-slate-700">{cat.active_count}</td>
                      <td className="px-5 py-4">
                        {isRenaming ? (
                          <div className="flex items-center gap-2">
                            <button
                              disabled={saving}
                              onClick={() => saveRename(cat.name)}
                              className="flex size-7 items-center justify-center rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-50"
                            >
                              <Check className="size-3.5" />
                            </button>
                            <button
                              onClick={() => { setRenaming(null); setSaveError(null); }}
                              className="flex size-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100"
                            >
                              <X className="size-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => { setRenaming(cat.name); setRenameValue(cat.name); }}
                            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          >
                            <Pencil className="size-3" /> Rename
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
            {categories.length} categor{categories.length !== 1 ? "ies" : "y"}
          </div>
        </div>
      )}
    </div>
  );
}
