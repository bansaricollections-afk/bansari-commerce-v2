import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import {
  ORDER_STATUSES,
  updateOrderStatus,
  type OrderStatus,
} from "@/services/order.service";
import { sendStatusEmailsIfAny } from "@/services/email.service";
import { createClient } from "@/lib/supabase/server";

function isValidOrderStatus(value: unknown): value is OrderStatus {
  return (
    typeof value === "string" &&
    (ORDER_STATUSES as readonly string[]).includes(value)
  );
}

export async function POST(request: NextRequest) {
  // TODO: Replace this session check with a proper admin role check once
  // a role system (e.g. profiles.role = 'admin') is implemented. For now,
  // requiring an authenticated session is the safest protection available
  // without a role system — it matches the protection the middleware
  // already applies to /admin/* UI routes.
  const serverClient = await createClient();
  const {
    data: { user },
  } = await serverClient.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { success: false, error: "Unauthorized." },
      { status: 401 }
    );
  }

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

  // Email failure must never affect the successful HTTP response.
  try {
    await sendStatusEmailsIfAny(id, status);
  } catch (err) {
    console.error("[orders/status] sendStatusEmailsIfAny failed:", err);
  }

  revalidatePath(`/admin/orders/${id}`);
  revalidatePath("/admin/orders");

  return NextResponse.json({ success: true }, { status: 200 });
}
