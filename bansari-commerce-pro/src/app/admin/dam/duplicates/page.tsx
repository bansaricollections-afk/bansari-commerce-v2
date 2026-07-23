// Sprint 13 — Admin Duplicate Manager Page
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Duplicate Manager | DAM | Bansari Commerce Pro',
};

export default function DAMDuplicatesPage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Duplicate Manager</h1>
        <p className="text-muted-foreground text-sm">
          Detect and resolve duplicate assets using perceptual hash and AI similarity scoring.
        </p>
      </div>
      <div className="rounded-lg border bg-card p-6">
        <p className="text-sm text-muted-foreground">
          Duplicate pairs render here. Reads from{' '}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">dam_similarity</code> where{' '}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">is_duplicate = true</code>.
        </p>
      </div>
    </div>
  );
}
