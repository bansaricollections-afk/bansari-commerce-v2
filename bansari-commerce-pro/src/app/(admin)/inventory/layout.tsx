import { requireAdminPage } from '@/lib/auth/requireAdmin';

// Guards every page under (admin)/inventory/* — same pattern as
// src/app/admin/layout.tsx. Redirects to /admin/login if not an
// authenticated admin.
export const dynamic = 'force-dynamic';

export default async function InventoryLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await requireAdminPage();

  return <>{children}</>;
}
