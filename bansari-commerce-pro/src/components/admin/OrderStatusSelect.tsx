"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  ORDER_STATUSES,
  ORDER_STATUS_LABELS,
  type OrderStatus,
} from "@/services/order.service";

type Props = {
  orderId: string;
  currentStatus: OrderStatus;
};

export default function OrderStatusSelect({
  orderId,
  currentStatus,
}: Props) {
  const router = useRouter();

  const [status, setStatus] = useState<OrderStatus>(currentStatus);
  const [isPending, startTransition] = useTransition();

  async function handleChange(
    event: React.ChangeEvent<HTMLSelectElement>
  ) {
    const nextStatus = event.target.value as OrderStatus;
    const previousStatus = status;

    setStatus(nextStatus);

    startTransition(async () => {
      try {
        const response = await fetch(
          "/api/orders/status",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              id: orderId,
              status: nextStatus,
            }),
          }
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(
            result.error ?? "Unable to update order status."
          );
        }

        toast.success("Order status updated.");
        router.refresh();
      } catch (error) {
        setStatus(previousStatus);
        toast.error(
          error instanceof Error
            ? error.message
            : "Unable to update order status."
        );
      }
    });
  }

  return (
    <select
      value={status}
      onChange={handleChange}
      disabled={isPending}
      className="rounded-full bg-[#FAF8F5] px-5 py-2 text-sm font-medium disabled:opacity-50"
    >
      {ORDER_STATUSES.map((value) => (
        <option key={value} value={value}>
          {ORDER_STATUS_LABELS[value]}
        </option>
      ))}
    </select>
  );
}
