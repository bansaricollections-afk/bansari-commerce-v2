/**
 * email.service.ts
 *
 * Transactional email via the Resend REST API.
 * Uses native fetch — no additional npm dependency required.
 *
 * Required environment variables:
 *   RESEND_API_KEY     — your Resend API key (re_...)
 *   RESEND_FROM_EMAIL  — verified sender address, e.g. orders@bansaricollections.com
 *
 * SERVER-SIDE ONLY.  Never import into a Client Component.
 *
 * All exported functions:
 *   • never throw — errors are caught and logged as warnings
 *   • return { sent: boolean; error?: string }
 *   • are safe to call without awaiting in non-critical paths
 */

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
        <tr><td style="background:#8A5A6A;padding:32px 40px;text-align:center;">
          <p style="margin:0;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:0.5px;">Bansari Collections</p>
          <p style="margin:8px 0 0;font-size:14px;color:#f0d8df;">Your order is confirmed</p>
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
        <tr><td style="background:#8A5A6A;padding:32px 40px;text-align:center;">
          <p style="margin:0;font-size:22px;font-weight:700;color:#ffffff;">Bansari Collections</p>
          <p style="margin:8px 0 0;font-size:14px;color:#f0d8df;">Your order is on its way!</p>
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

async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from =
    process.env.RESEND_FROM_EMAIL ?? "orders@bansaricollections.com";

  if (!apiKey) {
    console.warn(
      "[email.service] RESEND_API_KEY is not set — email not sent."
    );
    return { sent: false, error: "RESEND_API_KEY not configured" };
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
      return { sent: false, error: message };
    }

    return { sent: true };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown fetch error";
    console.warn(`[email.service] Failed to send email: ${message}`);
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
    html: orderConfirmationHtml(data),
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
    html: orderShippedHtml(data),
  });
}
