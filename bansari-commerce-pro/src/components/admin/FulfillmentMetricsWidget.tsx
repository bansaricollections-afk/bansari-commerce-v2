'use client';

/**
 * FulfillmentMetricsWidget
 *
 * Displays live fulfillment stats on the admin dashboard.
 * Purely presentational — receives data as props.
 * No business logic. No direct API calls from this component.
 */

import type { FulfillmentMetrics } from '@/types/inventory-transaction';

interface MetricCardProps {
  label: string;
  value: number;
  variant?: 'default' | 'warn' | 'danger';
}

function MetricCard({ label, value, variant = 'default' }: MetricCardProps) {
  const colourMap = {
    default: 'bg-white border-gray-200 text-gray-800',
    warn:    'bg-amber-50 border-amber-300 text-amber-800',
    danger:  'bg-red-50 border-red-300 text-red-800',
  };

  return (
    <div className={`rounded-xl border p-4 flex flex-col gap-1 shadow-sm ${colourMap[variant]}`}>
      <span className="text-xs font-medium uppercase tracking-wide opacity-70">{label}</span>
      <span className="text-3xl font-bold tabular-nums">{value.toLocaleString('en-IN')}</span>
    </div>
  );
}

interface FulfillmentMetricsWidgetProps {
  metrics: FulfillmentMetrics;
  lowStockThreshold?: number;
}

export function FulfillmentMetricsWidget({
  metrics,
  lowStockThreshold = 10,
}: FulfillmentMetricsWidgetProps) {
  return (
    <section aria-label="Fulfillment Metrics">
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
        Fulfillment &amp; Inventory
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <MetricCard
          label="Reserved Stock"
          value={metrics.reservedStockTotal}
        />
        <MetricCard
          label="Available Stock"
          value={metrics.availableStockTotal}
        />
        <MetricCard
          label="Low Stock Variants"
          value={metrics.lowStockVariants}
          variant={metrics.lowStockVariants > 0 ? 'warn' : 'default'}
        />
        <MetricCard
          label="Out of Stock"
          value={metrics.outOfStockVariants}
          variant={metrics.outOfStockVariants > 0 ? 'danger' : 'default'}
        />
        <MetricCard
          label="Pending Shipments"
          value={metrics.pendingShipments}
          variant={metrics.pendingShipments > 0 ? 'warn' : 'default'}
        />
        <MetricCard
          label="Returns Awaiting"
          value={metrics.returnsAwaiting}
          variant={metrics.returnsAwaiting > 0 ? 'warn' : 'default'}
        />
      </div>
    </section>
  );
}

export default FulfillmentMetricsWidget;
