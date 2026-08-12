import Link from "next/link";
import {
  BarChart3,
  Boxes,
  FolderOpen,
  Home,
  Image as ImageIcon,
  LayoutDashboard,
  LayoutTemplate,
  Package,
  Settings,
  ShoppingBag,
  Tags,
  TicketPercent,
  Users,
} from "lucide-react";

import { cn } from "@/lib/utils";

const GOLD = "#C9A96E";

const navGroups: {
  label: string;
  items: { title: string; href: string; icon: typeof LayoutDashboard }[];
}[] = [
  {
    label: "Overview",
    items: [{ title: "Dashboard", href: "/admin", icon: LayoutDashboard }],
  },
  {
    label: "Catalog",
    items: [
      { title: "Products", href: "/admin/products", icon: Package },
      { title: "Categories", href: "/admin/categories", icon: Tags },
      { title: "Inventory", href: "/admin/inventory", icon: Boxes },
    ],
  },
  {
    label: "Orders",
    items: [{ title: "Orders", href: "/admin/orders", icon: ShoppingBag }],
  },
  {
    label: "Customers",
    items: [{ title: "Customers", href: "/admin/customers", icon: Users }],
  },
  {
    label: "Marketing",
    items: [
      { title: "Homepage", href: "/admin/homepage", icon: LayoutTemplate },
      { title: "Banners", href: "/admin/banners", icon: ImageIcon },
      { title: "Coupons", href: "/admin/coupons", icon: TicketPercent },
      { title: "Assets", href: "/admin/dam", icon: FolderOpen },
    ],
  },
  {
    label: "Insights",
    items: [{ title: "Analytics", href: "/admin/analytics", icon: BarChart3 }],
  },
  {
    label: "System",
    items: [{ title: "Settings", href: "/admin/settings", icon: Settings }],
  },
];

function isActive(pathname: string, href: string) {
  return href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
}

export function AdminSidebar({ pathname }: { pathname: string }) {
  return (
    <nav className="sticky top-0 flex h-screen w-64 flex-col border-r border-neutral-200 bg-white">
      <div className="border-b border-neutral-200 px-6 py-6">
        <Link href="/admin" className="block">
          <p className="font-serif text-lg leading-tight text-neutral-900">
            Bansari Collections
          </p>
          <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-400">
            Commerce Operations
          </p>
        </Link>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto px-4 py-6">
        {navGroups.map((group) => (
          <div key={group.label}>
            <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-400">
              {group.label}
            </p>
            <div className="mt-2 space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "relative flex items-center gap-3 rounded-md py-2 pl-3 pr-3 text-sm transition-colors",
                      active
                        ? "bg-neutral-100 font-semibold text-neutral-900"
                        : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
                    )}
                  >
                    {active && (
                      <span
                        className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full"
                        style={{ background: GOLD }}
                      />
                    )}
                    <Icon className="size-4" strokeWidth={1.75} />
                    {item.title}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-neutral-200 px-4 py-4">
        <Link
          href="/"
          className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-neutral-500 transition hover:bg-neutral-50 hover:text-neutral-900"
        >
          <Home className="size-4" strokeWidth={1.75} />
          Storefront
        </Link>
      </div>
    </nav>
  );
}
