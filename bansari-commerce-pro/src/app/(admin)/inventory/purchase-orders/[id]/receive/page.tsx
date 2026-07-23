// ============================================================
// Sprint 4 – /admin/inventory/purchase-orders/[id]/receive
// ============================================================

import { notFound }           from 'next/navigation';
import { InventoryService }   from '@/services/inventory.service';
import { ReceivePOForm }      from '@/components/inventory/ReceivePOForm';

interface PageProps {
  params: { id: string };
}

export async function generateMetadata({ params }: PageProps) {
  return { title: `Receive PO #${params.id} | Admin` };
}

export default async function ReceivePOPage({ params }: PageProps) {
  const poId = Number(params.id);
  if (isNaN(poId)) notFound();

  const po = await InventoryService.getPurchaseOrder(poId);
  if (!po) notFound();

  // Only sent / partial POs can be received
  if (!['sent', 'partial'].includes(po.status)) {
    return (
      <div className="admin-page admin-page-narrow">
        <header className="page-header">
          <a href="/admin/inventory/purchase-orders" className="back-link">← Purchase Orders</a>
          <h1>Cannot Receive PO</h1>
        </header>
        <div className="info-banner">
          PO <strong>{po.po_number}</strong> has status <strong>{po.status}</strong>.
          Only <em>sent</em> or <em>partial</em> POs can be received.
        </div>
        <a href={`/admin/inventory/purchase-orders/${poId}`} className="btn btn-ghost">
          ← Back to PO
        </a>
      </div>
    );
  }

  return (
    <div className="admin-page admin-page-wide">
      <header className="page-header">
        <a href="/admin/inventory/purchase-orders" className="back-link">← Purchase Orders</a>
        <h1>Receive PO — {po.po_number}</h1>
        <p className="page-subtitle">
          Enter received and damaged quantities. Inventory is updated immediately on confirm.
        </p>
      </header>

      <ReceivePOForm po={po} />
    </div>
  );
}
