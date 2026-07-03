"use client";

import { useRouter } from "next/navigation";
import { LogOut, Menu, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { signOutAdmin } from "@/services/auth.service";

export function AdminHeader() {
  const router = useRouter();

  async function handleLogout() {
    await signOutAdmin();
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
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
            <p className="text-sm font-semibold text-slate-900">
              Admin Dashboard
            </p>
            <p className="text-xs text-slate-500">
              Manage catalog, orders, and operations
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Search admin"
          >
            <Search className="size-4" />
          </Button>

          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={handleLogout}
          >
            <LogOut className="size-4" />
            Logout
          </Button>
        </div>
      </div>
    </header>
  );
}
