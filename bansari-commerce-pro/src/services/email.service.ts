import { Resend } from "resend";
import { render } from "@react-email/render";

import { createServiceRoleClient } from "@/lib/supabase/service";
import type { OrderWithItems, OrderStatus } from "./order.service";

import OrderConfirmationEmail from "@/emails/templates/OrderConfirmationEmail";
import PaymentSuccessfulEmail from "@/emails/templates/PaymentSuccessfulEmail";
import OrderShippedEmail from "@/emails/templates/OrderShippedEmail";
import OutForDeliveryEmail from "@/emails/templates/OutForDeliveryEmail";
import DeliveredEmail from "@/emails/templates/DeliveredEmail";

/**
 * Single entry point for all order-lifecycle transactional email.
 *
 * Callers (API routes) only ever call `sendOrderEvent` or
 * `sendStatusEmailsIfAny`. Everything else — which statuses map to which
 * emails, which template renders which event, how duplicates are prevented,
 * how delivery is logged — is private to this file. Routes must stay thin
 * and unaware of this mapping.
 *
 * Duplicate prevention is fully atomic:
 * - Step 1: Attempt an upsert with ignoreDuplicates=true. PostgREST maps
 *   this to INSERT ... ON CONFLICT (order_id,event,recipient_email) DO NOTHING.
 *   If a row is returned, this process won the reservation and may send.
 * - Step 2: If no row is returned (conflict), immediately attempt a single
 *   conditional UPDATE against rows with status='failed'. Only the caller
 *   that gets a row back from this UPDATE may send.
 *   No SELECT after conflict; no SELECT-then-UPDATE race.
 *
 * Why .upsert() not .insert():
 *   In @supabase/supabase-js ^2.110.0 (postgrest-js source verified),
 *   insert() does not accept ignoreDuplicates or onConflict options.
 *   Those options live exclusively on upsert(). The PostgREST wire format
 *   emitted is identical: Prefer: resolution=ignore-duplicates + on_conflict=.
 *
 * provider is NULL during reservation; populated only after successful send.
 * See the migration for the email_delivery_log table definition.
 *
 * Email sending is best-effort. A failure here must never throw back into
 * checkout, the Razorpay webhook, or the admin status route. This file
 * swallows and logs its own internal errors; callers' try/catch is a
 * defensive backstop, not the primary error path.
 */

export type OrderEmailEvent =
  | "order_confirmed"
  | "payment_successful"
  | "order_shipped"
  | "out_for_delivery"
  | "order_delivered";

type SendOrderEventInput = {
  orderId: string;
  event: OrderEmailEvent;
};

// Bumping this constant is the single place to version template output
// if templates or their prop shape change in a way worth tracking.
const TEMPLATE_VERSION = "v1" as const;

type BaseEmailProps = ReturnType<typeof buildBaseProps>;

type EmailTemplateDef = {
  template: (props: BaseEmailProps) => React.JSX.Element;
  subject: (orderNumber: string) => string;
  buildProps: (order: OrderWithItems) => BaseEmailProps;
  // If true, this event will not send unless payment_status is "paid".
  // Guards payment_successful from firing for unverified/replayed events.
  requiresPaymentVerified?: boolean;
};

// The one place event → template → subject mapping lives.
// Adding a new lifecycle email means adding one entry here, not touching any route.
const EMAIL_EVENT_REGISTRY: Record<OrderEmailEvent, EmailTemplateDef> = {
  order_confirmed: {
    template: OrderConfirmationEmail,
    subject: (n) => `Order Confirmed — ${n}`,
    buildProps: buildBaseProps,
  },
  payment_successful: {
    template: PaymentSuccessfulEmail,
    subject: (n) => `Payment Successful — ${n}`,
    buildProps: buildBaseProps,
    requiresPaymentVerified: true,
  },
  order_shipped: {
    template: OrderShippedEmail,
    subject: (n) => `Your Order Has Shipped — ${n}`,
    buildProps: buildBaseProps,
  },
  out_for_delivery: {
    template: OutForDeliveryEmail,
    subject: (n) => `Your Order Is Out For Delivery — ${n}`,
    buildProps: buildBaseProps,
  },
  order_delivered: {
    template: DeliveredEmail,
    subject: (n) => `Your Order Has Been Delivered — ${n}`,
    buildProps: buildBaseProps,
  },
};

// Maps order_status transitions to the customer-facing email event they trigger.
// Statuses not present here (placed, processing, packed, cancelled) send no email.
// This is the ONLY place that knows which statuses generate emails.
const STATUS_TO_EVENT: Partial<Record<OrderStatus, OrderEmailEvent>> = {
  shipped: "order_shipped",
  out_for_delivery: "out_for_delivery",
  delivered: "order_delivered",
};

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM;

