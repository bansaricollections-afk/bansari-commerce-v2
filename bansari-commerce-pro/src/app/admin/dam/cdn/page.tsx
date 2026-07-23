// Sprint 13 — Admin CDN Dashboard Page
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'CDN Dashboard | DAM | Bansari Commerce Pro',
};

export default function DAMCDNPage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">CDN Dashboard</h1>
        <p className="text-muted-foreground text-sm">
          Monitor CDN hit ratios, cache invalidation, signed URLs, and edge performance.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { label: 'CDN Hit Ratio', value: '—' },
          { label: 'Bandwidth Saved', value: '—' },
          { label: 'Invalidations Today', value: '—' },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border bg-card p-4">
            <p className="text-sm text-muted-foreground">{s.label}</p>
            <p className="mt-1 text-2xl font-bold">{s.value}</p>
          </div>
        ))}
      </div>
      <div className="rounded-lg border bg-card p-6">
        <p className="text-sm text-muted-foreground">
          CDN stats render here. Connect to{' '}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">/api/cdn</code>.
        </p>
      </div>
    </div>
  );
}
