import { NextRequest, NextResponse } from "next/server";
import { getRazorpay } from "@/lib/razorpay";
import { getProductById } from "@/services/product.service";

const FREE_SHIPPING_THRESHOLD = 2999;
const STANDARD_SHIPPING_FEE = 99;

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

type RequestedItem = {
  productId: number;
  quantity: number;
};

function isPositiveInteger(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value > 0
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate items array — client MUST send product IDs + quantities.
    // Amount is never accepted from the client.
    if (!Array.isArray(body?.items) || body.items.length === 0) {
      return NextResponse.json(
        { success: false, message: "items array is required." },
        { status: 400 }
      );
    }

    const rawItems = body.items as unknown[];

    for (const [index, item] of rawItems.entries()) {
      if (!item || typeof item !== "object") {
        return NextResponse.json(
          { success: false, message: `Item at index ${index} is invalid.` },
          { status: 400 }
        );
      }

      const i = item as Record<string, unknown>;

      if (!isPositiveInteger(i.productId)) {
        return NextResponse.json(
          { success: false, message: `Item at index ${index} is missing a valid productId.` },
          { status: 400 }
        );
      }

      if (!isPositiveInteger(i.quantity)) {
        return NextResponse.json(
          { success: false, message: `Item at index ${index} is missing a valid quantity.` },
          { status: 400 }
        );
      }
    }

    const items = rawItems as RequestedItem[];

    // Fetch every product from the database — price is authoritative here.
    const productLookups = await Promise.all(
      items.map((item) => getProductById(item.productId))
    );

    const invalidProductIds: number[] = [];

    items.forEach((item, index) => {
      if (!productLookups[index]) {
        invalidProductIds.push(item.productId);
      }
    });

    if (invalidProductIds.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message: "One or more products are unavailable.",
          invalidProductIds,
        },
        { status: 400 }
      );
    }

    // Server-side pricing — same constants as /api/orders/create.
    const lineItems = items.map((item, index) => {
      const product = productLookups[index]!;
      return {
        productId: product.id,
        productName: product.name,
        unitPrice: product.price,
        quantity: item.quantity,
        lineTotal: round2(product.price * item.quantity),
      };
    });

    const subtotal = round2(
      lineItems.reduce((sum, row) => sum + row.lineTotal, 0)
    );
    const shippingFee =
      subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : STANDARD_SHIPPING_FEE;
    const grandTotal = round2(subtotal + shippingFee);

    // Amount in paise (Razorpay requires smallest currency unit).
    const amountPaise = Math.round(grandTotal * 100);

    const currency = (typeof body.currency === "string" && body.currency.length > 0)
      ? body.currency
      : "INR";

    const razorpay = getRazorpay();

    const order = await razorpay.orders.create({
      amount: amountPaise,
      currency,
      receipt: `BC-${Date.now()}`,
      // Store pricing in notes so the webhook recovery path can reconstruct
      // the order without a browser round-trip (Phase 4).
      notes: {
        subtotal: String(subtotal),
        shipping_fee: String(shippingFee),
        grand_total: String(grandTotal),
        item_count: String(items.length),
      },
    });

    return NextResponse.json({
      success: true,
      order,
      // Return server-computed pricing so the client UI can display
      // accurate totals without any client-side calculation.
      pricing: {
        subtotal,
        shippingFee,
        grandTotal,
      },
    });
  } catch (error) {
    console.error("Razorpay Order Error:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Unable to create payment order.",
      },
      { status: 500 }
    );
  }
}
