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
import { requireAdminPage } from '@/lib/auth/requireAdmin';

export default async function AdminDashboardPage() {
  await requireAdminPage();

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
          tone: 'bg-emerald-50 text-emerald-700',
        },
        {
          title: 'Revenue This Month',
          value: fmtCurrency(metrics.revenueThisMonth),
          description: 'Month-to-date paid revenue',
          href: '/admin/analytics',
          icon: BarChart3,
          tone: 'bg-orange-50 text-orange-700',
        },
        {
          title: 'Orders Today',
          value: String(metrics.ordersToday),
          description: 'Paid orders placed today',
          href: '/admin/orders',
          icon: ShoppingBag,
          tone: 'bg-blue-50 text-blue-700',
        },
        {
          title: 'Orders This Month',
          value: String(metrics.ordersThisMonth),
          description: 'Month-to-date paid orders',
          href: '/admin/orders',
          icon: ShoppingCart,
          tone: 'bg-indigo-50 text-indigo-700',
        },
        {
          title: 'Avg Order Value',
          value: fmtCurrency(metrics.averageOrderValue),
          description: 'Month-to-date AOV',
          href: '/admin/analytics',
          icon: TrendingUp,
          tone: 'bg-violet-50 text-violet-700',
        },
        {
          title: 'Conversion Rate',
          value: fmtPct(metrics.conversionRate),
          description: 'Paid / total checkout attempts',
          href: '/admin/analytics',
          icon: CheckCircle,
          tone: 'bg-teal-50 text-teal-700',
        },
        {
          title: 'Payment Success',
          value: fmtPct(metrics.paymentSuccessRate),
          description: 'Of all payment attempts',
          href: '/admin/analytics',
          icon: CheckCircle,
          tone: 'bg-green-50 text-green-700',
        },
        {
          title: 'Cart Abandonment',
          value: fmtPct(metrics.cartAbandonmentRate),
          description: 'Pending vs total checkouts',
          href: '/admin/analytics',
          icon: AlertTriangle,
          tone: 'bg-yellow-50 text-yellow-700',
        },
        {
          title: 'Low Stock Items',
          value: String(metrics.lowStockCount),
          description: '5 or fewer units remaining',
          href: '/admin/inventory',
          icon: AlertTriangle,
          tone: 'bg-red-50 text-red-700',
        },
      ]
    : [
        {
          title: 'Products',
          value: '—',
          description: 'Total products',
          href: '/admin/products',
          icon: Package,
          tone: 'bg-blue-50 text-blue-700',
        },
        {
          title: 'Orders',
          value: '—',
          description: 'Total orders',
          href: '/admin/orders',
          icon: ShoppingBag,
          tone: 'bg-green-50 text-green-700',
        },
        {
          title: 'Customers',
          value: '—',
          description: 'Registered customers',
          href: '/admin/customers',
          icon: Users,
          tone: 'bg-purple-50 text-purple-700',
        },
        {
          title: 'Revenue',
          value: '₹—',
          description: 'Total revenue',
          href: '/admin/analytics',
          icon: BarChart3,
          tone: 'bg-orange-50 text-orange-700',
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
        <h1 className="text-2xl font-bold text-slate-950">Welcome Admin</h1>
        <p className="mt-2 text-sm text-slate-600">
          Manage your products, inventory, customers, orders and store settings
          from one place.
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {kpiCards.map((card) => (
          <DashboardCard key={card.title} {...card} />
        ))}
      </section>

      {metrics && metrics.topProducts.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-4 text-lg font-semibold text-slate-950">
            Top Selling Products
          </h2>
          <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium text-slate-600">#</th>
                  <th className="px-4 py-3 font-medium text-slate-600">Product</th>
                  <th className="px-4 py-3 font-medium text-slate-600 text-right">Units Sold</th>
                  <th className="px-4 py-3 font-medium text-slate-600 text-right">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {metrics.topProducts.map((p, i) => (
                  <tr key={p.productName} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3 text-slate-400">{i + 1}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">{p.productName}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{fmt(p.totalQty)}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{fmtCurrency(p.totalRevenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="mt-8 grid gap-6 xl:grid-cols-[1fr_360px]">
        <RecentOrders />

        <div>
          <h2 className="mb-4 text-lg font-semibold text-slate-950">Quick Actions</h2>
          <div className="space-y-3">
            {quickLinks.map((item) => (
              <QuickActionCard key={item.title} {...item} />
            ))}
          </div>
        </div>
      </section>

      <section className="mt-8">
        <LowStockProducts />
      </section>
    </div>
  );
}
