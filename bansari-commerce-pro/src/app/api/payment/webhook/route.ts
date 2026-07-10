import { NextRequest, NextResponse } from "next/server";

import { verifyWebhookSignature } from "@/lib/razorpay";
import { updatePaymentStatusFromWebhook } from "@/services/order.service";

const HANDLED_EVENTS = new Set(["payment.captured", "payment.failed"]);

export async function POST(request: NextRequest) {
  // Signature verification requires the exact raw body bytes — parsing via
  // request.json() first would lose that, so read as text and verify
  // before ever attempting to interpret it as JSON.
  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature");

  if (!signature || !verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json(
      { success: false, error: "Invalid webhook signature." },
      { status: 400 }
    );
  }

  let event: unknown;

  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON payload." },
      { status: 400 }
    );
  }

  if (!event || typeof event !== "object") {
    return NextResponse.json(
      { success: false, error: "Invalid webhook payload." },
      { status: 400 }
    );
  }

  const eventType = (event as Record<string, unknown>).event;

  if (typeof eventType !== "string" || !HANDLED_EVENTS.has(eventType)) {
    // Acknowledge unhandled event types with 2xx so Razorpay doesn't retry
    // deliveries we have no handling for.
    return NextResponse.json(
      { success: true, handled: false },
      { status: 200 }
    );
  }

  const payload = (event as Record<string, unknown>).payload as
    | Record<string, unknown>
    | undefined;
  const payment = payload?.payment as Record<string, unknown> | undefined;
  const entity = payment?.entity as Record<string, unknown> | undefined;
  const paymentId = entity?.id;

  if (typeof paymentId !== "string" || paymentId.length === 0) {
    return NextResponse.json(
      { success: false, error: "Webhook payload is missing a payment id." },
      { status: 400 }
    );
  }

  try {
    const status = eventType === "payment.captured" ? "paid" : "failed";
    const result = await updatePaymentStatusFromWebhook(paymentId, status);

    if (!result.updated) {
      console.warn(
        "Webhook received for unknown Razorpay payment:",
        paymentId
      );
    }
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to process webhook.",
      },
      { status: 500 }
    );
  }

  // 200 regardless of whether a matching order was found — "no matching
  // order" (a failed payment that never reached order creation, or a
  // stale failure event for an already-paid order) is a handled, expected
  // outcome, not a reason for Razorpay to retry.
  return NextResponse.json(
    { success: true, handled: true },
    { status: 200 }
  );
}