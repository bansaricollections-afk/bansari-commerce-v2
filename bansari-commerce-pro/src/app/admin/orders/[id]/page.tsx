import Link from "next/link";
import { notFound } from "next/navigation";

import { getOrderById, type OrderStatus } from "@/services/order.service";
import OrderStatusSelect from "@/components/admin/OrderStatusSelect";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function OrderDetailPage({ params }: Props) {
  const { id } = await params;

  const order = await getOrderById(id);

  if (!order) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[#F8F8F8]">
      <div className="mx-auto max-w-5xl px-6 py-12">
        <div className="mb-10 flex items-center justify-between">
          <div>
            <h1 className="font-[family:var(--font-playfair)] text-5xl font-bold">
              {order.order_number}
            </h1>

            <p className="mt-3 text-gray-600">
              Placed on{" "}
              {new Date(order.created_at).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>

          <Link
            href="/admin/orders"
            className="rounded-full border border-[#8A5A6A] px-6 py-3 font-medium text-[#8A5A6A] transition hover:bg-[#8A5A6A] hover:text-white"
          >
            Back to Orders
          </Link>
        </div>

        <div className="mb-8 flex items-center gap-4">
          <OrderStatusSelect
            orderId={order.id}
            currentStatus={order.order_status as OrderStatus}
          />

          <span className="rounded-full bg-[#FAF8F5] px-5 py-2 text-sm font-medium">
            Payment Status: {order.payment_status}
          </span>
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          <section className="rounded-3xl bg-white p-8 shadow-sm">
            <h2 className="mb-6 text-2xl font-semibold">
              Customer Information
            </h2>

            <div className="space-y-2 text-gray-700">
              <p>{order.customer_name}</p>
              <p>{order.customer_email}</p>
              <p>{order.customer_phone ?? "—"}</p>
            </div>
          </section>

          <section className="rounded-3xl bg-white p-8 shadow-sm">
            <h2 className="mb-6 text-2xl font-semibold">
              Shipping Information
            </h2>

            <div className="space-y-2 text-gray-700">
              <p>{order.shipping_name}</p>
              <p>{order.shipping_phone}</p>
              {order.shipping_email && <p>{order.shipping_email}</p>}
              <p>{order.shipping_address_line1}</p>
              {order.shipping_address_line2 && (
                <p>{order.shipping_address_line2}</p>
              )}
              <p>
                {order.shipping_city}, {order.shipping_state}{" "}
                {order.shipping_postal_code}
              </p>
              <p>{order.shipping_country}</p>
            </div>
          </section>

          <section className="rounded-3xl bg-white p-8 shadow-sm md:col-span-2">
            <h2 className="mb-6 text-2xl font-semibold">
              Payment Information
            </h2>

            <div className="grid gap-2 text-gray-700 md:grid-cols-2">
              <p>Provider: {order.payment_provider ?? "—"}</p>
              <p>Method: {order.payment_method ?? "—"}</p>
              <p>Payment Reference: {order.payment_reference ?? "—"}</p>
              <p>Razorpay Order ID: {order.razorpay_order_id ?? "—"}</p>
              <p>Razorpay Payment ID: {order.razorpay_payment_id ?? "—"}</p>
            </div>
          </section>
        </div>

        <section className="mt-8 overflow-hidden rounded-3xl bg-white shadow-sm">
          <h2 className="px-8 pt-8 text-2xl font-semibold">Order Items</h2>

          <table className="mt-6 w-full">
            <thead className="bg-[#FAF8F5]">
              <tr>
                <th className="px-6 py-4 text-left">Product</th>
                <th className="px-6 py-4 text-left">Variant</th>
                <th className="px-6 py-4 text-left">Unit Price</th>
                <th className="px-6 py-4 text-left">Quantity</th>
                <th className="px-6 py-4 text-left">Line Total</th>
              </tr>
            </thead>

            <tbody>
              {order.order_items.length > 0 ? (
                order.order_items.map((item) => (
                  <tr key={item.id} className="border-t">
                    <td className="px-6 py-5 font-medium">
                      {item.product_name}
                      {item.product_sku && (
                        <span className="block text-sm text-gray-500">
                          {item.product_sku}
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-5">
                      {[item.variant_color, item.variant_size]
                        .filter(Boolean)
                        .join(" / ") || "—"}
                    </td>

                    <td className="px-6 py-5">
                      ₹{Number(item.unit_price).toLocaleString("en-IN")}
                    </td>

                    <td className="px-6 py-5">{item.quantity}</td>

                    <td className="px-6 py-5">
                      ₹{Number(item.line_total).toLocaleString("en-IN")}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-12 text-center text-gray-500"
                  >
                    No items found for this order.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <div className="space-y-2 border-t px-8 py-8">
            <div className="flex justify-between text-gray-700">
              <span>Subtotal</span>
              <span>₹{Number(order.subtotal).toLocaleString("en-IN")}</span>
            </div>

            <div className="flex justify-between text-gray-700">
              <span>Discount</span>
              <span>₹{Number(order.discount).toLocaleString("en-IN")}</span>
            </div>

            <div className="flex justify-between text-gray-700">
              <span>Shipping</span>
              <span>
                ₹{Number(order.shipping_fee).toLocaleString("en-IN")}
              </span>
            </div>

            <div className="flex justify-between text-gray-700">
              <span>Tax</span>
              <span>₹{Number(order.tax).toLocaleString("en-IN")}</span>
            </div>

            <div className="flex justify-between text-2xl font-bold">
              <span>Grand Total</span>
              <span>
                ₹{Number(order.grand_total).toLocaleString("en-IN")}
              </span>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}