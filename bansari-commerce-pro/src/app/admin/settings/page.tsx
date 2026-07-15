import type { Metadata } from "next";
import { AdminSettings } from "@/components/admin/settings/AdminSettings";

export const metadata: Metadata = {
  title: "Settings | Bansari Commerce Pro",
  description: "Configure store settings.",
};

export default function SettingsPage() {
  return (
    <div>
      <div className="mb-8">
        <nav className="mb-2 flex items-center gap-1.5 text-xs text-slate-500">
          <a href="/admin" className="hover:text-slate-700">Dashboard</a>
          <span>/</span>
          <span className="text-slate-800 font-medium">Settings</span>
        </nav>
        <h1 className="text-2xl font-bold text-slate-950">Settings</h1>
        <p className="mt-1 text-sm text-slate-600">
          Store configuration, payment providers, and inventory thresholds.
        </p>
      </div>
      <AdminSettings />
    </div>
  );
}
