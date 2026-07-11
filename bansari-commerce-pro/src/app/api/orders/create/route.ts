import crypto from "crypto";

import { NextRequest, NextResponse } from "next/server";

import { getProductById } from "@/services/product.service";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";

const FREE_SHIPPING_THRESHOLD = 2999;
const STANDARD_SHIPPING_FEE = 99;

type RequestedItem = {
  productId: number;
  quantity: number;
  variantColor?: string;
  variantSize?: string;
};

type OrderCreateBody = {
  items: RequestedItem[];
  customer: {
    name: string;
    email: string;
    phone: string;
  };
  shipping: {
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    postalCode: string;
  };
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isPositiveInteger(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value > 0
  );
}

function validateBody(body: unknown): {
  valid: true;
  data: OrderCreateBody;
} | {
  valid: false;
  error: string;
} {
  if (!body || typeof body !== "object") {
    return { valid: false, error: "Request body must be an object." };
  }

  const b = body as Record<string, unknown>;

  if (!Array.isArray(b.items) || b.items.length === 0) {
    return { valid: false, error: "At least one item is required." };
  }

  for (const [index, item] of b.items.entries()) {
    if (!item || typeof item !== "object") {
      return {
        valid: false,
        error: `Item at index ${index} is invalid.`,
      };
    }

    const i = item as Record<string, unknown>;

    if (!isPositiveInteger(i.productId)) {
      return {
        valid: false,
        error: `Item at index ${index} is missing a valid productId.`,
      };
    }

    if (!isPositiveInteger(i.quantity)) {
      return {
        valid: false,
        error: `Item at index ${index} is missing a valid quantity.`,
      };
    }
  }

  const customer = b.customer as Record<string, unknown> | undefined;

  if (
    !customer ||
    !isNonEmptyString(customer.name) ||
    !isNonEmptyString(customer.email) ||
    !isNonEmptyString(customer.phone)
  ) {
    return {
      valid: false,
      error: "customer.name, customer.email and customer.phone are required.",
    };
  }

  const shipping = b.shipping as Record<string, unknown> | undefined;

  if (
    !shipping ||
    !isNonEmptyString(shipping.addressLine1) ||
    !isNonEmptyString(shipping.city) ||
    !isNonEmptyString(shipping.state) ||
    !isNonEmptyString(shipping.postalCode)
  ) {
    return {
      valid: false,
      error:
        "shipping.addressLine1, shipping.city, shipping.state and shipping.postalCode are required.",
    };
  }

  if (
    !isNonEmptyString(b.razorpay_order_id) ||
    !isNonEmptyString(b.razorpay_payment_id) ||
    !isNonEmptyString(b.razorpay_signature)
  ) {
    return {
      valid: false,
      error:
        "razorpay_order_id, razorpay_payment_id and razorpay_signature are required.",
    };
  }

  return {
    valid: true,
    data: {
      items: b.items as RequestedItem[],
      customer: {
        name: (customer.name as string).trim(),
        email: (customer.email as string).trim(),
        phone: (customer.phone as string).trim(),
      },
      shipping: {
        addressLine1: (shipping.addressLine1 as string).trim(),
        addressLine2:
          typeof shipping.addressLine2 === "string"
            ? shipping.addressLine2.trim()
            : undefined,
        city: (shipping.city as string).trim(),
        state: (shipping.state as string).trim(),
        postalCode: (shipping.postalCode as string).trim(),
      },
      razorpay_order_id: b.razorpay_order_id as string,
      razorpay_payment_id: b.razorpay_payment_id as string,
      razorpay_signature: b.razorpay_signature as string,
    },
  };
}

/**
 * Re-verifies the Razorpay signature independently of `/api/payment/verify-payment`.
 * That route and this one are two separate, uncoordinated requests — nothing
 * stops a client from calling this route directly with fabricated Razorpay
 * IDs unless this route checks the signature itself.
 */
