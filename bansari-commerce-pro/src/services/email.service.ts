/**
 * email.service.ts
 *
 * Transactional email via the Resend REST API.
 * Uses native fetch — no additional npm dependency required.
 *
 * Required environment variables:
 *   RESEND_API_KEY     — your Resend API key (re_...)
 *   RESEND_FROM_EMAIL  — verified sender address, e.g. support@bansaricollection.in
 *
 * SERVER-SIDE ONLY.  Never import into a Client Component.
 *
 * All exported functions:
 *   • never throw — errors are caught and logged as warnings
 *   • return { sent: boolean; error?: string }
 *   • are safe to call without awaiting in non-critical paths
 */
import { REVIEW_REWARD } from "@/lib/review-reward";


const RESEND_API = "https://api.resend.com/emails";

type EmailResult = {
  sent: boolean;
  error?: string;
};

type OrderItem = {
  product_name: string;
  quantity: number;
  unit_price: number;
  line_total: number;
};

export type OrderConfirmationData = {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  items: OrderItem[];
  subtotal: number;
  shippingFee: number;
  discount: number;
  grandTotal: number;
  shippingAddress: {
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    postalCode: string;
  };
};

export type OrderShippedData = {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  trackingNumber?: string;
  trackingUrl?: string;
  estimatedDelivery?: string;
};

/**
 * SEC-02. Every template below builds HTML with template literals, and most of
 * the interpolated values are attacker-supplied: customer name, address lines,
 * product names. Unescaped, someone registering as
 * `<a href="evil.example">Verify your account</a>` gets that markup rendered
 * inside mail sent from our own verified domain — phishing with our SPF/DKIM
 * on it, and the owner notification carries it straight to the shop inbox.
 *
 * Escaping is applied at the BOUNDARY (deepEscape below) rather than at each of
 * the ~26 interpolation sites, so a template added later cannot forget to do
 * it. Applied only to the HTML argument: subjects and the `to:` header are not
 * HTML, and escaping those would corrupt real addresses and show &amp; to
 * customers.
 */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Recursively escapes every string in a payload, preserving shape and types. */
function deepEscape<T>(input: T): T {
  if (typeof input === "string") return escapeHtml(input) as unknown as T;
  if (Array.isArray(input)) return input.map(deepEscape) as unknown as T;
  if (input && typeof input === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
      out[k] = deepEscape(v);
    }
    return out as T;
  }
  return input;
}

