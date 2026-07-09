import Link from "next/link";

import { createClient } from "@/lib/supabase/server";

type Order = {
  id: number;
  order_number: string;
  grand_total: number;
  payment_status: string;
  order_status: string;
  created_at: string;
};

export default async function OrdersPage() {
  const supabase = await createClient();

  const { data: orders } = await supabase
    .from("orders")
    .select(
      `
      id,
      order_number,
      grand_total,
      payment_status,
      order_status,
      created_at
    `
    )
    .order("created_at", {
      ascending: false,
    });

  return (
    <main className="min-h-screen bg-[#F8F8F8]">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="mb-10 flex items-center justify-between">
          <div>
            <h1 className="font-[family:var(--font-playfair)] text-5xl font-bold">
              Orders
            </h1>

            <p className="mt-3 text-gray-600">
              Customer orders received from the storefront.
            </p>
          </div>

          <Link
            href="/admin"
            className="rounded-full border border-[#8A5A6A] px-6 py-3 font-medium text-[#8A5A6A] transition hover:bg-[#8A5A6A] hover:text-white"
          >
            Dashboard
          </Link>
        </div>

        <div className="overflow-hidden rounded-3xl bg-white shadow-sm">
          <table className="w-full">
            <thead className="bg-[#FAF8F5]">
              <tr>
                <th className="px-6 py-4 text-left">Order</th>
                <th className="px-6 py-4 text-left">grand_total</th>
                <th className="px-6 py-4 text-left">Payment</th>
                <th className="px-6 py-4 text-left">Status</th>
                <th className="px-6 py-4 text-left">Date</th>
              </tr>
            </thead>

            <tbody>
              {orders && orders.length > 0 ? (
                orders.map((order: Order) => (
                  <tr
                    key={order.id}
                    className="border-t"
                  >
                    <td className="px-6 py-5 font-medium">
                      {order.order_number}
                    </td>

                    <td className="px-6 py-5">
                      ₹
                      {Number(order.grand_total).toLocaleString("en-IN")}
                    </td>

                    <td className="px-6 py-5">
                      {order.payment_status}
                    </td>

                    <td className="px-6 py-5">
                      {order.order_status}
                    </td>

                    <td className="px-6 py-5">
                      {new Date(
                        order.created_at
                      ).toLocaleDateString("en-IN")}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-12 text-center text-gray-500"
                  >
                    No orders available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
