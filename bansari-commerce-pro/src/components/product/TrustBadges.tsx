import {
  ShieldCheck,
  Truck,
  RefreshCcw,
} from "lucide-react";

export default function TrustBadges() {
  return (
    <div className="space-y-4 rounded-3xl bg-[#FFF8F2] p-6">

      <div className="flex items-center gap-3">
        <Truck className="text-[#8A5A6A]" />
        <span>Free Shipping on eligible orders</span>
      </div>

      <div className="flex items-center gap-3">
        <RefreshCcw className="text-[#8A5A6A]" />
        <span>Easy Exchange</span>
      </div>

      <div className="flex items-center gap-3">
        <ShieldCheck className="text-[#8A5A6A]" />
        <span>100% Secure Payment</span>
      </div>

    </div>
  );
}