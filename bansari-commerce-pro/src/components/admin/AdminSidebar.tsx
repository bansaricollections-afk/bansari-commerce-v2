import Link from "next/link";
import {
  BarChart3,
  Boxes,
  Home,
  LayoutDashboard,
  Package,
  Settings,
  ShoppingBag,
  Tags,
  TicketPercent,
  Users,
} from "lucide-react";

import { cn } from "@/lib/utils";

const navigationItems = [
  {
    title: "Dashboard",
    href: "/admin",
    icon: LayoutDashboard,
  },
  {
    title: "Products",
    href: "/admin/products",
    icon: Package,
  },
  {
    title: "Orders",
    href: "/admin/orders",
    icon: ShoppingBag,
  },
  {
    title: "Customers",
    href: "/admin/customers",
    icon: Users,
  },
  {
    title: "Inventory",
    href: "/admin/inventory",
    icon: Boxes,
  },
  {
    title: "Categories",
    href: "/admin/categories",
    icon: Tags,
  },
  {
    title: "Coupons",
    href: "/admin/coupons",
    icon: TicketPercent,
  },
  {
    title: "Analytics",
    href: "/admin/analytics",
    icon: BarChart3,
  },
  {
    title: "Settings",
    href: "/admin/settings",
    icon: Settings,
  },
];

export function AdminSidebar() {
  return (
    <nav className="sticky top-0 flex h-screen w-72 flex-col border-r border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-6 py-5">
        <Link href="/admin" className="block">
          <p className="text-lg font-bold text-[#8A5A6A]">
            Bansari Commerce Pro
          </p>
          <p className="mt-1 text-xs text-slate-500">Admin OS</p>
        </Link>
      </div>

      <div className="flex-1 space-y-1 px-4 py-5">
        {navigationItems.map((item) => {
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-slate-700 transition",
                "hover:bg-[#8A5A6A]/10 hover:text-[#8A5A6A]"
              )}
            >
              <Icon className="size-4" />
              {item.title}
            </Link>
          );
        })}
      </div>

      <div className="border-t border-slate-200 px-4 py-4">
        <Link
          href="/"
          className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
        >
          <Home className="size-4" />
          Storefront
        </Link>
      </div>
    </nav>
  );
}
