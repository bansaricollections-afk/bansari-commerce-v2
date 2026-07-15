"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Edit,
  Eye,
  ImagePlus,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Wand2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

// ─── Constants ───────────────────────────────────────────────────────────────

const PRODUCTS_TABLE = "products";
const PRODUCT_IMAGES_BUCKET = "product-images";
const PAGE_SIZE = 8;
const LOW_STOCK_THRESHOLD = 5;

// ─── Schemas ─────────────────────────────────────────────────────────────────

const imageSchema = z.object({
  url: z.string().min(1),
  alt: z.string().min(1),
});

const productFormSchema = z.object({
  name: z.string().trim().min(2, "Name is required."),
  sku: z.string().trim().min(2, "SKU is required."),
  slug: z
    .string()
    .trim()
    .min(2, "Slug is required.")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use a URL-safe slug."),
  category: z.string().trim().min(1, "Category is required."),
  collection: z.string().trim().min(1, "Collection is required."),
  brand: z.string().trim().min(1, "Brand is required."),
  fabric: z.string().trim().min(1, "Fabric is required."),
  color: z.string().trim().min(1, "Color is required."),
  sizes: z.array(z.string().trim().min(1)).min(1, "Add at least one size."),
  price: z.coerce.number().nonnegative("Price cannot be negative."),
  comparePrice: z.coerce.number().nonnegative().optional(),
  cost: z.coerce.number().nonnegative().optional(),
  stock: z.coerce.number().int().nonnegative("Stock cannot be negative."),
  hsn: z.string().trim().min(1, "HSN is required."),
  gst: z.coerce.number().min(0).max(100),
  description: z.string().trim().min(10, "Description is too short."),
  seoTitle: z.string().trim().min(2, "SEO title is required."),
  seoDescription: z.string().trim().min(10, "SEO description is too short."),
  featured: z.boolean(),
  newArrival: z.boolean(),
  bestSeller: z.boolean(),
  active: z.boolean(),
  images: z.array(imageSchema),
});

// ─── Types ────────────────────────────────────────────────────────────────────

type ProductImage = z.infer<typeof imageSchema>;
type ValidProductForm = z.infer<typeof productFormSchema>;
type DbProductRecord = Record<string, unknown>;

type Product = {
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
  comparePrice?: number;
  cost?: number;
  stock: number;
  hsn: string;
  gst: number;
  description: string;
  seoTitle: string;
  seoDescription: string;
  featured: boolean;
  newArrival: boolean;
  bestSeller: boolean;
  active: boolean;
  images: ProductImage[];
  createdAt?: string;
  updatedAt?: string;
};

type ProductFormState = {
  name: string;
  sku: string;
  slug: string;
  category: string;
  collection: string;
  brand: string;
  fabric: string;
  color: string;
  sizes: string;
  price: string;
  comparePrice: string;
  cost: string;
  stock: string;
  hsn: string;
  gst: string;
  description: string;
  seoTitle: string;
  seoDescription: string;
  featured: boolean;
  newArrival: boolean;
  bestSeller: boolean;
  active: boolean;
  images: ProductImage[];
};

// ─── Defaults ─────────────────────────────────────────────────────────────────

const emptyForm: ProductFormState = {
  name: "",
  sku: "",
  slug: "",
  category: "",
  collection: "",
  brand: "Bansari Collections",
  fabric: "",
  color: "",
  sizes: "",
  price: "",
  comparePrice: "",
  cost: "",
  stock: "",
  hsn: "",
  gst: "5",
  description: "",
  seoTitle: "",
  seoDescription: "",
  featured: false,
  newArrival: false,
  bestSeller: false,
  active: true,
  images: [],
};

// ─── Pure helpers ─────────────────────────────────────────────────────────────

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function generateSku(category: string, name: string) {
  const categoryCode =
    category
      .replace(/[^a-zA-Z]/g, "")
      .slice(0, 3)
      .toUpperCase() || "PRD";
  const nameCode =
    name
      .replace(/[^a-zA-Z]/g, "")
      .slice(0, 3)
      .toUpperCase() || "BAN";
  return `BC-${categoryCode}-${nameCode}-${Date.now().toString().slice(-6)}`;
}

