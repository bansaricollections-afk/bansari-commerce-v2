import type { Metadata } from "next";
import { AdminInventory } from "@/components/admin/inventory/AdminInventory";

export const metadata: Metadata = {
  title: "Inventory | Bansari Commerce Pro",
  description: "Monitor and update product stock levels.",
};

export default function InventoryPage() {
  return (
    <div>
      <div className="mb-8">
        <nav className="mb-2 flex items-center gap-1.5 text-xs text-slate-500">
          <a href="/admin" className="hover:text-slate-700">Dashboard</a>
          <span>/</span>
          <span className="text-slate-800 font-medium">Inventory</span>
        </nav>
        <h1 className="text-2xl font-bold text-slate-950">Inventory</h1>
        <p className="mt-1 text-sm text-slate-600">
          Monitor stock levels and update quantities directly.
        </p>
      </div>
      <AdminInventory />
    </div>
  );
}
