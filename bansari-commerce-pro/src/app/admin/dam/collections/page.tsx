// Sprint 13 — Admin DAM Collections Page
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Collections | DAM | Bansari Commerce Pro',
};

export default function DAMCollectionsPage() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Collections</h1>
          <p className="text-muted-foreground text-sm">
            Manage albums, smart collections, and curated asset groups.
          </p>
        </div>
        <button
          type="button"
          className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90"
        >
          New Collection
        </button>
      </div>
      <div className="rounded-lg border bg-card p-6">
        <p className="text-sm text-muted-foreground">
          Collections grid renders here. Connect to{' '}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">/api/collections</code>.
        </p>
      </div>
    </div>
  );
}