function getString(row: DbProductRecord, key: string, fallback = "") {
  const value = row[key];
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean")
    return String(value);
  return fallback;
}

function getNumber(row: DbProductRecord, key: string, fallback = 0) {
  const value = row[key];
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

function getOptionalNumber(row: DbProductRecord, key: string) {
  const value = row[key];
  if (value === null || value === undefined || value === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function getBoolean(row: DbProductRecord, key: string, fallback = false) {
  const value = row[key];
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value === "true";
  return fallback;
}

function parseSizes(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === "string")
      .filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function parseImages(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const record = item as Record<string, unknown>;
    const url = record.url;
    const alt = record.alt;
    if (typeof url !== "string" || !url) return [];
    return [{ url, alt: typeof alt === "string" && alt ? alt : "Product image" }];
  });
}

function mapProduct(row: DbProductRecord): Product {
  return {
    id: getNumber(row, "id"),
    name: getString(row, "name"),
    sku: getString(row, "sku"),
    slug: getString(row, "slug"),
    category: getString(row, "category"),
    collection: getString(row, "collection"),
    brand: getString(row, "brand", "Bansari Collections"),
    fabric: getString(row, "fabric"),
    color: getString(row, "color"),
    sizes: parseSizes(row.sizes),
    price: getNumber(row, "price"),
    comparePrice: getOptionalNumber(row, "compare_price"),
    cost: getOptionalNumber(row, "cost"),
    stock: getNumber(row, "stock"),
    hsn: getString(row, "hsn"),
    gst: getNumber(row, "gst", 5),
    description: getString(row, "description"),
    seoTitle: getString(row, "seo_title"),
    seoDescription: getString(row, "seo_description"),
    featured: getBoolean(row, "featured"),
    newArrival: getBoolean(row, "new_arrival"),
    bestSeller: getBoolean(row, "best_seller"),
    active: getBoolean(row, "active", true),
    images: parseImages(row.images),
    createdAt: getString(row, "created_at", undefined),
    updatedAt: getString(row, "updated_at", undefined),
  };
}

function productToForm(product: Product): ProductFormState {
  return {
    name: product.name,
    sku: product.sku,
    slug: product.slug,
    category: product.category,
    collection: product.collection,
    brand: product.brand,
    fabric: product.fabric,
    color: product.color,
    sizes: product.sizes.join(", "),
    price: String(product.price),
    comparePrice: product.comparePrice ? String(product.comparePrice) : "",
    cost: product.cost ? String(product.cost) : "",
    stock: String(product.stock),
    hsn: product.hsn,
    gst: String(product.gst),
    description: product.description,
    seoTitle: product.seoTitle,
    seoDescription: product.seoDescription,
    featured: product.featured,
    newArrival: product.newArrival,
    bestSeller: product.bestSeller,
    active: product.active,
    images: product.images,
  };
}

function toPayload(product: ValidProductForm): DbProductRecord {
  return {
    name: product.name,
    sku: product.sku,
    slug: product.slug,
    category: product.category,
    collection: product.collection,
    brand: product.brand,
    fabric: product.fabric,
    color: product.color,
    sizes: product.sizes,
    price: product.price,
    compare_price: product.comparePrice ?? null,
    cost: product.cost ?? null,
    stock: product.stock,
    hsn: product.hsn,
    gst: product.gst,
    description: product.description,
    seo_title: product.seoTitle,
    seo_description: product.seoDescription,
    featured: product.featured,
    new_arrival: product.newArrival,
    best_seller: product.bestSeller,
    active: product.active,
    images: product.images,
    updated_at: new Date().toISOString(),
  };
}

function prepareForm(form: ProductFormState) {
  return productFormSchema.safeParse({
    ...form,
    sizes: form.sizes
      .split(",")
      .map((size) => size.trim())
      .filter(Boolean),
    comparePrice: form.comparePrice ? Number(form.comparePrice) : undefined,
    cost: form.cost ? Number(form.cost) : undefined,
  });
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function stockLabel(product: Product) {
  if (product.stock === 0) return "Out of stock";
  if (product.stock <= LOW_STOCK_THRESHOLD) return "Low stock";
  return "In stock";
}

function stockVariant(product: Product) {
  if (product.stock === 0) return "destructive" as const;
  if (product.stock <= LOW_STOCK_THRESHOLD) return "secondary" as const;
  return "outline" as const;
}

// ─── Form field sub-components ────────────────────────────────────────────────

type FieldProps = {
  id: keyof ProductFormState;
  label: string;
  value: string;
  onChange: (id: keyof ProductFormState, value: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
};

function Field({
  id,
  label,
  value,
  onChange,
  type = "text",
  required = false,
  placeholder,
}: FieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className="text-[13px] font-medium text-slate-700"
      >
        {label}
        {required ? <span className="ml-0.5 text-red-500"> *</span> : null}
      </label>
      <Input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(id, e.target.value)}
        placeholder={placeholder}
        className="h-10 bg-white text-sm"
      />
    </div>
  );
}

type ToggleFieldProps = {
  id: keyof Pick<
    ProductFormState,
    "featured" | "newArrival" | "bestSeller" | "active"
  >;
  label: string;
  checked: boolean;
  onChange: (id: ToggleFieldProps["id"], checked: boolean) => void;
};

function ToggleField({ id, label, checked, onChange }: ToggleFieldProps) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-center justify-between gap-3 rounded-lg border px-4 py-3 transition-colors",
        checked
          ? "border-[#8A5A6A]/30 bg-[#8A5A6A]/5"
          : "border-slate-200 bg-white hover:bg-slate-50"
      )}
    >
      <span className="text-[13px] font-medium text-slate-700">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(id, e.target.checked)}
        className="size-4 accent-[#8A5A6A]"
      />
    </label>
  );
}

