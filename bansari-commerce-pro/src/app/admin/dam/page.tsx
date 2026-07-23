// Sprint 13 — Admin DAM Media Library Page
// Delta only — reuses existing admin layout

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Media Library | Bansari Commerce Pro Admin',
  description: 'Enterprise Digital Asset Management — Media Library',
};

export default function DAMMediaLibraryPage() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Media Library</h1>
          <p className="text-muted-foreground text-sm">
            Centralized digital asset management for all tenants, catalogs, and storefronts.
          </p>
        </div>
        <button
          type="button"
          className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90"
        >
          Upload Assets
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Total Assets', value: '—', sub: 'across all tenants' },
          { label: 'Processing Queue', value: '—', sub: 'jobs pending' },
          { label: 'Storage Used', value: '—', sub: 'GB utilized' },
          { label: 'CDN Hit Ratio', value: '—', sub: 'last 24h' },
        ].map((stat) => (
          <div key={stat.label} className="rounded-lg border bg-card p-4 shadow-sm">
            <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
            <p className="mt-1 text-2xl font-bold">{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.sub}</p>
          </div>
        ))}
      </div>

      <div className="rounded-lg border bg-card p-6">
        <p className="text-sm text-muted-foreground">
          Asset grid and folder browser will render here. Connect to{' '}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">/api/media</code> for live data.
        </p>
      </div>
    </div>
  );
}
