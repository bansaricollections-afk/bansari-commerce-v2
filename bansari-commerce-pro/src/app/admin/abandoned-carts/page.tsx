import type { Metadata } from "next";

import AbandonedCartsTable from "@/components/admin/AbandonedCartsTable";

export const metadata: Metadata = {
  title: "Abandoned Carts | Bansari Commerce Pro",
  description: "Checkouts that were started but never paid for.",
};

/**
 * Abandoned carts — read-only view over the existing pending_orders records.
 *
 * Authorization is already enforced twice before this renders: proxy.ts gates
 * every /admin path, and src/app/admin/layout.tsx calls requireAdminPage().
 * Following the convention of the other admin pages, this shell adds no third
 * check and simply delegates to the client table.
 *
 * The data itself is fetched from /api/admin/abandoned-carts, which performs
 * its own requireAdminSession check — pending_orders has RLS disabled, so it
 * is only ever reachable through the service-role client behind that route.
 */
export default function AbandonedCartsPage() {
  return <AbandonedCartsTable />;
}
