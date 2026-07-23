// Sprint 13 — Admin DAM Rights Dashboard Page
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Rights Dashboard | DAM | Bansari Commerce Pro',
};

export default function DAMRightsPage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Rights Dashboard</h1>
        <p className="text-muted-foreground text-sm">
          Manage licenses, copyright, usage rights, and expiration policies.
        </p>
      </div>
      <div className="rounded-lg border bg-card p-6">
        <p className="text-sm text-muted-foreground">
          Rights table renders here. Connect to{' '}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">/api/rights</code>.
        </p>
      </div>
    </div>
  );
}
