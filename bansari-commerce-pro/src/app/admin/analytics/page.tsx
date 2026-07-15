import type { Metadata } from "next";
import { AdminAnalytics } from "@/components/admin/analytics/AdminAnalytics";

export const metadata: Metadata = {
  title: "Analytics | Bansari Commerce Pro",
  description: "Revenue, orders, and product performance analytics.",
};

export default function AnalyticsPage() {
  return (
    <div>
      <div className="mb-8">
        <nav className="mb-2 flex items-center gap-1.5 text-xs text-slate-500">
          <a href="/admin" className="hover:text-slate-700">Dashboard</a>
          <span>/</span>
          <span className="text-slate-800 font-medium">Analytics</span>
        </nav>
        <h1 className="text-2xl font-bold text-slate-950">Analytics</h1>
        <p className="mt-1 text-sm text-slate-600">
          Revenue, order trends, and top-performing products.
        </p>
      </div>
      <AdminAnalytics />
    </div>
  );
}
