"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  Edit,
  Loader2,
  Plus,
  Search,
  TicketPercent,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type DiscountType = "percentage" | "flat";

type Coupon = {
  id: string;
  code: string;
  description: string | null;
  discount_type: DiscountType;
  discount_value: number;
  min_order: number;
  max_uses: number | null;
  uses_count: number;
  active: boolean;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
};

type CouponFormState = {
  code: string;
  description: string;
  discount_type: DiscountType;
  discount_value: string;
  min_order: string;
  max_uses: string;
  active: boolean;
  expires_at: string;
};

type FieldErrors = Partial<Record<keyof CouponFormState, string>>;

type ApiListResponse = {
  success: boolean;
  data: Coupon[];
  total: number;
  page: number;
  pageSize: number;
};

type ApiSingleResponse = {
  success: boolean;
  data: Coupon;
};

type ApiErrorResponse = {
  success: false;
  error: { code: string; message: string };
};

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 50;

const emptyForm: CouponFormState = {
  code: "",
  description: "",
  discount_type: "percentage",
  discount_value: "",
  min_order: "0",
  max_uses: "",
  active: true,
  expires_at: "",
};

// ─── Fetch helper ──────────────────────────────────────────────────────────────

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) },
    ...options,
  });
  if (!res.ok) {
    let errMsg = `HTTP ${res.status}`;
    try {
      const errBody = (await res.json()) as ApiErrorResponse;
      if (errBody?.error?.message) errMsg = errBody.error.message;
    } catch { /* ignore */ }
    throw new Error(errMsg);
  }
  return res.json() as Promise<T>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDiscount(c: Coupon): string {
  return c.discount_type === "percentage"
    ? `${c.discount_value}% off`
    : `₹${c.discount_value.toLocaleString("en-IN")} off`;
}

function isExpired(c: Coupon): boolean {
  if (!c.expires_at) return false;
  return new Date(c.expires_at) < new Date();
}

function validateForm(form: CouponFormState): FieldErrors {
  const errors: FieldErrors = {};
  if (!form.code.trim()) errors.code = "Code is required.";
  if (form.discount_type !== "percentage" && form.discount_type !== "flat")
    errors.discount_type = "Select a discount type.";
  const dv = Number(form.discount_value);
  if (!form.discount_value || !Number.isFinite(dv) || dv <= 0)
    errors.discount_value = "Enter a positive discount value.";
  if (form.discount_type === "percentage" && dv > 100)
    errors.discount_value = "Percentage cannot exceed 100.";
  return errors;
}

// ─── ToggleSwitch (local, same as ProductManagement) ─────────────────────────

