// ============================================================
// Sprint 4 – /admin/inventory/purchase-orders/new (RSC shell)
// ============================================================

import { InventoryService }  from '@/services/inventory.service';
import { PurchaseOrderForm } from '@/components/inventory/PurchaseOrderForm';

export const metadata = { title: 'New Purchase Order | Admin' };

export default async function NewPurchaseOrderPage() {
  const [vendors, warehouses] = await Promise.all([
    InventoryService.listVendors(),
    InventoryService.listWarehouses(),
  ]);

  return (
    <div className="admin-page admin-page-wide">
      <header className="page-header">
        <a href="/admin/inventory/purchase-orders" className="back-link">← Purchase Orders</a>
        <h1>New Purchase Order</h1>
        <p className="page-subtitle">
          PO number is auto-generated on creation. Status starts as <em>draft</em>.
        </p>
      </header>

      <PurchaseOrderForm vendors={vendors} warehouses={warehouses} />
    </div>
  );
}
