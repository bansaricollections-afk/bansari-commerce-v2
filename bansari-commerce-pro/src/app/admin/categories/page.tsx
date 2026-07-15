import type { Metadata } from "next";
import { AdminCategories } from "@/components/admin/categories/AdminCategories";

export const metadata: Metadata = {
  title: "Categories | Bansari Commerce Pro",
  description: "Manage product categories.",
};

export default function CategoriesPage() {
  return (
    <div>
      <div className="mb-8">
        <nav className="mb-2 flex items-center gap-1.5 text-xs text-slate-500">
          <a href="/admin" className="hover:text-slate-700">Dashboard</a>
          <span>/</span>
          <span className="text-slate-800 font-medium">Categories</span>
        </nav>
        <h1 className="text-2xl font-bold text-slate-950">Categories</h1>
        <p className="mt-1 text-sm text-slate-600">
          View and rename product categories. Categories are derived from the
          products table — renaming updates all products in that category.
        </p>
      </div>
      <AdminCategories />
    </div>
  );
}
