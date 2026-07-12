import {
  BarChart3,
  Boxes,
  Image,
  Package,
  Settings,
  ShoppingBag,
  Tags,
  TicketPercent,
  Users,
} from "lucide-react";

import { DashboardCard } from "@/components/admin/DashboardCard";
import { LowStockProducts } from "@/components/admin/LowStockProducts";
import { QuickActionCard } from "@/components/admin/QuickActionCard";
import { RecentOrders } from "@/components/admin/RecentOrders";
import { getOrders } from "@/services/order.service";
import {
  getProductCount,
  getLowStockProducts,
} from "@/services/product.service";

const PENDING_STATUSES = new Set(["placed", "processing", "packed"]);

export default async function AdminDashboardPage() {
  const [orders, productCount, lowStock] = await Promise.all([
    getOrders(),
    getProductCount(),
    getLowStockProducts(),
  ]);

  // KPI derivations — single pass over the orders array
  const totalOrders = orders.length;
  const totalRevenue = orders.reduce((sum, o) => sum + o.grand_total, 0);
  const pendingOrders = orders.filter((o) =>
    PENDING_STATUSES.has(o.order_status)
  ).length;

  // Latest 5 orders sorted by created_at descending
  const recentOrders = orders
    .slice()
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    .slice(0, 5)
    .map((o) => ({
      id: o.id,
      orderNumber: o.order_number,
      customer: o.customer_name,
      total: `₹${o.grand_total.toLocaleString("en-IN")}`,
      status: o.order_status,
    }));

  const dashboardCards = [
    {
      title: "Products",
      value: String(productCount),
      description: "Total products",
      href: "/admin/products",
      icon: Package,
      tone: "bg-blue-50 text-blue-700",
    },
    {
      title: "Orders",
      value: String(totalOrders),
      description: "Total orders",
      href: "/admin/orders",
      icon: ShoppingBag,
      tone: "bg-green-50 text-green-700",
    },
    {
      title: "Pending",
      value: String(pendingOrders),
      description: "Placed, processing or packed",
      href: "/admin/orders",
      icon: Users,
      tone: "bg-purple-50 text-purple-700",
    },
    {
      title: "Revenue",
      value: `₹${totalRevenue.toLocaleString("en-IN")}`,
      description: "Total revenue",
      href: "/admin/analytics",
      icon: BarChart3,
      tone: "bg-orange-50 text-orange-700",
    },
  ];

  const quickLinks = [
    {
      title: "Manage Products",
      description: "Create, edit, and organize catalog items",
      href: "/admin/products",
      icon: Package,
    },
    {
      title: "Manage Categories",
      description: "Maintain storefront taxonomy",
      href: "/admin/categories",
      icon: Tags,
    },
    {
      title: "Manage Orders",
      description: "Track fulfillment and payment status",
      href: "/admin/orders",
      icon: ShoppingBag,
    },
    {
      title: "Customers",
      description: "Review customer profiles",
      href: "/admin/customers",
      icon: Users,
    },
    {
      title: "Inventory",
      description: "Monitor stock and alerts",
      href: "/admin/inventory",
      icon: Boxes,
    },
    {
      title: "Coupons",
      description: "Manage promotions and offers",
      href: "/admin/coupons",
      icon: TicketPercent,
    },
    {
      title: "Banners",
      description: "Update campaign placements",
      href: "/admin/banners",
      icon: Image,
    },
    {
      title: "Analytics",
      description: "Review sales and store trends",
      href: "/admin/analytics",
      icon: BarChart3,
    },
    {
      title: "Settings",
      description: "Configure store preferences",
      href: "/admin/settings",
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

      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {dashboardCards.map((card) => (
          <DashboardCard key={card.title} {...card} />
        ))}
      </section>

      <section className="mt-8 grid gap-6 xl:grid-cols-[1fr_360px]">
        <RecentOrders orders={recentOrders} />

        <div>
          <h2 className="mb-4 text-lg font-semibold text-slate-950">
            Quick Actions
          </h2>

          <div className="space-y-3">
            {quickLinks.map((item) => (
              <QuickActionCard key={item.title} {...item} />
            ))}
          </div>
        </div>
      </section>

      <section className="mt-8">
        <LowStockProducts products={lowStock} />
      </section>
    </div>
  );
}
