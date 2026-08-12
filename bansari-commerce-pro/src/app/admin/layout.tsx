import type { Metadata } from 'next';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { requireAdminPage } from '@/lib/auth/requireAdmin';
import { headers } from 'next/headers';

// All /admin/* segments are protected by requireAdminPage(), except
// /admin/login, which must render without the admin shell.
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
  const pathname = (await headers()).get('x-pathname');

  if (pathname?.startsWith('/admin/login')) {
    return <>{children}</>;
  }

  await requireAdminPage();

  return (
    /*
     * admin-shell: scoping class for all admin-only CSS overrides.
     *
     * 1. Six separate arbitrary-variant utilities apply font-sans individually
     *    to h1, h2, h3, h4, h5, and h6 — one utility per heading level.
     *    This resets the storefront globals.css Playfair serif rule that
     *    targets all headings globally, preventing it from bleeding into
     *    shadcn Sheet titles (h2 via Radix Dialog.Title) inside admin panels.
     *
     * 2. The <style> block below declares --color-popover / --color-popover-foreground
     *    scoped under .admin-shell so Tailwind v4's bg-popover utility resolves to
     *    white (#FFFFFF) inside admin Sheets instead of its built-in near-black
     *    default (oklch(0.205 0 0)). These tokens MUST NOT live in globals.css :root
     *    because Tailwind v4 exposes every :root CSS variable as a design token,
     *    which would override the built-in popover palette for ALL pages including
     *    the storefront.
     */
    <>
      <style>{`
        .admin-shell {
          --color-popover: #FFFFFF;
          --color-popover-foreground: #1D1D1D;
        }
      `}</style>
      <div
        className="admin-shell min-h-screen bg-[#FBF9F6] [&_h1]:font-sans [&_h2]:font-sans [&_h3]:font-sans [&_h4]:font-sans [&_h5]:font-sans [&_h6]:font-sans"
      >
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
            <AdminSidebar pathname={pathname ?? ""} />
          </aside>

          {/* Main Content */}
          <div className="flex min-h-screen flex-1 flex-col">
            <AdminHeader pathname={pathname ?? ""} />

            <main id="admin-main" className="flex-1 p-4 md:p-6 lg:p-8">
              <div className="mx-auto w-full max-w-7xl">{children}</div>
            </main>
          </div>
        </div>
      </div>
    </>
  );
}
