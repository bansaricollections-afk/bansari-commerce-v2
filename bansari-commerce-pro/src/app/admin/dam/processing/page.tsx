// Sprint 13 — Admin DAM AI Processing Queue Page
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI Processing Queue | DAM | Bansari Commerce Pro',
};

export default function DAMProcessingPage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">AI Processing Queue</h1>
        <p className="text-muted-foreground text-sm">
          Monitor auto-tagging, background removal, quality scoring, and all AI operations.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { label: 'Queued', value: '—', color: 'text-yellow-600' },
          { label: 'Processing', value: '—', color: 'text-blue-600' },
          { label: 'Completed Today', value: '—', color: 'text-green-600' },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border bg-card p-4">
            <p className="text-sm text-muted-foreground">{s.label}</p>
            <p className={`mt-1 text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-lg border bg-card p-6">
        <p className="text-sm text-muted-foreground">
          Job list renders here. Connect to{' '}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">/api/processing</code>.
        </p>
      </div>
    </div>
  );
}
