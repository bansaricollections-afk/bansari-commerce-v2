import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import {
  ORDER_STATUSES,
  updateOrderStatus,
  type OrderStatus,
} from "@/services/order.service";

function isValidOrderStatus(value: unknown): value is OrderStatus {
  return (
    typeof value === "string" &&
    (ORDER_STATUSES as readonly string[]).includes(value)
  );
}

export async function POST(request: NextRequest) {
  let rawBody: unknown;

  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body." },
      { status: 400 }
    );
  }

  if (!rawBody || typeof rawBody !== "object") {
    return NextResponse.json(
      { success: false, error: "Request body must be an object." },
      { status: 400 }
    );
  }

  const { id, status } = rawBody as Record<string, unknown>;

  if (typeof id !== "string" || id.trim().length === 0) {
    return NextResponse.json(
      { success: false, error: "A valid order id is required." },
      { status: 400 }
    );
  }

  if (!isValidOrderStatus(status)) {
    return NextResponse.json(
      {
        success: false,
        error: `status must be one of: ${ORDER_STATUSES.join(", ")}`,
      },
      { status: 400 }
    );
  }

  try {
    await updateOrderStatus(id, status);
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to update order status.",
      },
      { status: 500 }
    );
  }

  revalidatePath(`/admin/orders/${id}`);
  revalidatePath("/admin/orders");

  return NextResponse.json({ success: true }, { status: 200 });
}