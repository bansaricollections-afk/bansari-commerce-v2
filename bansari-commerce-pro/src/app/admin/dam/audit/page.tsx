// Sprint 13 — Admin Asset Audit Page
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Asset Audit | DAM | Bansari Commerce Pro',
};

export default function DAMAuditPage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Asset Audit</h1>
        <p className="text-muted-foreground text-sm">
          Full audit trail for every asset action: uploads, updates, deletes, downloads, rights changes.
        </p>
      </div>
      <div className="rounded-lg border bg-card p-6">
        <p className="text-sm text-muted-foreground">
          Audit log table renders here. Reads from <code className="rounded bg-muted px-1 py-0.5 text-xs">dam_audit</code>.
        </p>
      </div>
    </div>
  );
}