function verifyRazorpaySignature(
  orderId: string,
  paymentId: string,
  signature: string
): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET;

  if (!secret) {
    return false;
  }

  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  return expected === signature;
}

function generateOrderNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `BC-${timestamp}-${random}`;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

type OrderRow = {
  id: string;
  order_number: string;
  subtotal: number;
  shipping_fee: number;
  tax: number;
  discount: number;
  grand_total: number;
  payment_status: string;
  order_status: string;
};

function formatOrderResponse(order: OrderRow) {
  return {
    id: order.id,
    orderNumber: order.order_number,
    subtotal: order.subtotal,
    shippingFee: order.shipping_fee,
    tax: order.tax,
    discount: order.discount,
    grandTotal: order.grand_total,
    paymentStatus: order.payment_status,
    orderStatus: order.order_status,
  };
}

export async function POST(request: NextRequest) {
  // Resolve the authenticated session server-side. The JWT is read from the
  // HTTP-only cookie set by Supabase SSR — the client cannot supply or
  // forge a different user_id. Guests produce user === null, which is
  // intentional: guest checkout must continue to work unchanged.
  const serverClient = await createClient();
  const {
    data: { user },
  } = await serverClient.auth.getUser();
  const userId = user?.id ?? null;

  let rawBody: unknown;

  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body." },
      { status: 400 }
    );
  }

  const validated = validateBody(rawBody);

  if (!validated.valid) {
    return NextResponse.json(
      { success: false, error: validated.error },
      { status: 400 }
    );
  }

  const { items, customer, shipping, razorpay_order_id, razorpay_payment_id, razorpay_signature } =
    validated.data;

  // Idempotency fast path: an obvious retry (same payment id) skips the
  // remaining work entirely. This alone is still check-then-act and has a
  // race window — actual correctness comes from the unique index on
  // razorpay_payment_id and the insert-error handling further down, which
  // is race-safe regardless of timing.
  const supabase = createServiceRoleClient();

  const { data: existingOrder } = await supabase
    .from("orders")
    .select()
    .eq("razorpay_payment_id", razorpay_payment_id)
    .maybeSingle();

  if (existingOrder) {
    return NextResponse.json(
      {
        success: true,
        order: formatOrderResponse(existingOrder),
      },
      { status: 200 }
    );
  }

  const signatureValid = verifyRazorpaySignature(
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature
  );

  if (!signatureValid) {
    return NextResponse.json(
      { success: false, error: "Payment verification failed." },
      { status: 400 }
    );
  }

  // Server-side product validation — never trust client-supplied names,
  // prices, or images. getProductById() already filters active = true,
  // so a missing result covers both "doesn't exist" and "inactive".
  const productLookups = await Promise.all(
    items.map((item) => getProductById(item.productId))
  );

  const invalidProductIds: number[] = [];
  const insufficientStock: { productId: number; available: number; requested: number }[] = [];

  items.forEach((item, index) => {
    const product = productLookups[index];

    if (!product) {
      invalidProductIds.push(item.productId);
      return;
    }

    if (item.quantity > product.stock) {
      insufficientStock.push({
        productId: item.productId,
        available: product.stock,
        requested: item.quantity,
      });
    }
  });

  if (invalidProductIds.length > 0) {
    return NextResponse.json(
      {
        success: false,
        error: "One or more products are unavailable.",
        invalidProductIds,
      },
      { status: 400 }
    );
  }

  if (insufficientStock.length > 0) {
    return NextResponse.json(
      {
        success: false,
        error: "One or more products do not have enough stock.",
        insufficientStock,
      },
      { status: 400 }
    );
  }

  // Authoritative pricing — computed entirely from database values.
  const orderItemRows = items.map((item, index) => {
    const product = productLookups[index]!;
    const unitPrice = product.price;
    const lineTotal = round2(unitPrice * item.quantity);

    return {
      product_id: product.id,
      product_name: product.name,
      product_slug: product.slug,
      product_sku: product.sku,
      product_image: product.images[0]?.url ?? null,
      variant_color: item.variantColor ?? null,
      variant_size: item.variantSize ?? null,
      unit_price: unitPrice,
      quantity: item.quantity,
      line_total: lineTotal,
    };
  });

  const subtotal = round2(
    orderItemRows.reduce((sum, row) => sum + row.line_total, 0)
  );
  const discount = 0;
  const shippingFee = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : STANDARD_SHIPPING_FEE;
  const tax = 0;
  const grandTotal = round2(subtotal - discount + shippingFee + tax);

  const now = new Date().toISOString();

  // Order + order_items are created atomically in a single Postgres
  // transaction via this RPC — see the migration for why that's safer than
  // the previous two-call-plus-compensating-delete approach, and why
  // inventory decrement is deliberately NOT part of this same transaction.
  const { data: order, error: orderError } = (await supabase
    .rpc("create_order_with_items", {
      p_order: {
        order_number: generateOrderNumber(),
        user_id: userId,

        customer_name: customer.name,
        customer_email: customer.email,
        customer_phone: customer.phone,

        shipping_name: customer.name,
        shipping_phone: customer.phone,
        shipping_email: customer.email,
        shipping_address_line1: shipping.addressLine1,
        shipping_address_line2: shipping.addressLine2 ?? null,
        shipping_city: shipping.city,
        shipping_state: shipping.state,
        shipping_postal_code: shipping.postalCode,

        billing_same_as_shipping: true,

        currency: "INR",
        subtotal,
        discount,
        shipping_fee: shippingFee,
        tax,
        grand_total: grandTotal,

        payment_provider: "razorpay",
        payment_method: "razorpay",
        payment_reference: razorpay_payment_id,
        razorpay_order_id,
        razorpay_payment_id,
        payment_status: "paid",

        order_status: "placed",

        payment_verified_at: now,
        paid_at: now,
      },
      p_items: orderItemRows,
    })
    .single()) as { data: OrderRow | null; error: { code?: string; message: string } | null };

  if (orderError) {
    if (orderError.code === "23505") {
      // A concurrent request for the same payment id won the race and
      // inserted first — this is the actual idempotency guarantee, not the
      // fast-path SELECT above. Fetch and return that row instead of
      // failing a request that represents a real, already-paid payment.
      const { data: winningOrder } = await supabase
        .from("orders")
        .select()
        .eq("razorpay_payment_id", razorpay_payment_id)
        .maybeSingle();

      if (winningOrder) {
        return NextResponse.json(
          {
            success: true,
            order: formatOrderResponse(winningOrder),
          },
          { status: 200 }
        );
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: orderError.message,
      },
      { status: 500 }
    );
  }

  if (!order) {
    return NextResponse.json(
      {
        success: false,
        error: "Unable to create order.",
      },
      { status: 500 }
    );
  }

  // Inventory decrement — deliberately a separate step, after the order
  // transaction above has already committed. See the migration and the
  // comment at the top of this route for why: payment was captured by
  // Razorpay before this request ever reached this route, so a stock
  // shortfall discovered here must not undo a paid, confirmed order.
  // decrement_product_stock() is itself a single atomic SQL UPDATE, so this
  // step is race-safe against concurrent orders for the same product even
  // though it isn't part of the order's own transaction.
  for (const row of orderItemRows) {
    const { data: decremented, error: stockError } = await supabase.rpc(
      "decrement_product_stock",
      {
        p_product_id: row.product_id,
        p_quantity: row.quantity,
      }
    );

    if (stockError || !decremented || decremented.length === 0) {
      console.error(
        `Inventory decrement did not apply for product ${row.product_id} on order ${order.id} — stock may need manual review.`,
        stockError?.message
      );
    }
  }

  return NextResponse.json(
    {
      success: true,
      order: formatOrderResponse(order),
    },
    { status: 201 }
  );
}
