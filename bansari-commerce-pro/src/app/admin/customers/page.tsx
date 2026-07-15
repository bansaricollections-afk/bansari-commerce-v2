import type { Metadata } from "next";
import { AdminCustomers } from "@/components/admin/customers/AdminCustomers";

export const metadata: Metadata = {
  title: "Customers | Bansari Commerce Pro",
  description: "View and manage your customer list.",
};

export default function CustomersPage() {
  return (
    <div>
      <div className="mb-8">
        <nav className="mb-2 flex items-center gap-1.5 text-xs text-slate-500">
          <a href="/admin" className="hover:text-slate-700">Dashboard</a>
          <span>/</span>
          <span className="text-slate-800 font-medium">Customers</span>
        </nav>
        <h1 className="text-2xl font-bold text-slate-950">Customers</h1>
        <p className="mt-1 text-sm text-slate-600">
          All customers derived from order history.
        </p>
      </div>
      <AdminCustomers />
    </div>
  );
}
