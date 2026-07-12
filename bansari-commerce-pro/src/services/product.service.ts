import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import type {
  Product,
  ProductImage,
  ProductVariant,
} from "@/types";

/**
 * Shape of a row in the live `public.products` Supabase table.
 * NOTE: this is deliberately narrower than the `Product` type the UI
 * expects (no rating/review_count/badge/specifications columns exist
 * in the current schema). `mapDbProductToProduct` below fills the gap
 * with safe defaults so no component has to change.
 */
type DbProduct = {
  id: number;
  name: string;
  sku: string;
  slug: string;
  category: string;
  collection: string;
  brand: string;
  fabric: string;
  color: string;
  sizes: string[];
  price: number;
  compare_price: number | null;
  stock: number;
  description: string;
  seo_title: string;
  seo_description: string;
  featured: boolean;
  new_arrival: boolean;
  best_seller: boolean;
  active: boolean;
  images: unknown;
  created_at: string;
  updated_at: string;
};

const URL_KEYS = ["url", "src", "image_url", "path", "href"] as const;

function extractUrl(item: unknown): string | null {
  if (typeof item === "string" && item.trim().length > 0) {
    return item.trim();
  }

  if (item && typeof item === "object") {
    const obj = item as Record<string, unknown>;

    for (const key of URL_KEYS) {
      const value = obj[key];
      if (typeof value === "string" && value.trim().length > 0) {
        return value.trim();
      }
    }
  }

  return null;
}

/**
 * Normalizes the `images` jsonb column into the one contract every consumer
 * can rely on: an array of objects each guaranteed to have `url: string`.
 *
 * The DB has been observed/could plausibly store this column as:
 *  - an array of objects: [{ url, alt, type, id }]
 *  - an array of plain strings: ["/products/p1.png", ...]
 *  - objects keyed differently: [{ src }], [{ image_url }], [{ path }]
 *  - a single object or string instead of an array
 *  - a JSON-encoded string (if the column round-trips as text)
 *  - null / undefined / malformed entries mixed in
 *
 * Whatever comes in, every returned entry always has a valid, non-empty
 * `url`. Entries with no resolvable url are dropped rather than passed
 * through as broken image tags. `id`/`alt`/`type` are still populated
 * (derived, with fallbacks) purely so existing UI components that read
 * those fields keep working unmodified — the guaranteed contract is `url`.
 */
function normalizeImages(raw: unknown, productName: string): ProductImage[] {
  let value = raw;

  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      // Not JSON — treat the whole string as a single image URL.
      value = [value];
    }
  }

  const list = Array.isArray(value) ? value : value ? [value] : [];

  return list
    .map((item, index) => {
      const url = extractUrl(item);
      if (!url) return null;

      const obj =
        item && typeof item === "object"
          ? (item as Record<string, unknown>)
          : {};

      return {
        id: String(obj.id ?? index + 1),
        url,
        alt: typeof obj.alt === "string" ? obj.alt : productName,
        type: (typeof obj.type === "string"
          ? obj.type
          : "front") as ProductImage["type"],
      };
    })
    .filter((image): image is ProductImage => image !== null);
}

function deriveBadge(row: DbProduct): string | undefined {
  if (row.new_arrival) return "New Arrival";
  if (row.best_seller) return "Bestseller";
  return undefined;
}

function deriveDiscount(price: number, comparePrice: number | null): number {
  if (!comparePrice || comparePrice <= price) return 0;
  return Math.round(((comparePrice - price) / comparePrice) * 100);
}

/**
 * Maps a raw Supabase `products` row onto the richer `Product` shape the
 * storefront UI was built against. Fields that don't exist in the current
 * schema yet (rating, reviews, variants, specifications, related products)
 * are defaulted rather than fabricated.
 */
export function mapDbProductToProduct(row: DbProduct): Product {
  const images = normalizeImages(row.images, row.name);

  const variants: ProductVariant[] = row.color
    ? [
        {
          id: `${row.id}-${row.color}`,
          color: row.color,
          colorCode: "",
          sizes: (row.sizes ?? []).map((size) => ({
            size,
            stock: row.stock,
            sku: row.sku,
          })),
          images,
        },
      ]
    : [];

  return {
    id: row.id,

    sku: row.sku,
    styleCode: row.sku,
    slug: row.slug,

    name: row.name,
    shortName: row.name,

    category: row.category,
    subCategory: row.category,
    collection: row.collection,

    badge: deriveBadge(row),

    price: row.price,
    oldPrice: row.compare_price ?? undefined,

    discount: deriveDiscount(row.price, row.compare_price),

    currency: "INR",

    rating: 0,
    reviewCount: 0,

    stock: row.stock,

    featured: row.featured,
    newArrival: row.new_arrival,
    bestSeller: row.best_seller,

    images,

    variants,

    specifications: {
      fabric: row.fabric,
      work: "",
      neckline: "",
      sleeve: "",
      fit: "",
      occasion: [],
      care: "",
    },

    description: row.description,

    seo: {
      title: row.seo_title,
      description: row.seo_description,
      keywords: [],
    },

    reviews: [],

    relatedProducts: [],

    completeLook: [],

    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getProducts(): Promise<Product[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("active", true)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data as DbProduct[]).map(mapDbProductToProduct);
}

export async function getFeaturedProducts(): Promise<Product[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("active", true)
    .eq("featured", true)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data as DbProduct[]).map(mapDbProductToProduct);
}

export async function getProductBySlug(
  slug: string
): Promise<Product | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("slug", slug)
    .eq("active", true)
    .single();

  if (error || !data) {
    return null;
  }

  return mapDbProductToProduct(data as DbProduct);
}

export async function getProductById(
  id: number
): Promise<Product | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .eq("active", true)
    .single();

  if (error || !data) {
    return null;
  }

  return mapDbProductToProduct(data as DbProduct);
}

// ---------------------------------------------------------------------------
// Admin-only helpers — use service-role client (bypasses RLS)
// ---------------------------------------------------------------------------

/**
 * Lightweight COUNT of all active products.
 * Used by the admin dashboard KPI card; avoids loading full product rows.
 */
export async function getProductCount(): Promise<number> {
  const supabase = createServiceRoleClient();

  const { count, error } = await supabase
    .from("products")
    .select("*", { count: "exact", head: true })
    .eq("active", true);

  if (error) {
    throw new Error(error.message);
  }

  return count ?? 0;
}

export type LowStockProduct = {
  id: string;
  name: string;
  sku: string;
  stock: number;
};

/**
 * Returns active products whose stock is at or below `threshold` (default 5),
 * ordered by stock ascending so the most critical items appear first.
 * Used by the admin dashboard Low Stock section.
 */
export async function getLowStockProducts(
  threshold = 5
): Promise<LowStockProduct[]> {
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from("products")
    .select("id, name, sku, stock")
    .eq("active", true)
    .lte("stock", threshold)
    .order("stock", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => ({
    id: String(row.id),
    name: row.name as string,
    sku: row.sku as string,
    stock: row.stock as number,
  }));
}
