import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import SizeInventoryEditor from '@/components/admin/products/SizeInventoryEditor';
import { getAdminProductInventory } from '@/services/size-inventory.service';

export const metadata: Metadata = {
  title: 'Size Inventory | Bansari Commerce Pro',
  description: 'Set stock for each size of a product.',
};

export default async function ProductSizeInventoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const productId = Number(id);

  if (!Number.isInteger(productId) || productId <= 0) notFound();

  const data = await getAdminProductInventory(productId);
  if (!data) notFound();

  return (
    <div>
      <div className="mb-8">
        <nav className="mb-2 flex items-center gap-1.5 text-xs text-slate-500">
          <Link href="/admin" className="hover:text-slate-700">Dashboard</Link>
          <span>/</span>
          <Link href="/admin/products" className="hover:text-slate-700">Products</Link>
          <span>/</span>
          <span className="font-medium text-slate-800">Size Inventory</span>
        </nav>
        <h1 className="text-2xl font-bold text-slate-950">Size Inventory</h1>
        <p className="mt-1 text-sm text-slate-600">
          Every size holds its own stock. Availability shown to customers is
          stock minus the units reserved for open orders.
        </p>
      </div>

      <SizeInventoryEditor data={data} />
    </div>
  );
}
