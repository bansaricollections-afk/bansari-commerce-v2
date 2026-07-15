"use client";

import { useState } from "react";
import { Save, Check } from "lucide-react";

type StoreSettings = {
  store_name: string;
  store_email: string;
  store_phone: string;
  currency: string;
  low_stock_threshold: string;
  razorpay_enabled: string;
};

const DEFAULTS: StoreSettings = {
  store_name: "Bansari Collections",
  store_email: "bansari.collections@gmail.com",
  store_phone: "",
  currency: "INR",
  low_stock_threshold: "10",
  razorpay_enabled: "true",
};

export function AdminSettings() {
  const [form, setForm] = useState<StoreSettings>(DEFAULTS);
  const [saved, setSaved] = useState(false);

  function handleChange(key: keyof StoreSettings, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  function handleSave() {
    // Settings persistence via environment variables / Supabase config table
    // is a future sprint item. For now, validate and acknowledge.
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  const Field = ({
    label,
    name,
    type = "text",
    hint,
  }: {
    label: string;
    name: keyof StoreSettings;
    type?: string;
    hint?: string;
  }) => (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
      </label>
      <input
        type={type}
        value={form[name]}
        onChange={(e) => handleChange(name, e.target.value)}
        className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#8A5A6A]/30"
      />
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  );

  return (
    <div className="max-w-2xl space-y-8">
      {/* Store Info */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="mb-5 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Store Information
        </h2>
        <div className="space-y-4">
          <Field label="Store Name" name="store_name" />
          <Field label="Contact Email" name="store_email" type="email" />
          <Field label="Contact Phone" name="store_phone" type="tel" />
          <Field
            label="Default Currency"
            name="currency"
            hint="ISO 4217 currency code, e.g. INR, USD, EUR."
          />
        </div>
      </div>

      {/* Inventory Settings */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="mb-5 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Inventory
        </h2>
        <Field
          label="Low-Stock Alert Threshold"
          name="low_stock_threshold"
          type="number"
          hint="Products at or below this stock level are flagged as low-stock."
        />
      </div>

      {/* Payments */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="mb-5 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Payments
        </h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-800">Razorpay</p>
            <p className="mt-0.5 text-xs text-slate-500">
              Enable or disable the Razorpay payment gateway at checkout.
            </p>
          </div>
          <button
            onClick={() =>
              handleChange(
                "razorpay_enabled",
                form.razorpay_enabled === "true" ? "false" : "true"
              )
            }
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
              form.razorpay_enabled === "true"
                ? "bg-[#8A5A6A]"
                : "bg-slate-200"
            }`}
            aria-label="Toggle Razorpay"
          >
            <span
              className={`inline-block size-4 rounded-full bg-white shadow transition-transform ${
                form.razorpay_enabled === "true"
                  ? "translate-x-6"
                  : "translate-x-1"
              }`}
            />
          </button>
        </div>
      </div>

      {/* Save */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          className="flex items-center gap-2 rounded-lg bg-[#8A5A6A] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#7a4a5a]"
        >
          {saved ? <Check className="size-4" /> : <Save className="size-4" />}
          {saved ? "Saved" : "Save Changes"}
        </button>
        {saved && (
          <p className="text-sm text-emerald-600">
            Settings saved. Persistence via config table coming in Sprint 28.
          </p>
        )}
      </div>
    </div>
  );
}
