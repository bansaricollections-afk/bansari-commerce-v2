"use client";

import { useCallback, useEffect, useState } from "react";
import { Copy, Loader2, MessageCircle, RefreshCw, ShoppingCart } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type AbandonedCart = {
  id: string;
  reference: string;
  createdAt: string;
  expiresAt: string | null;
  ageMinutes: number | null;
  value: number;
  currency: string;
  itemCount: number;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  isGuest: boolean;
  state: "ABANDONED" | "EXPIRED";
};

function formatAge(minutes: number | null): string {
  if (minutes === null) return "—";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
}

function formatStarted(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

/**
 * Digits-only phone for a wa.me deep link. Indian numbers are stored either
 * bare (10 digits) or already prefixed; a bare number gets the 91 country
 * code so the link resolves. Returns null when nothing usable was captured —
 * no number is ever invented.
 */
function whatsappNumber(phone: string | null): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `91${digits}`;
  if (digits.length >= 11 && digits.length <= 15) return digits;
  return null;
}

/**
 * AbandonedCartsTable — read-only view of checkouts that were started and
 * never paid for.
 *
 * Every record shown is an existing pending_orders row; this component creates
 * nothing, mutates nothing, and sends nothing. Recovery is deliberately manual:
 * the actions here copy details or open WhatsApp with the number the customer
 * already gave at checkout, leaving the decision to contact with the operator.
 *
 * Note on retention: EXPIRED is derived from the row's expiry timestamp, not
 * from any deletion having happened. Purging is a separate database process
 * (cleanup_expired_pending_orders), and preview showed rows surviving well
 * past their expiry — pg_cron is not scheduled in every environment. So no
 * retention period is asserted anywhere in this component, and operators must
 * not read a recovery deadline into it.
 */
export default function AbandonedCartsTable() {
  const [carts, setCarts] = useState<AbandonedCart[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [excludedAsPaid, setExcludedAsPaid] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/abandoned-carts", { cache: "no-store" });

      if (res.status === 401 || res.status === 403) {
        setError("You are not authorised to view abandoned carts.");
        setCarts([]);
        return;
      }

      const json = await res.json();
      if (!res.ok || !json?.success) {
        setError(json?.message ?? "Could not load abandoned carts.");
        setCarts([]);
        return;
      }

      setCarts(Array.isArray(json.data) ? json.data : []);
      setExcludedAsPaid(json.excludedAsPaid ?? 0);
    } catch {
      setError("Could not reach the server.");
      setCarts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  /**
   * Copies contact and cart details to the clipboard so the operator can use
   * them in whichever channel they choose. Nothing is transmitted, logged or
   * persisted — the string never leaves the operator's machine.
   */
  const copyDetails = async (cart: AbandonedCart) => {
    const lines = [
      `Checkout: ${cart.reference}`,
      `Started: ${formatStarted(cart.createdAt)}`,
      `Value: ₹${cart.value.toLocaleString("en-IN")} (${cart.itemCount} item${cart.itemCount === 1 ? "" : "s"})`,
      cart.customerName ? `Name: ${cart.customerName}` : null,
      cart.customerPhone ? `Phone: ${cart.customerPhone}` : null,
      cart.customerEmail ? `Email: ${cart.customerEmail}` : null,
    ].filter(Boolean);

    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      toast.success("Recovery details copied");
    } catch {
      toast.error("Could not copy to clipboard");
    }
  };

  const totalValue = carts.reduce((sum, c) => sum + c.value, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Abandoned Carts</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Checkouts started over 30 minutes ago that were never paid for.
            </p>
          </div>
          <Button
            onClick={() => void load()}
            variant="outline"
            className="flex items-center gap-2"
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: "Open carts", value: String(carts.length) },
          { label: "Value at risk", value: `₹${totalValue.toLocaleString("en-IN")}` },
          { label: "Excluded (already paid)", value: String(excludedAsPaid) },
        ].map(({ label, value }) => (
          <div
            key={label}
            className="bg-white rounded-lg border border-gray-200 p-3 flex items-center gap-3"
          >
            <ShoppingCart className="h-4 w-4 text-gray-400 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-gray-500">{label}</p>
              <p className="text-lg font-semibold text-gray-900">{value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="max-w-7xl mx-auto px-6 pb-10">
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading abandoned carts…
            </div>
          ) : error ? (
            <p className="py-16 text-center text-sm text-red-600">{error}</p>
          ) : carts.length === 0 ? (
            <p className="py-16 text-center text-sm text-gray-500">
              No abandoned checkouts to show.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Checkout</th>
                    <th className="px-4 py-3 font-medium">Started</th>
                    <th className="px-4 py-3 font-medium">Age</th>
                    <th className="px-4 py-3 font-medium">Value</th>
                    <th className="px-4 py-3 font-medium">Items</th>
                    <th className="px-4 py-3 font-medium">Customer</th>
                    <th className="px-4 py-3 font-medium">State</th>
                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {carts.map((cart) => {
                    const wa = whatsappNumber(cart.customerPhone);

                    return (
                      <tr key={cart.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-mono text-xs text-gray-700 whitespace-nowrap">
                          {cart.reference}
                        </td>
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                          {formatStarted(cart.createdAt)}
                        </td>
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                          {formatAge(cart.ageMinutes)}
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-900 tabular-nums whitespace-nowrap">
                          ₹{cart.value.toLocaleString("en-IN")}
                        </td>
                        <td className="px-4 py-3 text-gray-600 tabular-nums">
                          {cart.itemCount}
                        </td>
                        <td className="px-4 py-3">
                          <div className="min-w-0">
                            <p className="truncate font-medium text-gray-900">
                              {cart.customerName ?? "—"}
                            </p>
                            <p className="truncate text-xs text-gray-500">
                              {cart.customerPhone ?? cart.customerEmail ?? "No contact captured"}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant={cart.state === "EXPIRED" ? "outline" : "secondary"}
                          >
                            {cart.state}
                          </Badge>
                          {cart.isGuest && (
                            <span className="ml-2 text-xs text-gray-400">guest</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => void copyDetails(cart)}
                              className="flex items-center gap-1.5"
                            >
                              <Copy className="h-3.5 w-3.5" />
                              Copy
                            </Button>

                            {/*
                             * Manual action only. This opens WhatsApp with the
                             * number the customer already provided at checkout
                             * and composes nothing — the operator writes and
                             * sends the message themselves. No automated
                             * outreach, and no implied messaging consent.
                             */}
                            {wa && (
                              <a
                                href={`https://wa.me/${wa}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-100"
                              >
                                <MessageCircle className="h-3.5 w-3.5" />
                                WhatsApp
                              </a>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <p className="mt-3 text-xs text-gray-400">
          EXPIRED is a derived state, shown once a checkout has passed its expiry
          timestamp. Removal is handled by a separate database cleanup process, so
          expired records stay visible until that process removes them — treat no
          deadline on this screen as a recovery cut-off. Checkouts that were paid
          for are excluded even when their pending record was not closed.
        </p>
      </div>
    </div>
  );
}
