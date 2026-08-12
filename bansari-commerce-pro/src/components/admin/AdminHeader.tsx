"use client";

import { useRouter } from "next/navigation";
import { LogOut, Menu, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { signOutAdmin } from "@/services/auth.service";

const PAGE_TITLES: Record<string, { title: string; description: string }> = {
  "/admin": { title: "Dashboard", description: "Store performance at a glance" },
  "/admin/products": { title: "Products", description: "Manage your catalog" },
  "/admin/categories": { title: "Categories", description: "Storefront taxonomy" },
  "/admin/inventory": { title: "Inventory", description: "Stock levels and alerts" },
  "/admin/orders": { title: "Orders", description: "Track fulfillment and payment status" },
  "/admin/customers": { title: "Customers", description: "Customer profiles and history" },
  "/admin/homepage": { title: "Homepage", description: "Storefront homepage content" },
  "/admin/banners": { title: "Banners", description: "Campaign placements" },
  "/admin/coupons": { title: "Coupons", description: "Promotions and offers" },
  "/admin/dam": { title: "Assets", description: "Digital asset manager" },
  "/admin/analytics": { title: "Analytics", description: "Sales and store trends" },
  "/admin/settings": { title: "Settings", description: "Store preferences" },
};

function resolveTitle(pathname: string) {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  const match = Object.keys(PAGE_TITLES)
    .filter((p) => p !== "/admin" && pathname.startsWith(p))
    .sort((a, b) => b.length - a.length)[0];
  return match ? PAGE_TITLES[match] : { title: "Admin", description: "" };
}

export function AdminHeader({ pathname }: { pathname: string }) {
  const router = useRouter();
  const { title, description } = resolveTitle(pathname);

  async function handleLogout() {
    await signOutAdmin();
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-20 border-b border-neutral-200 bg-white/90 backdrop-blur">
      <div className="flex h-16 items-center justify-between gap-4 px-4 md:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="lg:hidden"
            aria-label="Open admin navigation"
          >
            <Menu className="size-4" />
          </Button>

          <div>
            <p className="text-sm font-semibold text-neutral-900">{title}</p>
            {description && (
              <p className="text-xs text-neutral-500">{description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Search admin"
            className="text-neutral-500 hover:text-neutral-900"
          >
            <Search className="size-4" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            onClick={handleLogout}
            className="text-neutral-500 hover:text-neutral-900"
          >
            <LogOut className="size-4" />
            Logout
          </Button>
        </div>
      </div>
    </header>
  );
}
