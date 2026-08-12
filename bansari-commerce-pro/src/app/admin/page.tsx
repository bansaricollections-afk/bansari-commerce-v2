import {
  BarChart3,
  Boxes,
  Image,
  Package,
  Settings,
  ShoppingBag,
  Tags,
  TicketPercent,
  TrendingUp,
  Users,
  Wallet,
  AlertTriangle,
  ShoppingCart,
  CheckCircle,
} from 'lucide-react';

import { DashboardCard } from '@/components/admin/DashboardCard';
import { LowStockProducts } from '@/components/admin/LowStockProducts';
import { QuickActionCard } from '@/components/admin/QuickActionCard';
import { RecentOrders } from '@/components/admin/RecentOrders';
import { getProductionMetrics } from '@/lib/metrics';

export default async function AdminDashboardPage() {
  let metrics;
  try {
    metrics = await getProductionMetrics();
  } catch {
    metrics = null;
  }

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n);
  const fmtCurrency = (n: number) => `₹${fmt(n)}`;
  const fmtPct = (n: number) => `${n.toFixed(1)}%`;

  const kpiCards = metrics
    ? [
        {
          title: 'Revenue Today',
          value: fmtCurrency(metrics.revenueToday),
          description: 'Paid orders since midnight',
          href: '/admin/analytics',
          icon: Wallet,
        },
        {
          title: 'Revenue This Month',
          value: fmtCurrency(metrics.revenueThisMonth),
          description: 'Month-to-date paid revenue',
          href: '/admin/analytics',
          icon: BarChart3,
        },
        {
          title: 'Orders Today',
          value: String(metrics.ordersToday),
          description: 'Paid orders placed today',
          href: '/admin/orders',
          icon: ShoppingBag,
        },
        {
          title: 'Orders This Month',
          value: String(metrics.ordersThisMonth),
          description: 'Month-to-date paid orders',
          href: '/admin/orders',
          icon: ShoppingCart,
        },
        {
          title: 'Avg Order Value',
          value: fmtCurrency(metrics.averageOrderValue),
          description: 'Month-to-date AOV',
          href: '/admin/analytics',
          icon: TrendingUp,
        },
        {
          title: 'Conversion Rate',
          value: fmtPct(metrics.conversionRate),
          description: 'Paid / total checkout attempts',
          href: '/admin/analytics',
          icon: CheckCircle,
        },
        {
          title: 'Payment Success',
          value: fmtPct(metrics.paymentSuccessRate),
          description: 'Of all payment attempts',
          href: '/admin/analytics',
          icon: CheckCircle,
        },
        {
          title: 'Cart Abandonment',
          value: fmtPct(metrics.cartAbandonmentRate),
          description: 'Pending vs total checkouts',
          href: '/admin/analytics',
          icon: AlertTriangle,
        },
        {
          title: 'Low Stock Items',
          value: String(metrics.lowStockCount),
          description: '5 or fewer units remaining',
          href: '/admin/inventory',
          icon: AlertTriangle,
        },
      ]
    : [
        {
          title: 'Products',
          value: '—',
          description: 'Total products',
          href: '/admin/products',
          icon: Package,
        },
        {
          title: 'Orders',
          value: '—',
          description: 'Total orders',
          href: '/admin/orders',
          icon: ShoppingBag,
        },
        {
          title: 'Customers',
          value: '—',
          description: 'Registered customers',
          href: '/admin/customers',
          icon: Users,
        },
        {
          title: 'Revenue',
          value: '₹—',
          description: 'Total revenue',
          href: '/admin/analytics',
          icon: BarChart3,
        },
      ];

  const quickLinks = [
    {
      title: 'Manage Products',
      description: 'Create, edit, and organize catalog items',
      href: '/admin/products',
      icon: Package,
    },
    {
      title: 'Manage Categories',
      description: 'Maintain storefront taxonomy',
      href: '/admin/categories',
      icon: Tags,
    },
    {
      title: 'Manage Orders',
      description: 'Track fulfillment and payment status',
      href: '/admin/orders',
      icon: ShoppingBag,
    },
    {
      title: 'Customers',
      description: 'Review customer profiles',
      href: '/admin/customers',
      icon: Users,
    },
    {
      title: 'Inventory',
      description: 'Monitor stock and alerts',
      href: '/admin/inventory',
      icon: Boxes,
    },
    {
      title: 'Coupons',
      description: 'Manage promotions and offers',
      href: '/admin/coupons',
      icon: TicketPercent,
    },
    {
      title: 'Banners',
      description: 'Update campaign placements',
      href: '/admin/banners',
      icon: Image,
    },
    {
      title: 'Analytics',
      description: 'Review sales and store trends',
      href: '/admin/analytics',
      icon: BarChart3,
    },
    {
      title: 'Settings',
      description: 'Configure store preferences',
      href: '/admin/settings',
      icon: Settings,
    },
  ];

  return (
    <div>
      <div className="mb-10">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-400">
          Bansari Collections
        </p>
        <h1 className="mt-1 font-serif text-3xl text-neutral-900">Commerce Operations</h1>
        <p className="mt-2 text-sm text-neutral-500">
          Products, inventory, customers, orders and store settings — at a glance.
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {kpiCards.map((card) => (
          <DashboardCard key={card.title} {...card} />
        ))}
      </section>

      {metrics && metrics.topProducts.length > 0 && (
        <section className="mt-10">
          <div className="mb-4 flex items-center gap-2">
            <span className="h-3.5 w-0.5 rounded-full bg-[#C9A96E]" />
            <h2 className="text-xs font-bold uppercase tracking-[0.12em] text-neutral-700">
              Top Selling Products
            </h2>
          </div>
          <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
            <table className="w-full text-sm">
              <thead className="text-left">
                <tr className="border-b border-neutral-200">
                  <th className="px-4 py-3 font-medium text-neutral-500">#</th>
                  <th className="px-4 py-3 font-medium text-neutral-500">Product</th>
                  <th className="px-4 py-3 text-right font-medium text-neutral-500">Units Sold</th>
                  <th className="px-4 py-3 text-right font-medium text-neutral-500">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {metrics.topProducts.map((p, i) => (
                  <tr key={p.productName} className="hover:bg-neutral-50/70 transition-colors">
                    <td className="px-4 py-3 text-neutral-400">{i + 1}</td>
                    <td className="px-4 py-3 font-medium text-neutral-900">{p.productName}</td>
                    <td className="px-4 py-3 text-right text-neutral-600">{fmt(p.totalQty)}</td>
                    <td className="px-4 py-3 text-right font-medium text-neutral-900">{fmtCurrency(p.totalRevenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="mt-10 grid gap-6 xl:grid-cols-[1fr_360px]">
        <RecentOrders />

        <div>
          <div className="mb-4 flex items-center gap-2">
            <span className="h-3.5 w-0.5 rounded-full bg-[#C9A96E]" />
            <h2 className="text-xs font-bold uppercase tracking-[0.12em] text-neutral-700">
              Quick Actions
            </h2>
          </div>
          <div className="space-y-3">
            {quickLinks.map((item) => (
              <QuickActionCard key={item.title} {...item} />
            ))}
          </div>
        </div>
      </section>

      <section className="mt-10">
        <LowStockProducts />
      </section>
    </div>
  );
}
