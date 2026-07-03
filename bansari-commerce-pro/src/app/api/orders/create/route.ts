import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const body = await request.json();

    const {
      customerId,
      orderNumber,
      items,
      subtotal,
      shipping,
      tax,
      discount,
      total,
      paymentStatus,
      orderStatus,
    } = body;

    const { data, error } = await supabase
      .from("orders")
      .insert({
        customer_id: customerId,
        order_number: orderNumber,
        items,
        subtotal,
        shipping,
        tax,
        discount,
        total,
        payment_status: paymentStatus,
        order_status: orderStatus,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json({
      success: true,
      order: data,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown error",
      },
      {
        status: 500,
      }
    );
  }
}