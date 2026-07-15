import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";

export type InventoryRow = {
  id: number;
  name: string;
  sku: string;
  category: string;
  stock: number;
  price: number;
  active: boolean;
  updated_at: string;
};

export type StockUpdatePayload = {
  id: number;
  stock: number;
};

const LOW_STOCK_THRESHOLD = 10;

export async function getInventory(): Promise<InventoryRow[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("products")
    .select("id, name, sku, category, stock, price, active, updated_at")
    .order("stock", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as InventoryRow[];
}

export async function getLowStockItems(
  threshold = LOW_STOCK_THRESHOLD
): Promise<InventoryRow[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("products")
    .select("id, name, sku, category, stock, price, active, updated_at")
    .lte("stock", threshold)
    .eq("active", true)
    .order("stock", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as InventoryRow[];
}

export async function updateStock(
  payload: StockUpdatePayload
): Promise<void> {
  const supabase = createServiceRoleClient();

  const { error } = await supabase
    .from("products")
    .update({ stock: payload.stock, updated_at: new Date().toISOString() })
    .eq("id", payload.id);

  if (error) throw new Error(error.message);
}

export const INVENTORY_LOW_THRESHOLD = LOW_STOCK_THRESHOLD;