/** Layout-only section wrapper — no logic */
function FormSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3">
        <h3 className="whitespace-nowrap text-[11px] font-semibold uppercase tracking-widest text-slate-400">
          {title}
        </h3>
        <div className="h-px flex-1 bg-slate-100" />
      </div>
      {children}
    </section>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ProductManagement() {
  const supabase = useMemo(() => createClient(), []);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [drawerMode, setDrawerMode] = useState<"create" | "edit">("create");
  const [formOpen, setFormOpen] = useState(false);
  const [detailsProduct, setDetailsProduct] = useState<Product | null>(null);
  const [deleteProduct, setDeleteProduct] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductFormState>(emptyForm);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Data loading ──────────────────────────────────────────────────────────

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError("");

    const { data, error: productsError } = await supabase
      .from(PRODUCTS_TABLE)
      .select("*")
      .order("created_at", { ascending: false });

    if (productsError) {
      setError(productsError.message);
      toast.error("Unable to load products.");
      setLoading(false);
      return;
    }

    setProducts(
      (data ?? []).map((row) => mapProduct(row as DbProductRecord))
    );
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void Promise.resolve().then(loadProducts);
  }, [loadProducts]);

  // ── Derived state ──────────────────────────────────────────────────────────

  const categories = useMemo(() => {
    return Array.from(
      new Set(products.map((p) => p.category).filter(Boolean))
    ).sort();
  }, [products]);

  const filteredProducts = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      const matchesQuery =
        !q ||
        [p.name, p.sku, p.slug, p.category, p.collection, p.brand, p.color]
          .join(" ")
          .toLowerCase()
          .includes(q);
      const matchesCategory =
        categoryFilter === "all" || p.category === categoryFilter;
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && p.active) ||
        (statusFilter === "inactive" && !p.active) ||
        (statusFilter === "featured" && p.featured) ||
        (statusFilter === "new-arrival" && p.newArrival) ||
        (statusFilter === "best-seller" && p.bestSeller);
      const matchesStock =
        stockFilter === "all" ||
        (stockFilter === "in-stock" && p.stock > LOW_STOCK_THRESHOLD) ||
        (stockFilter === "low-stock" &&
          p.stock > 0 &&
          p.stock <= LOW_STOCK_THRESHOLD) ||
        (stockFilter === "out-of-stock" && p.stock === 0);
      return matchesQuery && matchesCategory && matchesStatus && matchesStock;
    });
  }, [categoryFilter, products, query, statusFilter, stockFilter]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredProducts.length / PAGE_SIZE)
  );
  const visibleProducts = filteredProducts.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  );

  // ── Event handlers (business logic — unchanged) ───────────────────────────

  function resetFilters() {
    setPage(1);
  }
  function updateQuery(value: string) {
    setQuery(value);
    resetFilters();
  }
  function updateCategoryFilter(value: string) {
    setCategoryFilter(value);
    resetFilters();
  }
  function updateStatusFilter(value: string) {
    setStatusFilter(value);
    resetFilters();
  }
  function updateStockFilter(value: string) {
    setStockFilter(value);
    resetFilters();
  }
  function updateForm(id: keyof ProductFormState, value: string) {
    setForm((c) => ({ ...c, [id]: value }));
  }
  function updateToggle(id: ToggleFieldProps["id"], checked: boolean) {
    setForm((c) => ({ ...c, [id]: checked }));
  }
  function openCreateForm() {
    setDrawerMode("create");
    setForm(emptyForm);
    setFormOpen(true);
  }
  function openEditForm(product: Product) {
    setDrawerMode("edit");
    setForm(productToForm(product));
    setFormOpen(true);
  }
  function applySlug() {
    setForm((c) => ({
      ...c,
      slug: slugify(c.name),
      seoTitle: c.seoTitle || c.name,
    }));
  }
  function applySku() {
    setForm((c) => ({
      ...c,
      sku: generateSku(c.category, c.name),
    }));
  }

  async function handleImageUpload(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    const uploadedImages: ProductImage[] = [];
    for (const file of Array.from(files)) {
      const extension = file.name.split(".").pop() ?? "jpg";
      const path = `${Date.now()}-${slugify(file.name)}.${extension}`;
      const { error: uploadError } = await supabase.storage
        .from(PRODUCT_IMAGES_BUCKET)
        .upload(path, file);
      if (uploadError) {
        toast.error(uploadError.message);
        setUploading(false);
        return;
      }
      const { data } = supabase.storage
        .from(PRODUCT_IMAGES_BUCKET)
        .getPublicUrl(path);
      uploadedImages.push({ url: data.publicUrl, alt: form.name || file.name });
    }
    setForm((c) => ({ ...c, images: [...c.images, ...uploadedImages] }));
    setUploading(false);
    toast.success("Images uploaded.");
  }

  function removeImage(url: string) {
    setForm((c) => ({ ...c, images: c.images.filter((img) => img.url !== url) }));
  }

  async function handleSubmit() {
    const result = prepareForm(form);
    if (!result.success) {
      toast.error(result.error.issues[0]?.message ?? "Invalid product data.");
      return;
    }
    setSaving(true);
    const payload = toPayload(result.data);
    if (drawerMode === "create") {
      payload.created_at = new Date().toISOString();
      const { error: createError } = await supabase
        .from(PRODUCTS_TABLE)
        .insert(payload);
      if (createError) {
        toast.error(createError.message);
        setSaving(false);
        return;
      }
      toast.success("Product created.");
    } else {
      const product = products.find((p) => p.sku === form.sku);
      if (!product) {
        toast.error("Unable to find product for update.");
        setSaving(false);
        return;
      }
      const { error: updateError } = await supabase
        .from(PRODUCTS_TABLE)
        .update(payload)
        .eq("id", product.id);
      if (updateError) {
        toast.error(updateError.message);
        setSaving(false);
        return;
      }
      toast.success("Product updated.");
    }
    setSaving(false);
    setFormOpen(false);
    await loadProducts();
  }

  async function handleDelete() {
    if (!deleteProduct) return;
    setSaving(true);
    const { error: deleteError } = await supabase
      .from(PRODUCTS_TABLE)
      .delete()
      .eq("id", deleteProduct.id);
    if (deleteError) {
      toast.error(deleteError.message);
      setSaving(false);
      return;
    }
    toast.success("Product deleted.");
    setDeleteProduct(null);
    setSaving(false);
    await loadProducts();
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-950">Products</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage catalog, pricing, stock, media, and SEO for Bansari products.
          </p>
        </div>
        <Button type="button" size="lg" onClick={openCreateForm}>
          <Plus className="size-4" />
          New Product
        </Button>
      </div>

      {/* Product table card */}
      <Card className="bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold text-slate-950">
            Product Catalog
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="grid gap-3 lg:grid-cols-[1fr_180px_180px_180px_auto]">
            <label className="relative">
              <span className="sr-only">Search products</span>
              <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={query}
                onChange={(e) => updateQuery(e.target.value)}
                placeholder="Search by name, SKU, slug, category..."
                className="h-9 bg-white pl-8"
              />
            </label>

            <select
              value={categoryFilter}
              onChange={(e) => updateCategoryFilter(e.target.value)}
              className="h-9 rounded-md border border-input bg-white px-2 text-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
            >
              <option value="all">All categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => updateStatusFilter(e.target.value)}
              className="h-9 rounded-md border border-input bg-white px-2 text-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="featured">Featured</option>
              <option value="new-arrival">New Arrival</option>
              <option value="best-seller">Best Seller</option>
            </select>

            <select
              value={stockFilter}
              onChange={(e) => updateStockFilter(e.target.value)}
              className="h-9 rounded-md border border-input bg-white px-2 text-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
            >
              <option value="all">All stock</option>
              <option value="in-stock">In stock</option>
              <option value="low-stock">Low stock</option>
              <option value="out-of-stock">Out of stock</option>
            </select>

            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={loadProducts}
              disabled={loading}
            >
              <RefreshCw className={cn("size-4", loading && "animate-spin")} />
              Refresh
            </Button>
          </div>

          {error ? (
            <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          {/* Table */}
          <div className="overflow-hidden rounded-md border border-slate-200">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[320px] px-4">Product</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-40 text-center">
                      <span className="inline-flex items-center gap-2 text-slate-500">
                        <Loader2 className="size-4 animate-spin" />
                        Loading products...
                      </span>
                    </TableCell>
                  </TableRow>
                ) : visibleProducts.length > 0 ? (
                  visibleProducts.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="px-4">
                        <div className="flex items-center gap-3">
                          <div className="relative size-12 overflow-hidden rounded-md bg-slate-100">
                            {product.images[0]?.url ? (
                              <Image
                                src={product.images[0].url}
                                alt={product.images[0].alt}
                                fill
                                sizes="48px"
                                className="object-cover"
                              />
                            ) : (
                              <ImagePlus className="absolute left-1/2 top-1/2 size-5 -translate-x-1/2 -translate-y-1/2 text-slate-400" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-slate-950">
                              {product.name}
                            </p>
                            <p className="mt-1 truncate text-xs text-slate-500">
                              {product.sku}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{product.category}</TableCell>
                      <TableCell>{formatCurrency(product.price)}</TableCell>
                      <TableCell>
                        <Badge variant={stockVariant(product)}>
                          {stockLabel(product)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1.5">
                          <Badge
                            variant={product.active ? "outline" : "secondary"}
                          >
                            {product.active ? "Active" : "Inactive"}
                          </Badge>
                          {product.featured ? (
                            <Badge variant="secondary">Featured</Badge>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={`View ${product.name}`}
                            onClick={() => setDetailsProduct(product)}
                          >
                            <Eye className="size-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={`Edit ${product.name}`}
                            onClick={() => openEditForm(product)}
                          >
                            <Edit className="size-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            aria-label={`Delete ${product.name}`}
                            onClick={() => setDeleteProduct(product)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-40 text-center">
                      <div className="text-sm text-slate-500">
                        No products match the current filters.
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex flex-col gap-3 text-sm text-slate-500 md:flex-row md:items-center md:justify-between">
            <p>
              Showing {visibleProducts.length} of {filteredProducts.length}{" "}
              products
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <span className="text-xs">
                Page {page} of {totalPages}
              </span>
              <Button
                type="button"
                variant="outline"
                disabled={page === totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─────────────────────────────────────────────────────────────────────
          CREATE / EDIT PRODUCT DRAWER
          Responsive widths: xl:900px  lg:800px  md:700px  mobile:100%
          Layout: sticky header + scrollable body + sticky footer
      ───────────────────────────────────────────────────────────────────── */}
      <Sheet open={formOpen} onOpenChange={setFormOpen}>
        <SheetContent
          className={cn(
            // Responsive drawer widths
            "w-full",
            "md:max-w-[700px]",
            "lg:max-w-[800px]",
            "xl:max-w-[900px]",
            // Full viewport height, no outer scroll
            "flex h-screen flex-col overflow-hidden p-0"
          )}
        >
          {/* ── Sticky header ── */}
          <SheetHeader className="shrink-0 border-b border-slate-100 bg-white px-8 py-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <SheetTitle className="text-xl font-semibold text-slate-950">
                  {drawerMode === "create" ? "Create Product" : "Edit Product"}
                </SheetTitle>
                <SheetDescription className="mt-0.5 text-sm text-slate-500">
                  {drawerMode === "create"
                    ? "Fill in the details below to add a new product to the catalog."
                    : "Update product data, media, inventory, and SEO metadata."}
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          {/* ── Scrollable form body ── */}
          <div className="flex-1 overflow-y-auto">
            <div className="space-y-8 px-8 py-7">

              {/* ── Section 1: Basic Information ── */}
              <FormSection title="Basic Information">
                {/* Name — full width */}
                <Field
                  id="name"
                  label="Product Name"
                  value={form.name}
                  onChange={updateForm}
                  placeholder="e.g. Kanjivaram Pure Silk Saree"
                  required
                />

                {/* Slug row with generate button */}
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <Field
                      id="slug"
                      label="URL Slug"
                      value={form.slug}
                      onChange={updateForm}
                      placeholder="kanjivaram-pure-silk-saree"
                      required
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 shrink-0 gap-1.5 text-xs"
                    onClick={applySlug}
                  >
                    <Wand2 className="size-3.5" />
                    Generate
                  </Button>
                </div>

                {/* SKU row with generate button */}
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <Field
                      id="sku"
                      label="SKU"
                      value={form.sku}
                      onChange={updateForm}
                      placeholder="BC-SAR-KAN-123456"
                      required
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 shrink-0 gap-1.5 text-xs"
                    onClick={applySku}
                  >
                    <Wand2 className="size-3.5" />
                    Generate
                  </Button>
                </div>
              </FormSection>

              {/* ── Section 2: Classification ── */}
              <FormSection title="Classification">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <Field
                    id="category"
                    label="Category"
                    value={form.category}
                    onChange={updateForm}
                    placeholder="Sarees"
                    required
                  />
                  <Field
                    id="collection"
                    label="Collection"
                    value={form.collection}
                    onChange={updateForm}
                    placeholder="Summer 2025"
                    required
                  />
                  <Field
                    id="brand"
                    label="Brand"
                    value={form.brand}
                    onChange={updateForm}
                    required
                  />
                </div>
              </FormSection>

              {/* ── Section 3: Product Details ── */}
              <FormSection title="Product Details">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field
                    id="fabric"
                    label="Fabric"
                    value={form.fabric}
                    onChange={updateForm}
                    placeholder="Pure Silk"
                    required
                  />
                  <Field
                    id="color"
                    label="Color"
                    value={form.color}
                    onChange={updateForm}
                    placeholder="Deep Crimson"
                    required
                  />
                  <Field
                    id="sizes"
                    label="Sizes (comma-separated)"
                    value={form.sizes}
                    onChange={updateForm}
                    placeholder="XS, S, M, L, XL"
                    required
                  />
                  <Field
                    id="hsn"
                    label="HSN Code"
                    value={form.hsn}
                    onChange={updateForm}
                    placeholder="5208"
                    required
                  />
                </div>
              </FormSection>

              {/* ── Section 4: Pricing ── */}
              <FormSection title="Pricing & Inventory">
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
                  <Field
                    id="price"
                    label="Price (₹)"
                    value={form.price}
                    onChange={updateForm}
                    type="number"
                    placeholder="0"
                    required
                  />
                  <Field
                    id="comparePrice"
                    label="Compare Price"
                    value={form.comparePrice}
                    onChange={updateForm}
                    type="number"
                    placeholder="0"
                  />
                  <Field
                    id="cost"
                    label="Cost"
                    value={form.cost}
                    onChange={updateForm}
                    type="number"
                    placeholder="0"
                  />
                  <Field
                    id="stock"
                    label="Stock"
                    value={form.stock}
                    onChange={updateForm}
                    type="number"
                    placeholder="0"
                    required
                  />
                  <Field
                    id="gst"
                    label="GST %"
                    value={form.gst}
                    onChange={updateForm}
                    type="number"
                    placeholder="5"
                    required
                  />
                </div>
              </FormSection>

              {/* ── Section 5: Description ── */}
              <FormSection title="Description">
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="description"
                    className="text-[13px] font-medium text-slate-700"
                  >
                    Description{" "}
                    <span className="ml-0.5 text-red-500">*</span>
                  </label>
                  <textarea
                    id="description"
                    value={form.description}
                    onChange={(e) => updateForm("description", e.target.value)}
                    placeholder="Describe the product — fabric, craftsmanship, occasions, care instructions..."
                    className="w-full resize-y rounded-lg border border-input bg-white px-3.5 py-3 text-sm text-slate-900 outline-none transition focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
                    style={{ minHeight: "220px" }}
                  />
                </div>
              </FormSection>

              {/* ── Section 6: Media ── */}
              <FormSection title="Media">
                {/* Drag-and-drop upload zone */}
                <div
                  role="button"
                  tabIndex={0}
                  aria-label="Upload product images"
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOver(false);
                    void handleImageUpload(e.dataTransfer.files);
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      fileInputRef.current?.click();
                    }
                  }}
                  className={cn(
                    "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors",
                    dragOver
                      ? "border-[#8A5A6A] bg-[#8A5A6A]/5"
                      : "border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-slate-100"
                  )}
                >
                  {uploading ? (
                    <Loader2 className="size-7 animate-spin text-slate-400" />
                  ) : (
                    <ImagePlus className="size-7 text-slate-400" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-slate-700">
                      {uploading ? "Uploading..." : "Drop images here or click to upload"}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      PNG, JPG, WEBP up to 10MB each
                    </p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*"
                    className="sr-only"
                    disabled={uploading}
                    onChange={(e) => void handleImageUpload(e.target.files)}
                  />
                </div>

                {/* Thumbnail grid */}
                {form.images.length > 0 ? (
                  <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
                    {form.images.map((image) => (
                      <div
                        key={image.url}
                        className="group relative aspect-square overflow-hidden rounded-lg border border-slate-200 bg-slate-100"
                      >
                        <Image
                          src={image.url}
                          alt={image.alt}
                          fill
                          sizes="160px"
                          className="object-cover"
                        />
                        <button
                          type="button"
                          aria-label="Remove image"
                          onClick={() => removeImage(image.url)}
                          className="absolute right-1.5 top-1.5 flex size-6 items-center justify-center rounded-full bg-red-500 text-white opacity-0 shadow transition group-hover:opacity-100"
                        >
                          <X className="size-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : null}
              </FormSection>

              {/* ── Section 7: SEO ── */}
              <FormSection title="SEO">
                <Field
                  id="seoTitle"
                  label="SEO Title"
                  value={form.seoTitle}
                  onChange={updateForm}
                  placeholder="Kanjivaram Pure Silk Saree | Bansari Collections"
                  required
                />
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="seoDescription"
                    className="text-[13px] font-medium text-slate-700"
                  >
                    SEO Description{" "}
                    <span className="ml-0.5 text-red-500">*</span>
                  </label>
                  <textarea
                    id="seoDescription"
                    value={form.seoDescription}
                    onChange={(e) =>
                      updateForm("seoDescription", e.target.value)
                    }
                    placeholder="Shop authentic Kanjivaram Pure Silk Sarees at Bansari Collections. Premium ethnic wear for weddings and festivals."
                    rows={3}
                    className="w-full resize-y rounded-lg border border-input bg-white px-3.5 py-3 text-sm text-slate-900 outline-none transition focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
                  />
                </div>
              </FormSection>

              {/* ── Section 8: Product Flags ── */}
              <FormSection title="Product Flags">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <ToggleField
                    id="featured"
                    label="Featured"
                    checked={form.featured}
                    onChange={updateToggle}
                  />
                  <ToggleField
                    id="newArrival"
                    label="New Arrival"
                    checked={form.newArrival}
                    onChange={updateToggle}
                  />
                  <ToggleField
                    id="bestSeller"
                    label="Best Seller"
                    checked={form.bestSeller}
                    onChange={updateToggle}
                  />
                  <ToggleField
                    id="active"
                    label="Active"
                    checked={form.active}
                    onChange={updateToggle}
                  />
                </div>
              </FormSection>

            </div>
          </div>

          {/* ── Sticky footer ── */}
          <SheetFooter className="shrink-0 border-t border-slate-100 bg-white px-8 py-4">
            <div className="flex w-full items-center justify-between gap-3">
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={() => setFormOpen(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="lg"
                onClick={handleSubmit}
                disabled={saving || uploading}
                className="min-w-[160px]"
              >
                {saving ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : null}
                {drawerMode === "create" ? "Create Product" : "Save Changes"}
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ── Product details side sheet ── */}
      <Sheet
        open={Boolean(detailsProduct)}
        onOpenChange={(open) => {
          if (!open) setDetailsProduct(null);
        }}
      >
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          {detailsProduct ? (
            <>
              <SheetHeader>
                <SheetTitle>{detailsProduct.name}</SheetTitle>
                <SheetDescription>{detailsProduct.sku}</SheetDescription>
              </SheetHeader>
              <div className="space-y-5 px-6 pb-6">
                {detailsProduct.images[0]?.url ? (
                  <div className="relative aspect-[4/5] overflow-hidden rounded-md bg-slate-100">
                    <Image
                      src={detailsProduct.images[0].url}
                      alt={detailsProduct.images[0].alt}
                      fill
                      sizes="480px"
                      className="object-cover"
                    />
                  </div>
                ) : null}
                <div className="grid gap-3 text-sm">
                  <Detail label="Slug" value={detailsProduct.slug} />
                  <Detail label="Category" value={detailsProduct.category} />
                  <Detail label="Collection" value={detailsProduct.collection} />
                  <Detail label="Brand" value={detailsProduct.brand} />
                  <Detail label="Fabric" value={detailsProduct.fabric} />
                  <Detail label="Color" value={detailsProduct.color} />
                  <Detail label="Sizes" value={detailsProduct.sizes.join(", ")} />
                  <Detail label="Price" value={formatCurrency(detailsProduct.price)} />
                  <Detail label="Stock" value={String(detailsProduct.stock)} />
                  <Detail label="GST" value={`${detailsProduct.gst}%`} />
                  <Detail label="Description" value={detailsProduct.description} />
                </div>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>

      {/* ── Delete confirmation dialog ── */}
      <Dialog
        open={Boolean(deleteProduct)}
        onOpenChange={(open) => {
          if (!open) setDeleteProduct(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Product</DialogTitle>
            <DialogDescription>
              This will permanently delete {deleteProduct?.name}. This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteProduct(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={saving}
            >
              {saving ? <Loader2 className="size-4 animate-spin" /> : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 rounded-md border border-slate-200 p-3">
      <dt className="text-xs font-medium text-slate-500">{label}</dt>
      <dd className="text-sm text-slate-950">{value || "-"}</dd>
    </div>
  );
}
