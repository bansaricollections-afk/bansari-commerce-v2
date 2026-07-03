import { createClient } from "@/lib/supabase/client";

export interface CreateOrderInput {
  customerId: string;
  orderNumber: string;
  subtotal: number;
  shipping: number;
  tax: number;
  discount: number;
  total: number;
  paymentStatus: "Pending" | "Paid" | "Failed";
  orderStatus:
    | "Placed"
    | "Processing"
    | "Packed"
    | "Shipped"
    | "Delivered"
    | "Cancelled";
}

export async function createOrder(data: CreateOrderInput) {
  const supabase = createClient();

  const { data: order, error } = await supabase
    .from("orders")
    .insert(data)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return order;
}

export async function getOrders() {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    throw error;
  }

  return data;
}

export async function getOrderById(id: number) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    throw error;
  }

  return data;
}