function ToggleSwitch({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <label className="flex items-center justify-between cursor-pointer rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 hover:bg-gray-100 transition-colors">
      <div>
        <span className="font-medium text-sm text-gray-800">{label}</span>
        {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent",
          "transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1",
          checked ? "bg-indigo-600" : "bg-gray-300"
        )}
      >
        <span
          className={cn(
            "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition-transform duration-200",
            checked ? "translate-x-5" : "translate-x-0"
          )}
        />
      </button>
    </label>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function CouponManagement() {
  const [coupons, setCoupons]         = useState<Coupon[]>([]);
  const [total, setTotal]             = useState(0);
  const [isLoading, setIsLoading]     = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editCoupon, setEditCoupon]   = useState<Coupon | null>(null);
  const [form, setForm]               = useState<CouponFormState>({ ...emptyForm });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [isSaving, setIsSaving]       = useState(false);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [couponToDelete, setCouponToDelete]     = useState<Coupon | null>(null);
  const [isDeleting, setIsDeleting]             = useState(false);

  // ── Load ──────────────────────────────────────────────────────────────────

  const loadCoupons = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ limit: String(PAGE_SIZE) });
      if (searchQuery.trim()) params.set("q", searchQuery.trim());
      const res = await apiFetch<ApiListResponse>(`/api/admin/coupons?${params.toString()}`);
      setCoupons(res.data ?? []);
      setTotal(res.total ?? 0);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load coupons.");
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => { void loadCoupons(); }, [loadCoupons]);

  // ── Form helpers ──────────────────────────────────────────────────────────

  const setField = useCallback(
    <K extends keyof CouponFormState>(key: K, value: CouponFormState[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
      setFieldErrors((prev) => { const next = { ...prev }; delete next[key]; return next; });
    },
    []
  );

  // ── Open new / edit ───────────────────────────────────────────────────────

  const openNew = useCallback(() => {
    setEditCoupon(null);
    setForm({ ...emptyForm });
    setFieldErrors({});
    setIsSheetOpen(true);
  }, []);

  const openEdit = useCallback((c: Coupon) => {
    setEditCoupon(c);
    setForm({
      code:           c.code,
      description:    c.description ?? "",
      discount_type:  c.discount_type,
      discount_value: String(c.discount_value),
      min_order:      String(c.min_order),
      max_uses:       c.max_uses != null ? String(c.max_uses) : "",
      active:         c.active,
      expires_at:     c.expires_at ? c.expires_at.slice(0, 16) : "", // datetime-local input format
    });
    setFieldErrors({});
    setIsSheetOpen(true);
  }, []);

  // ── Save ──────────────────────────────────────────────────────────────────

  const handleSave = useCallback(async () => {
    const errors = validateForm(form);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      toast.error("Please fix the highlighted errors.");
      return;
    }
    setIsSaving(true);
    try {
      const payload = {
        code:           form.code.trim().toUpperCase(),
        description:    form.description.trim() || null,
        discount_type:  form.discount_type,
        discount_value: Number(form.discount_value),
        min_order:      Number(form.min_order) || 0,
        max_uses:       form.max_uses ? Number(form.max_uses) : null,
        active:         form.active,
        expires_at:     form.expires_at ? new Date(form.expires_at).toISOString() : null,
      };

      if (editCoupon) {
        await apiFetch<ApiSingleResponse>(`/api/admin/coupons/${editCoupon.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        toast.success(`Coupon "${payload.code}" updated.`);
      } else {
        await apiFetch<ApiSingleResponse>("/api/admin/coupons", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        toast.success(`Coupon "${payload.code}" created.`);
      }

      setIsSheetOpen(false);
      await loadCoupons();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setIsSaving(false);
    }
  }, [editCoupon, form, loadCoupons]);

  // ── Delete ────────────────────────────────────────────────────────────────

  const handleDelete = useCallback(async () => {
    if (!couponToDelete) return;
    setIsDeleting(true);
    try {
      await apiFetch(`/api/admin/coupons/${couponToDelete.id}`, { method: "DELETE" });
      toast.success(`Coupon "${couponToDelete.code}" deleted.`);
      setDeleteDialogOpen(false);
      setCouponToDelete(null);
      await loadCoupons();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setIsDeleting(false);
    }
  }, [couponToDelete, loadCoupons]);

  // ── Stats ─────────────────────────────────────────────────────────────────

  const activeCount  = coupons.filter((c) => c.active && !isExpired(c)).length;
  const expiredCount = coupons.filter((c) => isExpired(c)).length;
  const totalUses    = coupons.reduce((s, c) => s + c.uses_count, 0);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Coupons</h1>
            <p className="text-sm text-gray-500 mt-0.5">{total} coupon{total !== 1 ? "s" : ""} total</p>
          </div>
          <Button onClick={openNew} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700">
            <Plus className="h-4 w-4" />
            Add Coupon
          </Button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="max-w-7xl mx-auto px-6 py-4 grid grid-cols-3 gap-3">
        {[
          { label: "Active",      value: activeCount,  color: "text-green-600" },
          { label: "Expired",     value: expiredCount, color: "text-red-600"   },
          { label: "Total Uses",  value: totalUses,    color: "text-indigo-600" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-lg border border-gray-200 p-3 flex items-center gap-3">
            <TicketPercent className={cn("h-5 w-5", color)} />
            <div>
              <p className="text-xs text-gray-500">{label}</p>
              <p className="text-lg font-semibold text-gray-900">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="max-w-7xl mx-auto px-6 pb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by code or description…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="max-w-7xl mx-auto px-6 pb-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
          </div>
        ) : coupons.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-gray-400">
            <TicketPercent className="h-12 w-12 mb-3 opacity-40" />
            <p className="text-lg font-medium">No coupons found</p>
            <p className="text-sm">Create your first discount code to get started.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Code</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Discount</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Min Order</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Uses</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Expires</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {coupons.map((c) => {
                  const expired = isExpired(c);
                  const exhausted = c.max_uses != null && c.uses_count >= c.max_uses;
                  return (
                    <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-mono font-semibold text-gray-900">{c.code}</span>
                        {c.description && (
                          <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[180px]">{c.description}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 font-medium text-indigo-700">{formatDiscount(c)}</td>
                      <td className="px-4 py-3 text-gray-600">
                        {c.min_order > 0 ? `₹${c.min_order.toLocaleString("en-IN")}` : "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {c.uses_count}
                        {c.max_uses != null && (
                          <span className="text-gray-400"> / {c.max_uses}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {c.expires_at
                          ? new Date(c.expires_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                          : "Never"}
                      </td>
                      <td className="px-4 py-3">
                        {expired ? (
                          <Badge className="bg-red-100 text-red-700">Expired</Badge>
                        ) : exhausted ? (
                          <Badge className="bg-yellow-100 text-yellow-700">Exhausted</Badge>
                        ) : c.active ? (
                          <Badge className="bg-green-100 text-green-700">Active</Badge>
                        ) : (
                          <Badge className="bg-gray-100 text-gray-600">Inactive</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 justify-end">
                          <Button size="sm" variant="outline" className="text-xs" onClick={() => openEdit(c)}>
                            <Edit className="h-3 w-3 mr-1" /> Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:bg-red-50 text-xs"
                            onClick={() => { setCouponToDelete(c); setDeleteDialogOpen(true); }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Add / Edit Sheet ────────────────────────────────────────────────── */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        {/* Desktop: wider panel to accommodate 2-col grid */}
        <SheetContent side="right" className="w-full sm:max-w-lg lg:max-w-xl overflow-y-auto p-0">
          <SheetHeader className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-4">
            <SheetTitle className="text-lg font-semibold">
              {editCoupon ? `Edit: ${editCoupon.code}` : "New Coupon"}
            </SheetTitle>
            <SheetDescription className="text-sm text-gray-500">
              {editCoupon ? "Update coupon details below." : "Create a new discount code."}
            </SheetDescription>
          </SheetHeader>

          {/*
            Desktop (lg+): responsive 2-column grid.
            Mobile/tablet: single column (grid-cols-1).
            Fields are intentionally paired by semantic relationship:
              Row 1 — code  |  description
              Row 2 — discount_type  |  discount_value
              Row 3 — min_order  |  max_uses
              Row 4 — expires_at  (full-width)
              Row 5 — active toggle  (full-width)
          */}
          <div className="px-6 py-6 grid grid-cols-1 lg:grid-cols-2 gap-x-5 gap-y-4">

            {/* Code */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">
                Coupon Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.code}
                onChange={(e) => setField("code", e.target.value.toUpperCase())}
                placeholder="e.g. SAVE20"
                className={cn(
                  "w-full h-10 rounded-md border px-3 py-2 text-sm font-mono shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500",
                  fieldErrors.code ? "border-red-400" : "border-gray-300"
                )}
              />
              {fieldErrors.code && <p className="text-xs text-red-500">{fieldErrors.code}</p>}
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => setField("description", e.target.value)}
                placeholder="Optional internal note"
                className="w-full h-10 rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Discount type */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">
                Discount Type <span className="text-red-500">*</span>
              </label>
              <select
                value={form.discount_type}
                onChange={(e) => setField("discount_type", e.target.value as DiscountType)}
                className="w-full h-10 rounded-md border border-gray-300 px-3 py-2 text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="percentage">Percentage (%)</option>
                <option value="flat">Flat Amount (₹)</option>
              </select>
            </div>

            {/* Discount value */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">
                Discount Value <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={form.discount_value}
                onChange={(e) => setField("discount_value", e.target.value)}
                placeholder={form.discount_type === "percentage" ? "e.g. 20" : "e.g. 200"}
                className={cn(
                  "w-full h-10 rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500",
                  fieldErrors.discount_value ? "border-red-400" : "border-gray-300"
                )}
              />
              {fieldErrors.discount_value && <p className="text-xs text-red-500">{fieldErrors.discount_value}</p>}
            </div>

            {/* Min order */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">Minimum Order (₹)</label>
              <input
                type="number"
                min="0"
                value={form.min_order}
                onChange={(e) => setField("min_order", e.target.value)}
                className="w-full h-10 rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <p className="text-xs text-gray-400">0 means no minimum.</p>
            </div>

            {/* Max uses */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">Max Uses</label>
              <input
                type="number"
                min="1"
                value={form.max_uses}
                onChange={(e) => setField("max_uses", e.target.value)}
                placeholder="Leave blank for unlimited"
                className="w-full h-10 rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Expires at — full-width */}
            <div className="space-y-1.5 lg:col-span-2">
              <label className="block text-sm font-medium text-gray-700">Expires At</label>
              <input
                type="datetime-local"
                value={form.expires_at}
                onChange={(e) => setField("expires_at", e.target.value)}
                className="w-full h-10 rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <p className="text-xs text-gray-400">Leave blank to never expire.</p>
            </div>

            {/* Active toggle — full-width */}
            <div className="lg:col-span-2">
              <ToggleSwitch
                checked={form.active}
                onChange={(v) => setField("active", v)}
                label="Active"
                description="Inactive coupons cannot be redeemed at checkout."
              />
            </div>

          </div>

          <SheetFooter className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-2">
            <Button variant="outline" onClick={() => setIsSheetOpen(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-indigo-600 hover:bg-indigo-700 flex items-center gap-1.5"
            >
              {isSaving
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <CheckCircle2 className="h-4 w-4" />}
              {editCoupon ? "Save Changes" : "Create Coupon"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ── Delete Confirmation ─────────────────────────────────────────────── */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Coupon</DialogTitle>
            <DialogDescription>
              Permanently delete coupon{" "}
              <span className="font-mono font-semibold">{couponToDelete?.code}</span>?
              This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