if (!RESEND_API_KEY) {
  console.warn(
    "[email.service] RESEND_API_KEY is not configured; all email sending will be skipped."
  );
}
if (!EMAIL_FROM) {
  console.warn(
    "[email.service] EMAIL_FROM is not configured; all email sending will be skipped."
  );
}

// Small provider wrapper — the only place the Resend SDK is touched.
// If the provider is ever swapped, only this function changes.
const resendClient = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

async function sendViaResend(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ providerMessageId: string | null }> {
  if (!resendClient || !EMAIL_FROM) {
    throw new Error(
      "Email provider not configured (missing RESEND_API_KEY or EMAIL_FROM)."
    );
  }

  const { data, error } = await resendClient.emails.send({
    from: EMAIL_FROM,
    to: [params.to],
    subject: params.subject,
    html: params.html,
  });

  if (error) {
    throw new Error(`Resend send failed: ${error.message ?? String(error)}`);
  }

  return { providerMessageId: data?.id ?? null };
}

function buildBaseProps(order: OrderWithItems) {
  return {
    customerName: order.customer_name,
    orderNumber: order.order_number,
    orderDate: new Date(order.created_at).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }),
    items: order.order_items.map((item) => ({
      id: item.id,
      name: item.product_name,
      variant:
        [item.variant_color, item.variant_size].filter(Boolean).join(", ") ||
        undefined,
      quantity: item.quantity,
      unitPrice: item.unit_price,
    })),
    shippingAddress: {
      name: order.shipping_name,
      line1: order.shipping_address_line1,
      line2: order.shipping_address_line2,
      city: order.shipping_city,
      state: order.shipping_state,
      postalCode: order.shipping_postal_code,
      country: order.shipping_country,
      phone: order.shipping_phone ?? undefined,
    },
    currency: order.currency,
    subtotal: order.subtotal,
    discount: order.discount,
    shippingFee: order.shipping_fee,
    tax: order.tax,
    grandTotal: order.grand_total,
  };
}

/**
 * Authoritative order loader for email rendering. Kept separate from
 * order.service.ts's getOrderById (admin read path) so this loader can
 * evolve its column selection independently of the admin UI.
 */
async function loadOrderForEmail(
  orderId: string
): Promise<OrderWithItems | null> {
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from("orders")
    .select("*, order_items(*)")
    .eq("id", orderId)
    .maybeSingle();

  if (error) {
    console.error("[email.service] loadOrderForEmail failed", {
      orderId,
      error,
    });
    return null;
  }

  return data as OrderWithItems | null;
}

/**
 * Atomically reserves or claims the right to send one
 * (order_id, event, recipient_email) email.
 *
 * Step 1 — upsert with ignoreDuplicates=true:
 *   PostgREST emits:
 *     POST /email_delivery_log
 *     Prefer: resolution=ignore-duplicates
 *     ?on_conflict=order_id,event,recipient_email
 *   which maps to:
 *     INSERT ... ON CONFLICT (order_id,event,recipient_email) DO NOTHING
 *     RETURNING id;
 *   If a row is returned → this process owns the reservation. Done.
 *
 * Step 2 — if no row returned (conflict exists):
 *   Immediately attempt a single conditional UPDATE:
 *     UPDATE email_delivery_log
 *     SET status='pending', error_message=NULL,
 *         provider_message_id=NULL, sent_at=NULL
 *     WHERE order_id=... AND event=... AND recipient_email=...
 *       AND status='failed'
 *     RETURNING id;
 *   If one row returned → this process owns the retry. Done.
 *   If zero rows returned → another process owns it (sent/pending/claimed).
 *
 * provider is NULL in both paths; populated only after a successful send.
 */
