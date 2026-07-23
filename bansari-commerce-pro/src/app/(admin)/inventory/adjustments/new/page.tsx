// ============================================================
// Sprint 4 – /admin/inventory/adjustments/new (RSC shell)
// ============================================================

import { InventoryService } from '@/services/inventory.service';
import { AdjustStockForm }  from '@/components/inventory/AdjustStockForm';

interface PageProps {
  searchParams: {
    inventoryId?: string;
  };
}

export const metadata = { title: 'Adjust Stock | Admin' };

export default async function NewAdjustmentPage({ searchParams }: PageProps) {
  const inventoryId = searchParams.inventoryId ? Number(searchParams.inventoryId) : undefined;

  // If a specific inventory record is preselected, fetch its summary for display
  let preRow = undefined;
  if (inventoryId) {
    const result = await InventoryService.search({ inventoryId });
    preRow = result.data[0];
  }

  return (
    <div className="admin-page admin-page-narrow">
      <header className="page-header">
        <a href="/admin/inventory" className="back-link">← Inventory</a>
        <h1>Adjust Stock</h1>
        <p className="page-subtitle">
          All adjustments are recorded in the inventory ledger with full audit trail.
        </p>
      </header>

      <AdjustStockForm
        inventoryId={inventoryId}
        productName={
          preRow
            ? `${preRow.product_name}${
                preRow.size_label ? ` · ${preRow.size_label}` : ''
              } @ ${preRow.warehouse_name}`
            : undefined
        }
        currentQty={preRow?.available_qty}
      />
    </div>
  );
}
