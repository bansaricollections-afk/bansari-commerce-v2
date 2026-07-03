import { NextRequest, NextResponse } from "next/server";

import { razorpay } from "@/lib/razorpay";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      amount,
      currency = "INR",
      receipt,
    } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid amount.",
        },
        {
          status: 400,
        }
      );
    }

    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100), // Convert ₹ to paise
      currency,
      receipt:
        receipt ??
        `BC-${Date.now()}`,
    });

    return NextResponse.json({
      success: true,
      order,
    });
  } catch (error) {
    console.error("Razorpay Order Error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to create payment order.",
      },
      {
        status: 500,
      }
    );
  }
}