async function reserveOrClaimDelivery(params: {
  orderId: string;
  event: OrderEmailEvent;
  recipientEmail: string;
}): Promise<{ canSend: boolean; rowId: string }> {
  const supabase = createServiceRoleClient();

  // Step 1: upsert with ignoreDuplicates — maps to INSERT ... ON CONFLICT DO NOTHING
  const { data: upsertData, error: upsertError } = await supabase
    .from("email_delivery_log")
    .upsert(
      {
        order_id: params.orderId,
        event: params.event,
        recipient_email: params.recipientEmail,
        provider: null,
        provider_message_id: null,
        status: "pending",
        error_message: null,
        template_version: TEMPLATE_VERSION,
        sent_at: null,
      },
      {
        onConflict: "order_id,event,recipient_email",
        ignoreDuplicates: true,
      }
    )
    .select("id")
    .maybeSingle();

  if (upsertData) {
    // New row inserted → we won the reservation
    return { canSend: true, rowId: upsertData.id as string };
  }

  if (upsertError) {
    console.error("[email.service] reserveOrClaimDelivery upsert failed", {
      ...params,
      error: upsertError,
    });
    return { canSend: false, rowId: "" };
  }

  // Upsert returned no row → conflict on an existing row.
  // Attempt to atomically claim it if it is in status='failed'.
  const { data: claimData, error: claimError } = await supabase
    .from("email_delivery_log")
    .update({
      status: "pending",
      error_message: null,
      provider_message_id: null,
      sent_at: null,
      // provider remains NULL until send succeeds
    })
    .eq("order_id", params.orderId)
    .eq("event", params.event)
    .eq("recipient_email", params.recipientEmail)
    .eq("status", "failed")
    .select("id")
    .maybeSingle();

  if (claimError || !claimData) {
    // Row is sent, pending (in-flight), or already claimed by another process.
    return { canSend: false, rowId: "" };
  }

  return { canSend: true, rowId: claimData.id as string };
}

async function markDeliveryOutcome(params: {
  rowId: string;
  status: "sent" | "failed";
  providerMessageId: string | null;
  errorMessage: string | null;
  sentAt: string | null;
}): Promise<void> {
  const supabase = createServiceRoleClient();

  const { error } = await supabase
    .from("email_delivery_log")
    .update({
      status: params.status,
      // Populate provider only on success; leave NULL on failure
      provider: params.status === "sent" ? "resend" : null,
      provider_message_id: params.providerMessageId,
      error_message: params.errorMessage,
      sent_at: params.sentAt,
    })
    .eq("id", params.rowId);

  if (error) {
    console.error("[email.service] markDeliveryOutcome failed", {
      ...params,
      error,
    });
  }
}

/**
 * Send a lifecycle email for a specific order event.
 *
 * Safe to call multiple times for the same (orderId, event) — every call
 * after the first successful reservation is a no-op.
 *
 * Never throws for expected conditions (missing order, missing recipient,
 * already reserved, provider not configured, render/send failure).
 */
export async function sendOrderEvent({
  orderId,
  event,
}: SendOrderEventInput): Promise<void> {
  const templateDef = EMAIL_EVENT_REGISTRY[event];

  if (!templateDef) {
    console.warn("[email.service] Unknown email event", { orderId, event });
    return;
  }

  if (!resendClient || !EMAIL_FROM) {
    console.warn(
      "[email.service] Email provider not configured; skipping event",
      { orderId, event }
    );
    return;
  }

  const order = await loadOrderForEmail(orderId);

  if (!order) {
    console.error("[email.service] Order not found for email event", {
      orderId,
      event,
    });
    return;
  }

  if (templateDef.requiresPaymentVerified && order.payment_status !== "paid") {
    console.info(
      "[email.service] Skipping event — payment_status is not paid",
      { orderId, event, paymentStatus: order.payment_status }
    );
    return;
  }

  const recipientEmail = order.shipping_email ?? order.customer_email;

  if (!recipientEmail) {
    console.error(
      "[email.service] No recipient email available for order",
      { orderId, event }
    );
    return;
  }

  const { canSend, rowId } = await reserveOrClaimDelivery({
    orderId,
    event,
    recipientEmail,
  });

  if (!canSend || !rowId) {
    // Another process already owns this send or it has been sent.
    return;
  }

  try {
    const props = templateDef.buildProps(order);
    const element = templateDef.template(props);
    const html = await render(element, { pretty: false });

    const { providerMessageId } = await sendViaResend({
      to: recipientEmail,
      subject: templateDef.subject(order.order_number),
      html,
    });

    await markDeliveryOutcome({
      rowId,
      status: "sent",
      providerMessageId,
      errorMessage: null,
      sentAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[email.service] Render/send failed", {
      orderId,
      event,
      error: err,
    });

    await markDeliveryOutcome({
      rowId,
      status: "failed",
      providerMessageId: null,
      errorMessage: err instanceof Error ? err.message : String(err),
      sentAt: null,
    });
  }
}

/**
 * Called by the order-status route after a successful status update.
 * Routes pass only the new status — this function owns the decision of
 * whether that status generates a customer email and which one.
 */
export async function sendStatusEmailsIfAny(
  orderId: string,
  newStatus: OrderStatus
): Promise<void> {
  const event = STATUS_TO_EVENT[newStatus];

  if (!event) {
    return;
  }

  await sendOrderEvent({ orderId, event });
}
