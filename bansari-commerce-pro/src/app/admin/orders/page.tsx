import Link from "next/link";

import { PAYMENT_STATUSES } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import { ORDER_STATUSES, ORDER_STATUS_LABELS } from "@/services/order.service";

type Order = {
  id: number;
  order_number: string;
  grand_total: number;
  payment_status: string;
  order_status: string;
  created_at: string;
};

const PAGE_SIZE = 25;

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function OrdersPage({ searchParams }: Props) {
  const params = await searchParams;
  const pageParam = Array.isArray(params.page) ? params.page[0] : params.page;
  const statusParam = Array.isArray(params.status) ? params.status[0] : params.status;
  const paymentParam = Array.isArray(params.payment) ? params.payment[0] : params.payment;
  const searchParam = Array.isArray(params.search) ? params.search[0] : params.search;
  const selectedStatus = ORDER_STATUSES.find((status) => status === statusParam);
  const selectedPaymentStatus = PAYMENT_STATUSES.find(
    (status) => status === paymentParam
  );
  const search = searchParam?.trim() ?? "";
  const currentPage = Math.max(1, Number.parseInt(pageParam ?? "1", 10) || 1);
  const from = (currentPage - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  const supabase = await createClient();

  let ordersQuery = supabase
    .from("orders")
    .select(
      `
      id,
      order_number,
      grand_total,
      payment_status,
      order_status,
      created_at
    `,
      { count: "exact" }
    )
    .order("created_at", {
      ascending: false,
    });

  if (selectedStatus) {
    ordersQuery = ordersQuery.eq("order_status", selectedStatus);
  }
  if (selectedPaymentStatus) {
    ordersQuery = ordersQuery.eq("payment_status", selectedPaymentStatus);
  }
  if (search) {
    ordersQuery = ordersQuery.ilike("order_number", `%${search}%`);
  }

  const { data: orders, count } = await ordersQuery.range(from, to);

  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));
  const hasPreviousPage = currentPage > 1;
  const hasNextPage = currentPage < totalPages;

  const getQueryParams = (excludedKeys: string[] = []) => {
    const query = new URLSearchParams();

    for (const [key, value] of Object.entries(params)) {
      if (excludedKeys.includes(key) || value === undefined) continue;
      for (const entry of Array.isArray(value) ? value : [value]) {
        query.append(key, entry);
      }
    }

    return query;
  };

  const getPageHref = (page: number) => {
    const query = getQueryParams(["page"]);
    query.set("page", String(page));
    return `?${query.toString()}`;
  };

  const filterQuery = getQueryParams(["status", "payment", "search"]);

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

        <form method="get">
          {Array.from(filterQuery.entries()).map(([key, value], index) => (
            <input key={`${key}-${index}`} type="hidden" name={key} value={value} />
          ))}

          <select name="status" defaultValue={selectedStatus ?? ""}>
            <option value="">All</option>
            {ORDER_STATUSES.map((status) => (
              <option key={status} value={status}>
                {ORDER_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
          <select name="payment" defaultValue={selectedPaymentStatus ?? ""}>
            <option value="">All</option>
            {PAYMENT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          <input name="search" defaultValue={search} />
          <button type="submit">Search</button>
        </form>

        <div className="overflow-hidden rounded-3xl bg-white shadow-sm">
          <table className="w-full">
            <thead className="bg-[#FAF8F5]">
              <tr>
                <th className="px-6 py-4 text-left">Order</th>
                <th className="px-6 py-4 text-left">Order Total</th>
                <th className="px-6 py-4 text-left">Payment</th>
                <th className="px-6 py-4 text-left">Status</th>
                <th className="px-6 py-4 text-left">Date</th>
                <th className="px-6 py-4 text-left">Actions</th>
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

                    <td className="px-6 py-5">
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="font-medium text-[#8A5A6A] hover:underline"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-12 text-center text-gray-500"
                  >
                    No orders available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-6 flex items-center justify-between">
          {hasPreviousPage ? (
            <Link
              href={getPageHref(currentPage - 1)}
              className="rounded-full border border-[#8A5A6A] px-6 py-3 font-medium text-[#8A5A6A] transition hover:bg-[#8A5A6A] hover:text-white"
            >
              Previous
            </Link>
          ) : (
            <span className="rounded-full border border-[#8A5A6A] px-6 py-3 font-medium text-[#8A5A6A] opacity-50">
              Previous
            </span>
          )}

          <span className="text-gray-600">
            Page {currentPage} of {totalPages}
          </span>

          {hasNextPage ? (
            <Link
              href={getPageHref(currentPage + 1)}
              className="rounded-full border border-[#8A5A6A] px-6 py-3 font-medium text-[#8A5A6A] transition hover:bg-[#8A5A6A] hover:text-white"
            >
              Next
            </Link>
          ) : (
            <span className="rounded-full border border-[#8A5A6A] px-6 py-3 font-medium text-[#8A5A6A] opacity-50">
              Next
            </span>
          )}
        </div>
      </div>
    </main>
  );
}
