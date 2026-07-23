// ============================================================
// Sprint 4 – /admin/inventory/transfers/new (RSC shell)
// ============================================================

import { InventoryService }    from '@/services/inventory.service';
import { TransferStockForm }   from '@/components/inventory/TransferStockForm';

interface PageProps {
  searchParams: {
    inventoryId?: string;
  };
}

export const metadata = { title: 'Transfer Stock | Admin' };

export default async function NewTransferPage({ searchParams }: PageProps) {
  const inventoryId = searchParams.inventoryId
    ? Number(searchParams.inventoryId)
    : undefined;

  const [warehouses, inventoryResult] = await Promise.all([
    InventoryService.listWarehouses(),
    InventoryService.search({ pageSize: 200 }), // load enough rows for selectors
  ]);

  return (
    <div className="admin-page admin-page-narrow">
      <header className="page-header">
        <a href="/admin/inventory" className="back-link">← Inventory</a>
        <h1>Transfer Stock</h1>
        <p className="page-subtitle">
          Move stock between warehouses. Source quantity is validated before transfer.
        </p>
      </header>

      <TransferStockForm
        warehouses={warehouses}
        inventoryRows={inventoryResult.data}
        preselectedInventoryId={inventoryId}
      />
    </div>
  );
}
