import type { Metadata } from "next";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

export const metadata: Metadata = {
  title: "Admin Dashboard | Bansari Commerce Pro",
  description: "Bansari Commerce Pro Administration Panel",
};

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({
  children,
}: Readonly<AdminLayoutProps>) {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:block">
          <AdminSidebar />
        </aside>

        {/* Main Content */}
        <div className="flex min-h-screen flex-1 flex-col">
          <AdminHeader />

          <main className="flex-1 p-4 md:p-6 lg:p-8">
            <div className="mx-auto w-full max-w-7xl">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}