import type { Metadata } from "next";
import { TicketPercent } from "lucide-react";

export const metadata: Metadata = {
  title: "Coupons | Bansari Commerce Pro",
  description: "Create and manage discount coupons.",
};

/**
 * ARCHITECTURAL NOTE
 * ------------------
 * Coupons require a `coupons` table that does not exist in the current
 * Supabase schema. The migration SQL is included below as a comment for
 * the developer to apply before enabling full CRUD here.
 *
 * Migration (supabase/migrations/20260716_coupons.sql):
 *
 *   CREATE TABLE public.coupons (
 *     id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 *     code          text NOT NULL UNIQUE,
 *     description   text,
 *     discount_type text NOT NULL CHECK (discount_type IN ('percentage','flat')),
 *     discount_value numeric(10,2) NOT NULL,
 *     min_order     numeric(10,2) DEFAULT 0,
 *     max_uses      integer,
 *     uses_count    integer NOT NULL DEFAULT 0,
 *     active        boolean NOT NULL DEFAULT true,
 *     expires_at    timestamptz,
 *     created_at    timestamptz NOT NULL DEFAULT now(),
 *     updated_at    timestamptz NOT NULL DEFAULT now()
 *   );
 *
 *   ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
 *   -- Service-role bypass is sufficient for admin reads/writes.
 *
 * Once the migration is applied, replace this page with the functional
 * AdminCoupons component using the same pattern as Customers/Inventory.
 */

export default function CouponsPage() {
  return (
    <div>
      <div className="mb-8">
        <nav className="mb-2 flex items-center gap-1.5 text-xs text-slate-500">
          <a href="/admin" className="hover:text-slate-700">Dashboard</a>
          <span>/</span>
          <span className="text-slate-800 font-medium">Coupons</span>
        </nav>
        <h1 className="text-2xl font-bold text-slate-950">Coupons</h1>
        <p className="mt-1 text-sm text-slate-600">
          Create and manage percentage or flat-rate discount codes.
        </p>
      </div>

      <div className="flex min-h-[420px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white px-8 py-16 text-center">
        <div className="flex size-16 items-center justify-center rounded-full bg-violet-50">
          <TicketPercent className="size-8 text-violet-600" />
        </div>
        <h2 className="mt-5 text-xl font-semibold text-slate-900">Schema Migration Required</h2>
        <p className="mt-2 max-w-sm text-sm text-slate-500">
          The{" "}
          <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-700">
            coupons
          </code>{" "}
          table has not been created in your Supabase project yet. Apply the
          migration in{" "}
          <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-700">
            supabase/migrations/20260716_coupons.sql
          </code>{" "}
          to enable full coupon management.
        </p>
        <a
          href="/admin"
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#8A5A6A] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#7a4a5a]"
        >
          Back to Dashboard
        </a>
      </div>
    </div>
  );
}
