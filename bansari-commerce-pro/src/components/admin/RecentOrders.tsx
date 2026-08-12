import Link from "next/link";
import { ShoppingBag } from "lucide-react";

type RecentOrder = {
  id: string;
  orderNumber: string;
  customer: string;
  total: string;
  status: string;
};

type RecentOrdersProps = {
  orders?: RecentOrder[];
};

export function RecentOrders({ orders = [] }: RecentOrdersProps) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white">
      <div className="flex items-center gap-2 border-b border-neutral-200 px-5 py-4">
        <span className="h-3.5 w-0.5 rounded-full bg-[#C9A96E]" />
        <h2 className="text-xs font-bold uppercase tracking-[0.12em] text-neutral-700">
          Recent Orders
        </h2>
      </div>

      {orders.length > 0 ? (
        <div className="divide-y divide-neutral-100">
          {orders.map((order) => (
            <Link
              key={order.id}
              href={`/admin/orders/${order.id}`}
              className="flex items-center justify-between gap-4 px-5 py-3.5 transition-colors hover:bg-neutral-50/70"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-neutral-900">
                  {order.orderNumber}
                </p>
                <p className="mt-0.5 text-xs text-neutral-500">
                  {order.customer}
                </p>
              </div>

              <div className="flex-shrink-0 text-right">
                <p className="text-sm font-semibold text-neutral-900">{order.total}</p>
                <span className="mt-1 inline-block rounded-full border border-neutral-200 px-2 py-0.5 text-[11px] font-medium text-neutral-600">
                  {order.status}
                </span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
          <ShoppingBag className="size-5 text-neutral-300" strokeWidth={1.5} />
          <p className="text-sm font-medium text-neutral-700">No orders yet</p>
          <p className="text-xs text-neutral-400">
            Your first customer order will appear here.
          </p>
        </div>
      )}
    </div>
  );
}
