import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";

/**
 * Categories are stored as a plain `category` text column on `products`.
 * No separate `categories` table exists yet. This service derives the
 * category list from distinct values in the products table.
 *
 * When a dedicated `categories` table is introduced, replace the
 * implementation below without changing the exported function signatures.
 */
export type CategorySummary = {
  name: string;
  product_count: number;
  active_count: number;
};

export async function getCategories(): Promise<CategorySummary[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("products")
    .select("category, active");

  if (error) throw new Error(error.message);

  const map = new Map<string, CategorySummary>();
  for (const row of data ?? []) {
    const name = row.category?.trim() || "Uncategorised";
    const existing = map.get(name);
    if (existing) {
      existing.product_count += 1;
      if (row.active) existing.active_count += 1;
    } else {
      map.set(name, {
        name,
        product_count: 1,
        active_count: row.active ? 1 : 0,
      });
    }
  }

  return Array.from(map.values()).sort((a, b) =>
    a.name.localeCompare(b.name)
  );
}

// Rename a category across all products that carry it
export async function renameCategory(
  oldName: string,
  newName: string
): Promise<void> {
  const supabase = createServiceRoleClient();

  const { error } = await supabase
    .from("products")
    .update({ category: newName })
    .eq("category", oldName);

  if (error) throw new Error(error.message);
}