function formatRupees(amount: number): string {
  return `\u20b9${amount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function orderConfirmationHtml(data: OrderConfirmationData): string {
  const itemRows = data.items
    .map(
      (item) =>
        `<tr>
          <td style="padding:8px 0;border-bottom:1px solid #f0ece8;">${item.product_name}</td>
          <td style="padding:8px 0;border-bottom:1px solid #f0ece8;text-align:center;">${item.quantity}</td>
          <td style="padding:8px 0;border-bottom:1px solid #f0ece8;text-align:right;">${formatRupees(item.unit_price)}</td>
          <td style="padding:8px 0;border-bottom:1px solid #f0ece8;text-align:right;">${formatRupees(item.line_total)}</td>
        </tr>`
    )
    .join("");

  const address = [
    data.shippingAddress.addressLine1,
    data.shippingAddress.addressLine2,
    data.shippingAddress.city,
    data.shippingAddress.state,
    data.shippingAddress.postalCode,
    "India",
  ]
    .filter(Boolean)
    .join(", ");

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Order Confirmed</title></head>
<body style="margin:0;padding:0;background:#fdfaf7;font-family:'Helvetica Neue',Arial,sans-serif;color:#2d1f1f;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#fdfaf7;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
        <!-- Header -->
        <tr><td style="background:#000000;padding:28px 40px;text-align:center;">
          <img src="https://www.bansaricollection.in/logo-email.png" alt="Bansari Collections" width="150" style="display:block;margin:0 auto;width:150px;height:auto;border:0;" />
          <p style="margin:10px 0 0;font-size:13px;color:#C9A96E;letter-spacing:0.08em;">Your order is confirmed</p>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:40px;">
          <p style="margin:0 0 8px;font-size:18px;font-weight:600;">Hi ${data.customerName},</p>
          <p style="margin:0 0 24px;font-size:15px;color:#6b5b5b;">
            Thank you for your purchase! We\u2019ve received your order and will begin processing it shortly.
          </p>
          <!-- Order number -->
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#fdf6f8;border-radius:8px;margin-bottom:28px;">
            <tr><td style="padding:16px 20px;">
              <p style="margin:0;font-size:13px;color:#8A5A6A;font-weight:600;text-transform:uppercase;letter-spacing:0.6px;">Order Number</p>
              <p style="margin:4px 0 0;font-size:18px;font-weight:700;color:#2d1f1f;">${data.orderNumber}</p>
            </td></tr>
          </table>
          <!-- Items -->
          <p style="margin:0 0 12px;font-size:15px;font-weight:600;">Items Ordered</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
            <thead>
              <tr style="border-bottom:2px solid #f0ece8;">
                <th style="padding:8px 0;text-align:left;font-size:13px;color:#8A5A6A;font-weight:600;">Product</th>
                <th style="padding:8px 0;text-align:center;font-size:13px;color:#8A5A6A;font-weight:600;">Qty</th>
                <th style="padding:8px 0;text-align:right;font-size:13px;color:#8A5A6A;font-weight:600;">Price</th>
                <th style="padding:8px 0;text-align:right;font-size:13px;color:#8A5A6A;font-weight:600;">Total</th>
              </tr>
            </thead>
            <tbody>${itemRows}</tbody>
          </table>
          <!-- Totals -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
            <tr><td style="padding:6px 0;">Subtotal</td><td style="padding:6px 0;text-align:right;">${formatRupees(data.subtotal)}</td></tr>
            ${data.discount > 0 ? `<tr><td style="padding:6px 0;color:#2a7a3b;">Discount</td><td style="padding:6px 0;text-align:right;color:#2a7a3b;">-${formatRupees(data.discount)}</td></tr>` : ""}
            <tr><td style="padding:6px 0;">Shipping</td><td style="padding:6px 0;text-align:right;">${data.shippingFee === 0 ? "FREE" : formatRupees(data.shippingFee)}</td></tr>
            <tr><td style="padding:12px 0 6px;font-size:17px;font-weight:700;border-top:2px solid #f0ece8;">Grand Total</td><td style="padding:12px 0 6px;text-align:right;font-size:17px;font-weight:700;border-top:2px solid #f0ece8;">${formatRupees(data.grandTotal)}</td></tr>
          </table>
          <!-- Shipping address -->
          <p style="margin:0 0 8px;font-size:15px;font-weight:600;">Shipping To</p>
          <p style="margin:0 0 32px;font-size:14px;color:#6b5b5b;line-height:1.6;">${address}</p>
          <p style="margin:0;font-size:14px;color:#6b5b5b;">We\u2019ll send you another email once your order ships. If you have any questions, reply to this email.</p>
        </td></tr>
        <!-- Footer -->
        <tr><td style="background:#fdf6f8;padding:20px 40px;text-align:center;">
          <p style="margin:0;font-size:12px;color:#b09090;">&copy; ${new Date().getFullYear()} Bansari Collections. All rights reserved.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function orderShippedHtml(data: OrderShippedData): string {
  const trackingBlock =
    data.trackingNumber
      ? `<table width="100%" cellpadding="0" cellspacing="0" style="background:#fdf6f8;border-radius:8px;margin-bottom:24px;">
          <tr><td style="padding:16px 20px;">
            <p style="margin:0;font-size:13px;color:#8A5A6A;font-weight:600;text-transform:uppercase;letter-spacing:0.6px;">Tracking Number</p>
            <p style="margin:4px 0 0;font-size:16px;font-weight:700;">
              ${
                data.trackingUrl
                  ? `<a href="${data.trackingUrl}" style="color:#8A5A6A;">${data.trackingNumber}</a>`
                  : data.trackingNumber
              }
            </p>
            ${
              data.estimatedDelivery
                ? `<p style="margin:8px 0 0;font-size:13px;color:#6b5b5b;">Estimated delivery: ${data.estimatedDelivery}</p>`
                : ""
            }
          </td></tr>
        </table>`
      : "";

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Order Shipped</title></head>
<body style="margin:0;padding:0;background:#fdfaf7;font-family:'Helvetica Neue',Arial,sans-serif;color:#2d1f1f;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#fdfaf7;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
        <tr><td style="background:#000000;padding:28px 40px;text-align:center;">
          <img src="https://www.bansaricollection.in/logo-email.png" alt="Bansari Collections" width="150" style="display:block;margin:0 auto;width:150px;height:auto;border:0;" />
          <p style="margin:10px 0 0;font-size:13px;color:#C9A96E;letter-spacing:0.08em;">Your order is on its way!</p>
        </td></tr>
        <tr><td style="padding:40px;">
          <p style="margin:0 0 8px;font-size:18px;font-weight:600;">Hi ${data.customerName},</p>
          <p style="margin:0 0 24px;font-size:15px;color:#6b5b5b;">Great news \u2014 order <strong>${data.orderNumber}</strong> has been shipped and is on its way to you.</p>
          ${trackingBlock}
          <p style="margin:0;font-size:14px;color:#6b5b5b;">Thank you for shopping with us. We hope you love your new pieces!</p>
        </td></tr>
        <tr><td style="background:#fdf6f8;padding:20px 40px;text-align:center;">
          <p style="margin:0;font-size:12px;color:#b09090;">&copy; ${new Date().getFullYear()} Bansari Collections. All rights reserved.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/**
 * Record the outcome of a send in `email_log`.
 *
 * WHY IT EXISTS
 * A paying customer got no confirmation and there was no way to find out what
 * had happened — server logs expire and are not queryable per order. This
 * table answers "did this customer actually receive their receipt".
 *
 * NEVER THROWS, AND IS NEVER AWAITED BY THE CALLER'S RESULT. Logging is
 * strictly observational: a logging outage must not change whether an email is
 * reported as sent, and must certainly not surface as an error on a paid
 * order. Every failure here is swallowed after a console warning — the one
 * place in this file where silence is the correct behaviour, because the thing
 * being silenced is the recorder, not the event.
 */
async function recordEmailAttempt(entry: {
  recipient: string;
  subject: string;
  template?: string | null;
  sent: boolean;
  error?: string | null;
  orderNumber?: string | null;
}): Promise<void> {
  try {
    const { createServiceRoleClient } = await import("@/lib/supabase/service");
    const sb = createServiceRoleClient();
    const { error } = await sb.from("email_log").insert({
      recipient: entry.recipient,
      subject: entry.subject,
      template: entry.template ?? null,
      sent: entry.sent,
      error: entry.error ?? null,
      order_number: entry.orderNumber ?? null,
    });
    if (error) {
      console.warn(`[email.service] email_log insert failed: ${error.message}`);
    }
  } catch (err) {
    console.warn(
      `[email.service] email_log unavailable: ${err instanceof Error ? err.message : "unknown"}`
    );
  }
}

async function sendEmail({
  to,
  subject,
  html,
  template,
  orderNumber,
}: {
  to: string;
  subject: string;
  html: string;
  /** Logical email type, for grouping failures by kind in email_log. */
  template?: string;
  /** Links the log row back to an order where one exists. */
  orderNumber?: string | null;
}): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from =
    process.env.RESEND_FROM_EMAIL ?? "support@bansaricollection.in";

  if (!apiKey) {
    console.warn(
      "[email.service] RESEND_API_KEY is not set — email not sent."
    );
    const message = "RESEND_API_KEY not configured";
    await recordEmailAttempt({ recipient: to, subject, template, sent: false, error: message, orderNumber });
    return { sent: false, error: message };
  }

  try {
    const response = await fetch(RESEND_API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to, subject, html }),
    });

    if (!response.ok) {
      const text = await response.text();
      const message = `Resend API error ${response.status}: ${text}`;
      console.warn(`[email.service] ${message}`);
      await recordEmailAttempt({ recipient: to, subject, template, sent: false, error: message, orderNumber });
      return { sent: false, error: message };
    }

    await recordEmailAttempt({ recipient: to, subject, template, sent: true, orderNumber });
    return { sent: true };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown fetch error";
    console.warn(`[email.service] Failed to send email: ${message}`);
    await recordEmailAttempt({ recipient: to, subject, template, sent: false, error: message, orderNumber });
    return { sent: false, error: message };
  }
}

/**
 * Sends an order confirmation + payment receipt email.
 * Never throws.  Email failure logs a warning only.
 */
export async function sendOrderConfirmationEmail(
  data: OrderConfirmationData
): Promise<EmailResult> {
  return sendEmail({
    to: data.customerEmail,
    subject: `Order Confirmed \u2014 ${data.orderNumber} | Bansari Collections`,
    html: orderConfirmationHtml(deepEscape(data)),
    template: "order_confirmation",
    orderNumber: data.orderNumber,
  });
}

export type OwnerNewOrderData = OrderConfirmationData & {
  customerPhone?: string;
  paymentProvider?: string;
  paymentReference?: string;
};

/**
 * Internal operations alert, not customer-facing \u2014 deliberately plain so the
 * shop owner can read the essentials on a phone without scrolling.
 */
function ownerNewOrderHtml(data: OwnerNewOrderData): string {
  const rows = data.items
    .map(
      (i) =>
        `<tr><td>${i.product_name}</td><td align="center">${i.quantity}</td>` +
        `<td align="right">${formatRupees(Number(i.line_total))}</td></tr>`
    )
    .join("");

  const addr = data.shippingAddress;
  const line2 = addr.addressLine2 ? `${addr.addressLine2}<br />` : "";

  return `<!doctype html><html><body style="font-family:Arial,Helvetica,sans-serif;color:#1a0f16">
<h2 style="margin:0 0 4px">New order ${data.orderNumber}</h2>
<p style="margin:0 0 16px;font-size:20px"><strong>${formatRupees(data.grandTotal)}</strong></p>
<table cellpadding="6" style="border-collapse:collapse;width:100%;max-width:520px">
<tr><th align="left">Item</th><th align="center">Qty</th><th align="right">Total</th></tr>
${rows}
</table>
<p style="margin:16px 0 4px"><strong>Customer</strong><br />
${data.customerName}<br />${data.customerEmail}${data.customerPhone ? `<br />${data.customerPhone}` : ""}</p>
<p style="margin:16px 0 4px"><strong>Ship to</strong><br />
${addr.addressLine1}<br />${line2}${addr.city}, ${addr.state} ${addr.postalCode}</p>
<p style="margin:16px 0 0;font-size:13px;color:#6b5560">
Payment: ${data.paymentProvider ?? "\u2014"}${data.paymentReference ? ` \u00b7 ref ${data.paymentReference}` : ""}<br />
Subtotal ${formatRupees(data.subtotal)} \u00b7 Shipping ${formatRupees(data.shippingFee)} \u00b7 Discount ${formatRupees(data.discount)}
</p>
</body></html>`;
}

/**
 * Notifies the shop owner that an order was placed and paid.
 *
 * Recipient resolution: ORDER_NOTIFICATION_EMAIL, else the configured sender,
 * else the support address \u2014 so this works with no new configuration, and can
 * be pointed elsewhere by setting one variable.
 *
 * Never throws: a failed notification must never affect an order that has
 * already been paid for and persisted.
 */
export async function sendOwnerNewOrderEmail(
  data: OwnerNewOrderData
): Promise<EmailResult> {
  const to =
    process.env.ORDER_NOTIFICATION_EMAIL ??
    process.env.RESEND_FROM_EMAIL ??
    "support@bansaricollection.in";

  return sendEmail({
    to,
    subject: `New order ${data.orderNumber} \u2014 ${formatRupees(data.grandTotal)}`,
    html: ownerNewOrderHtml(deepEscape(data)),
    template: "owner_new_order",
    orderNumber: data.orderNumber,
  });
}

/**
 * Sends a shipping notification email.
 * Never throws.  Email failure logs a warning only.
 * Called from the admin order-status update route when status → "shipped".
 */
export async function sendOrderShippedEmail(
  data: OrderShippedData
): Promise<EmailResult> {
  return sendEmail({
    to: data.customerEmail,
    subject: `Your Order Has Shipped \u2014 ${data.orderNumber} | Bansari Collections`,
    html: orderShippedHtml(deepEscape(data)),
    template: "order_shipped",
    orderNumber: data.orderNumber,
  });
}

export type WelcomeEmailData = {
  customerName: string;
  customerEmail: string;
};

export async function sendWelcomeEmail(
  data: WelcomeEmailData
): Promise<EmailResult> {
  const d = deepEscape(data);
  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Welcome</title></head>
<body style="margin:0;padding:0;background:#fdfaf7;font-family:'Helvetica Neue',Arial,sans-serif;color:#2d1f1f;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#fdfaf7;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
        <tr><td style="background:#000000;padding:28px 40px;text-align:center;">
          <img src="https://www.bansaricollection.in/logo-email.png" alt="Bansari Collections" width="150" style="display:block;margin:0 auto;width:150px;height:auto;border:0;" />
          <p style="margin:10px 0 0;font-size:13px;color:#C9A96E;letter-spacing:0.08em;">Welcome to the family</p>
        </td></tr>
        <tr><td style="padding:40px;">
          <p style="margin:0 0 8px;font-size:18px;font-weight:600;">Hi ${d.customerName},</p>
          <p style="margin:0 0 20px;font-size:15px;color:#6b5b5b;">
            Thank you for creating an account with us. Your account is ready, and your order history and
            addresses will now be saved for a faster checkout next time.
          </p>
          <p style="margin:0 0 28px;font-size:15px;color:#6b5b5b;">
            Every piece we make is chosen with care — handcrafted fabrics, considered detail, and quality
            we stand behind.
          </p>
          <table cellpadding="0" cellspacing="0"><tr><td style="background:#8A5A6A;border-radius:999px;">
            <a href="https://www.bansaricollection.in/shop" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">Start Shopping</a>
          </td></tr></table>
        </td></tr>
        <tr><td style="background:#fdf6f8;padding:20px 40px;text-align:center;">
          <p style="margin:0;font-size:12px;color:#b09090;">&copy; ${new Date().getFullYear()} Bansari Collections. All rights reserved.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return sendEmail({
    to: data.customerEmail,
    subject: "Welcome to Bansari Collections",
    html,
    template: "welcome",
  });
}

export type OrderStageData = {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  trackingNumber?: string;
  trackingUrl?: string;
};

/**
 * Shared shell for the later lifecycle stages, matching orderShippedHtml so the
 * whole sequence reads as one voice.
 */
function orderStageHtml(
  /*
   * `extra` is optional pre-built HTML dropped in above the closing line — used
   * by the review invitation for its per-item links. Callers are responsible
   * for escaping anything they interpolate into it; every current caller
   * builds it from deepEscape()d values.
   */
  stage: { banner: string; lead: string; closing: string; extra?: string },
  data: OrderStageData
): string {
  const tracking = data.trackingNumber
    ? `<table width="100%" cellpadding="0" cellspacing="0" style="background:#fdf6f8;border-radius:8px;margin-bottom:24px;">
        <tr><td style="padding:16px 20px;">
          <p style="margin:0;font-size:13px;color:#8A5A6A;font-weight:600;text-transform:uppercase;letter-spacing:0.6px;">Tracking Number</p>
          <p style="margin:4px 0 0;font-size:16px;font-weight:700;">${
            data.trackingUrl
              ? `<a href="${data.trackingUrl}" style="color:#8A5A6A;">${data.trackingNumber}</a>`
              : data.trackingNumber
          }</p>
        </td></tr>
      </table>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${stage.banner}</title></head>
<body style="margin:0;padding:0;background:#fdfaf7;font-family:'Helvetica Neue',Arial,sans-serif;color:#2d1f1f;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#fdfaf7;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
        <tr><td style="background:#000000;padding:28px 40px;text-align:center;">
          <img src="https://www.bansaricollection.in/logo-email.png" alt="Bansari Collections" width="150" style="display:block;margin:0 auto;width:150px;height:auto;border:0;" />
          <p style="margin:10px 0 0;font-size:13px;color:#C9A96E;letter-spacing:0.08em;">${stage.banner}</p>
        </td></tr>
        <tr><td style="padding:40px;">
          <p style="margin:0 0 8px;font-size:18px;font-weight:600;">Hi ${data.customerName},</p>
          <p style="margin:0 0 24px;font-size:15px;color:#6b5b5b;">${stage.lead.replace("{order}", `<strong>${data.orderNumber}</strong>`)}</p>
          ${tracking}
          ${stage.extra ?? ""}
          <p style="margin:0;font-size:14px;color:#6b5b5b;">${stage.closing}</p>
        </td></tr>
        <tr><td style="background:#fdf6f8;padding:20px 40px;text-align:center;">
          <p style="margin:0;font-size:12px;color:#b09090;">&copy; ${new Date().getFullYear()} Bansari Collections. All rights reserved.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function sendOutForDeliveryEmail(
  data: OrderStageData
): Promise<EmailResult> {
  return sendEmail({
    to: data.customerEmail,
    subject: `Out for Delivery \u2014 ${data.orderNumber} | Bansari Collections`,
    template: "out_for_delivery",
    orderNumber: data.orderNumber,
    html: orderStageHtml(
      {
        banner: "Arriving today",
        lead: "Your order {order} is out for delivery and should reach you today.",
        closing: "Please keep your phone reachable so our courier partner can find you.",
      },
      deepEscape(data)
    ),
  });
}

/**
 * The review invitation, sent after delivery.
 *
 * Separate from the delivered email on purpose: that one arrives the moment
 * the courier marks it delivered, when the customer has not yet opened the
 * parcel. Asking "how was it?" in the same breath as "it has arrived" gets a
 * rating of the delivery, not the garment.
 *
 * Each link carries its own signed token for one order line, so a customer who
 * bought three pieces can review each separately, and each link proves that
 * specific purchase without needing an account.
 */
export async function sendReviewInvitationEmail(data: {
  customerName: string;
  customerEmail: string;
  orderNumber: string;
  items: { productName: string; reviewUrl: string }[];
}): Promise<EmailResult> {
  if (data.items.length === 0) {
    return { sent: false, error: "No reviewable items on this order." };
  }

  const safe = deepEscape(data);
  const lines = safe.items
    .map(
      (i) =>
        `<tr><td style="padding:10px 0;border-bottom:1px solid #F4EDE3;">
           <span style="font-size:15px;color:#1A0F16;">${i.productName}</span><br/>
           <a href="${i.reviewUrl}" style="font-size:13px;color:#9E7B47;text-decoration:underline;">Write a review</a>
         </td></tr>`
    )
    .join("");

  return sendEmail({
    to: data.customerEmail,
    subject: `How was your order? — ${data.orderNumber} | Bansari Collections`,
    template: "review_invitation",
    orderNumber: data.orderNumber,
    html: orderStageHtml(
      {
        banner: "How was it?",
        lead:
          "We hope your order {order} arrived safely and that you have had a chance to wear it. If you can spare two minutes, we would be very grateful for your honest thoughts — the fit, the fabric, the colour in daylight.",
        closing:
          "Only customers who have actually received a piece can review it here, so your words carry real weight with the next person deciding. We publish every honest review, including the critical ones — that is the only way this is worth anything. Thank you for choosing a small boutique. It genuinely matters to us.",
        extra:
          `<table role="presentation" width="100%" style="margin-top:8px;margin-bottom:8px;">${lines}</table>` +
          `<table width="100%" cellpadding="0" cellspacing="0" style="background:#F9F3E8;border:1px solid #E2C98E;margin:8px 0 24px;">
             <tr><td style="padding:18px 20px;">
               <p style="margin:0 0 6px;font-size:12px;font-weight:600;letter-spacing:0.8px;text-transform:uppercase;color:#9E7B47;">A small thank-you</p>
               <p style="margin:0;font-size:14px;line-height:1.6;color:#2d1f1f;">
                 If you add a photo of the piece with your review, we will send you a
                 <strong>${REVIEW_REWARD.percentOff}% discount code for your next order</strong> as our way of saying thank you.
                 A real photo helps the next customer far more than anything we could write ourselves.
               </p>
               <p style="margin:10px 0 0;font-size:12px;line-height:1.6;color:#6b5b5b;">
                 The code is yours whatever you write — we ask for your honest opinion, not a kind one.
                 Valid for ${REVIEW_REWARD.validDays} days on any order, no minimum.
               </p>
             </td></tr>
           </table>`,
      },
      {
        orderNumber: safe.orderNumber,
        customerName: safe.customerName,
        customerEmail: safe.customerEmail,
      } as OrderStageData
    ),
  });
}

/**
 * The thank-you: sent when a photo review is approved, carrying the coupon.
 *
 * Sent on APPROVAL rather than on submission, so it is never a promise made
 * before the review has been read. The wording deliberately repeats that the
 * code was not conditional on the review being kind — a customer who left
 * three stars should not wonder whether the discount is a bribe.
 */
export async function sendReviewRewardEmail(data: {
  customerName: string;
  customerEmail: string;
  productName: string;
  couponCode: string;
  percentOff: number;
  validDays: number;
}): Promise<EmailResult> {
  const safe = deepEscape(data);

  return sendEmail({
    to: data.customerEmail,
    subject: `Thank you — here is ${safe.percentOff}% off your next order | Bansari Collections`,
    template: "review_reward",
    html: orderStageHtml(
      {
        banner: "Thank you",
        lead:
          `Your review of the ${safe.productName} is now live on our website, photo and all. Thank you for taking the trouble — a real photo of a real person wearing the piece tells the next customer more than anything we could write ourselves.`,
        closing:
          "If there is ever anything we can put right, simply reply to this email. A small boutique lives or dies by what its customers say, and we would rather hear it from you first.",
        extra:
          `<table width="100%" cellpadding="0" cellspacing="0" style="background:#F9F3E8;border:1px solid #E2C98E;margin:8px 0 24px;">
             <tr><td style="padding:22px 20px;text-align:center;">
               <p style="margin:0 0 8px;font-size:12px;font-weight:600;letter-spacing:0.8px;text-transform:uppercase;color:#9E7B47;">With our compliments</p>
               <p style="margin:0 0 4px;font-size:15px;color:#2d1f1f;">${safe.percentOff}% off your next order</p>
               <p style="margin:12px 0 0;font-size:22px;font-weight:700;letter-spacing:2px;color:#1A0F16;">${safe.couponCode}</p>
               <p style="margin:12px 0 0;font-size:12px;color:#6b5b5b;">
                 Enter it at checkout. Valid for ${safe.validDays} days, on any order, with no minimum spend.
               </p>
             </td></tr>
           </table>`,
      },
      {
        orderNumber: "",
        customerName: safe.customerName,
        customerEmail: safe.customerEmail,
      } as OrderStageData
    ),
  });
}

export async function sendOrderDeliveredEmail(
  data: OrderStageData
): Promise<EmailResult> {
  return sendEmail({
    to: data.customerEmail,
    subject: `Delivered \u2014 ${data.orderNumber} | Bansari Collections`,
    template: "order_delivered",
    orderNumber: data.orderNumber,
    html: orderStageHtml(
      {
        banner: "Your order has arrived",
        lead: "Order {order} has been delivered. We hope you love it.",
        closing:
          "If anything is not right, reply to this email within 7 days and we will make it good \u2014 see our Return &amp; Refund Policy.",
      },
      deepEscape(data)
    ),
  });
}
