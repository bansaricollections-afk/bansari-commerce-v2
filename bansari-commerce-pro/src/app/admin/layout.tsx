import type { Metadata } from 'next';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { requireAdminPage } from '@/lib/auth/requireAdmin';

export const metadata: Metadata = {
  title: 'Admin Dashboard | Bansari Commerce Pro',
  description: 'Bansari Commerce Pro Administration Panel',
  robots: { index: false, follow: false },
};

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default async function AdminLayout({ children }: Readonly<AdminLayoutProps>) {
  // Server-side guard — middleware handles the edge but this provides defence-in-depth
  await requireAdminPage();

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex">
        {/* Skip to main content — accessibility */}
        <a
          href="#admin-main"
          className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:rounded focus:bg-white focus:px-4 focus:py-2 focus:text-slate-900 focus:shadow-lg"
        >
          Skip to main content
        </a>

        {/* Desktop Sidebar */}
        <aside className="hidden lg:block" aria-label="Admin navigation">
          <AdminSidebar />
        </aside>

        {/* Main Content */}
        <div className="flex min-h-screen flex-1 flex-col">
          <AdminHeader />

          <main id="admin-main" className="flex-1 p-4 md:p-6 lg:p-8">
            <div className="mx-auto w-full max-w-7xl">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
