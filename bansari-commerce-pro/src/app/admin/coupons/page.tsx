import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Coupons | Bansari Commerce Pro",
  description: "Create and manage discount coupons.",
};

/**
 * FIX: The previous version of this file unconditionally rendered a
 * "Schema Migration Required" placeholder with NO database check.
 * public.coupons already exists. The static gate has been removed.
 *
 * This page now delegates to the CouponManagement client component.
 * Build that component (src/components/admin/coupons/CouponManagement.tsx)
 * following the same pattern as ProductManagement.tsx.
 */
import CouponManagement from "@/components/admin/coupons/CouponManagement";

export default function CouponsPage() {
  return <CouponManagement />;
}
