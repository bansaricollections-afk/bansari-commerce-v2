import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { requireAdminPage } from '@/lib/auth/requireAdmin';

// Prevent Next.js from attempting a static prerender of any /admin/* segment.
// This layout calls headers() — a Dynamic API — to detect /admin/login.
// During build-time prerender, headers() returns an empty store, which causes
// isLoginPage to evaluate false and requireAdminPage() to execute with no
// valid request context, crashing the build when Supabase env vars are absent.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Admin Dashboard | Bansari Commerce Pro',
  description: 'Bansari Commerce Pro Administration Panel',
  robots: { index: false, follow: false },
};

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default async function AdminLayout({ children }: Readonly<AdminLayoutProps>) {
  // Read the current request path.
  // Next.js App Router populates x-invoke-path (Vercel) or next-url in RSC.
  const headersList = await headers();
  const pathname =
    headersList.get('x-invoke-path') ??
    headersList.get('x-pathname') ??
    headersList.get('next-url') ??
    '';

  // /admin/login must never be gated by requireAdminPage() or wrapped in the
  // admin shell (sidebar + header). It is a public page.
  // The middleware regex already excludes /admin/login from protection;
  // this is defence-in-depth at the RSC layer so the layout guard cannot
  // accidentally block the login page even if middleware is misconfigured.
  const isLoginPage =
    pathname === '/admin/login' || pathname.startsWith('/admin/login/');

  if (isLoginPage) {
    return <>{children}</>;
  }

  // For all other /admin/* pages enforce admin authentication.
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
