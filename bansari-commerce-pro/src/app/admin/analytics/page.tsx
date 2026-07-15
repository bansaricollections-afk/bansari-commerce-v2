import type { Metadata } from "next";
import { BarChart3 } from "lucide-react";

export const metadata: Metadata = {
  title: "Analytics | Bansari Commerce Pro",
  description: "Review sales performance, traffic, and store trends.",
};

export default function AnalyticsPage() {
  return (
    <div>
      {/* Page header */}
      <div className="mb-8">
        <nav className="mb-2 flex items-center gap-1.5 text-xs text-slate-500">
          <a href="/admin" className="hover:text-slate-700">Dashboard</a>
          <span>/</span>
          <span className="text-slate-800 font-medium">Analytics</span>
        </nav>
        <h1 className="text-2xl font-bold text-slate-950">Analytics</h1>
        <p className="mt-1 text-sm text-slate-600">
          Sales trends, revenue breakdowns, top products, and customer insights.
        </p>
      </div>

      {/* Coming Soon state */}
      <div className="flex min-h-[420px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white px-8 py-16 text-center">
        <div className="flex size-16 items-center justify-center rounded-full bg-blue-50">
          <BarChart3 className="size-8 text-blue-600" />
        </div>
        <h2 className="mt-5 text-xl font-semibold text-slate-900">Coming Soon</h2>
        <p className="mt-2 max-w-sm text-sm text-slate-500">
          Analytics — including revenue charts, order trends, best-selling
          products, and customer acquisition data — is under active development.
        </p>
        <a
          href="/admin"
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#8A5A6A] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#7a4a5a]"
        >
          Back to Dashboard
        </a>
      </div>
    </div>
  );
}
