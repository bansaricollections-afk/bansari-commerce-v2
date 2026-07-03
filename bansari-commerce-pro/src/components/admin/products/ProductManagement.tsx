"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
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

const PRODUCTS_TABLE = "products";
const PRODUCT_IMAGES_BUCKET = "product-images";
const PAGE_SIZE = 8;
const LOW_STOCK_THRESHOLD = 5;

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

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return fallback;
}

function getNumber(
  row: DbProductRecord,
  key: string,
  fallback = 0
) {
  const value = row[key];

  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  return fallback;
}

function getOptionalNumber(row: DbProductRecord, key: string) {
  const value = row[key];

  if (value === null || value === undefined || value === "") {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function getBoolean(row: DbProductRecord, key: string, fallback = false) {
  const value = row[key];

  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    return value === "true";
  }

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
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (!item || typeof item !== "object") {
      return [];
    }

    const record = item as Record<string, unknown>;
    const url = record.url;
    const alt = record.alt;

    if (typeof url !== "string" || !url) {
      return [];
    }

    return [
      {
        url,
        alt: typeof alt === "string" && alt ? alt : "Product image",
      },
    ];
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
  if (product.stock === 0) {
    return "Out of stock";
  }

  if (product.stock <= LOW_STOCK_THRESHOLD) {
    return "Low stock";
  }

  return "In stock";
}

function stockVariant(product: Product) {
  if (product.stock === 0) {
    return "destructive" as const;
  }

  if (product.stock <= LOW_STOCK_THRESHOLD) {
    return "secondary" as const;
  }

  return "outline" as const;
}

type FieldProps = {
  id: keyof ProductFormState;
  label: string;
  value: string;
  onChange: (id: keyof ProductFormState, value: string) => void;
  type?: string;
  required?: boolean;
};

function Field({
  id,
  label,
  value,
  onChange,
  type = "text",
  required = false,
}: FieldProps) {
  return (
    <label className="grid gap-1.5">
      <span className="text-xs font-medium text-slate-700">
        {label}
        {required ? <span className="text-red-600"> *</span> : null}
      </span>
      <Input
        type={type}
        value={value}
        onChange={(event) => onChange(id, event.target.value)}
        className="h-9 bg-white"
      />
    </label>
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

function ToggleField({
  id,
  label,
  checked,
  onChange,
}: ToggleFieldProps) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-white px-3 py-2">
      <span className="text-xs font-medium text-slate-700">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(id, event.target.checked)}
        className="size-4 accent-[#8A5A6A]"
      />
    </label>
  );
}

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

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError("");

    const { data, error: productsError } = await supabase
      .from(PRODUCTS_TABLE)
      .select("*")
      .order("created_at", {
        ascending: false,
      });

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

  const categories = useMemo(() => {
    return Array.from(
      new Set(products.map((product) => product.category).filter(Boolean))
    ).sort();
  }, [products]);

  const filteredProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return products.filter((product) => {
      const matchesQuery =
        !normalizedQuery ||
        [
          product.name,
          product.sku,
          product.slug,
          product.category,
          product.collection,
          product.brand,
          product.color,
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);

      const matchesCategory =
        categoryFilter === "all" || product.category === categoryFilter;

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && product.active) ||
        (statusFilter === "inactive" && !product.active) ||
        (statusFilter === "featured" && product.featured) ||
        (statusFilter === "new-arrival" && product.newArrival) ||
        (statusFilter === "best-seller" && product.bestSeller);

      const matchesStock =
        stockFilter === "all" ||
        (stockFilter === "in-stock" &&
          product.stock > LOW_STOCK_THRESHOLD) ||
        (stockFilter === "low-stock" &&
          product.stock > 0 &&
          product.stock <= LOW_STOCK_THRESHOLD) ||
        (stockFilter === "out-of-stock" && product.stock === 0);

      return (
        matchesQuery &&
        matchesCategory &&
        matchesStatus &&
        matchesStock
      );
    });
  }, [categoryFilter, products, query, statusFilter, stockFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE));
  const visibleProducts = filteredProducts.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  );

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
    setForm((current) => ({
      ...current,
      [id]: value,
    }));
  }

  function updateToggle(
    id: ToggleFieldProps["id"],
    checked: boolean
  ) {
    setForm((current) => ({
      ...current,
      [id]: checked,
    }));
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
    setForm((current) => ({
      ...current,
      slug: slugify(current.name),
      seoTitle: current.seoTitle || current.name,
    }));
  }

  function applySku() {
    setForm((current) => ({
      ...current,
      sku: generateSku(current.category, current.name),
    }));
  }

  async function handleImageUpload(files: FileList | null) {
    if (!files?.length) {
      return;
    }

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

      uploadedImages.push({
        url: data.publicUrl,
        alt: form.name || file.name,
      });
    }

    setForm((current) => ({
      ...current,
      images: [...current.images, ...uploadedImages],
    }));
    setUploading(false);
    toast.success("Images uploaded.");
  }

  function removeImage(url: string) {
    setForm((current) => ({
      ...current,
      images: current.images.filter((image) => image.url !== url),
    }));
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
      const product = products.find((item) => item.sku === form.sku);

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
    if (!deleteProduct) {
      return;
    }

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

  return (
    <div className="space-y-6">
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

      <Card className="bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold text-slate-950">
            Product Catalog
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid gap-3 lg:grid-cols-[1fr_180px_180px_180px_auto]">
            <label className="relative">
              <span className="sr-only">Search products</span>
              <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={query}
                onChange={(event) => updateQuery(event.target.value)}
                placeholder="Search by name, SKU, slug, category..."
                className="h-9 bg-white pl-8"
              />
            </label>

            <select
              value={categoryFilter}
              onChange={(event) => updateCategoryFilter(event.target.value)}
              className="h-9 rounded-md border border-input bg-white px-2 text-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
            >
              <option value="all">All categories</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(event) => updateStatusFilter(event.target.value)}
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
              onChange={(event) => updateStockFilter(event.target.value)}
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
                onClick={() => setPage((current) => Math.max(1, current - 1))}
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
                onClick={() =>
                  setPage((current) => Math.min(totalPages, current + 1))
                }
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Sheet open={formOpen} onOpenChange={setFormOpen}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-3xl">
          <SheetHeader>
            <SheetTitle>
              {drawerMode === "create" ? "Create Product" : "Edit Product"}
            </SheetTitle>
            <SheetDescription>
              Maintain product data, media, inventory, and SEO metadata.
            </SheetDescription>
          </SheetHeader>

          <div className="grid gap-6 px-6 pb-6">
            <div className="grid gap-4 md:grid-cols-2">
              <Field
                id="name"
                label="Name"
                value={form.name}
                onChange={updateForm}
                required
              />
              <Field
                id="sku"
                label="SKU"
                value={form.sku}
                onChange={updateForm}
                required
              />
              <Field
                id="slug"
                label="Slug"
                value={form.slug}
                onChange={updateForm}
                required
              />
              <Field
                id="category"
                label="Category"
                value={form.category}
                onChange={updateForm}
                required
              />
              <Field
                id="collection"
                label="Collection"
                value={form.collection}
                onChange={updateForm}
                required
              />
              <Field
                id="brand"
                label="Brand"
                value={form.brand}
                onChange={updateForm}
                required
              />
              <Field
                id="fabric"
                label="Fabric"
                value={form.fabric}
                onChange={updateForm}
                required
              />
              <Field
                id="color"
                label="Color"
                value={form.color}
                onChange={updateForm}
                required
              />
              <Field
                id="sizes"
                label="Sizes"
                value={form.sizes}
                onChange={updateForm}
                required
              />
              <Field
                id="hsn"
                label="HSN"
                value={form.hsn}
                onChange={updateForm}
                required
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={applySlug}>
                <Wand2 className="size-4" />
                Generate Slug
              </Button>
              <Button type="button" variant="outline" onClick={applySku}>
                <Wand2 className="size-4" />
                Generate SKU
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-5">
              <Field
                id="price"
                label="Price"
                value={form.price}
                onChange={updateForm}
                type="number"
                required
              />
              <Field
                id="comparePrice"
                label="Compare Price"
                value={form.comparePrice}
                onChange={updateForm}
                type="number"
              />
              <Field
                id="cost"
                label="Cost"
                value={form.cost}
                onChange={updateForm}
                type="number"
              />
              <Field
                id="stock"
                label="Stock"
                value={form.stock}
                onChange={updateForm}
                type="number"
                required
              />
              <Field
                id="gst"
                label="GST %"
                value={form.gst}
                onChange={updateForm}
                type="number"
                required
              />
            </div>

            <label className="grid gap-1.5">
              <span className="text-xs font-medium text-slate-700">
                Description *
              </span>
              <textarea
                value={form.description}
                onChange={(event) =>
                  updateForm("description", event.target.value)
                }
                className="min-h-28 rounded-md border border-input bg-white px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
              />
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <Field
                id="seoTitle"
                label="SEO Title"
                value={form.seoTitle}
                onChange={updateForm}
                required
              />
              <label className="grid gap-1.5">
                <span className="text-xs font-medium text-slate-700">
                  SEO Description *
                </span>
                <textarea
                  value={form.seoDescription}
                  onChange={(event) =>
                    updateForm("seoDescription", event.target.value)
                  }
                  className="min-h-20 rounded-md border border-input bg-white px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
                />
              </label>
            </div>

            <div className="grid gap-3 md:grid-cols-4">
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

            <div className="grid gap-3">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-950">
                    Product Images
                  </h3>
                  <p className="text-xs text-slate-500">
                    Upload multiple product images to Supabase Storage.
                  </p>
                </div>

                <label className="inline-flex h-8 cursor-pointer items-center justify-center gap-2 rounded-md border border-slate-200 px-3 text-xs font-medium transition hover:bg-slate-50">
                  {uploading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <ImagePlus className="size-4" />
                  )}
                  Upload Images
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    className="sr-only"
                    disabled={uploading}
                    onChange={(event) => handleImageUpload(event.target.files)}
                  />
                </label>
              </div>

              {form.images.length > 0 ? (
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  {form.images.map((image) => (
                    <div
                      key={image.url}
                      className="group relative aspect-square overflow-hidden rounded-md border border-slate-200 bg-slate-100"
                    >
                      <Image
                        src={image.url}
                        alt={image.alt}
                        fill
                        sizes="160px"
                        className="object-cover"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon-sm"
                        className="absolute right-2 top-2 opacity-0 transition group-hover:opacity-100"
                        aria-label="Remove image"
                        onClick={() => removeImage(image.url)}
                      >
                        <X className="size-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-md border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
                  No images uploaded.
                </div>
              )}
            </div>
          </div>

          <SheetFooter>
            <Button
              type="button"
              size="lg"
              onClick={handleSubmit}
              disabled={saving || uploading}
            >
              {saving ? <Loader2 className="size-4 animate-spin" /> : null}
              {drawerMode === "create" ? "Create Product" : "Save Product"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Sheet
        open={Boolean(detailsProduct)}
        onOpenChange={(open) => {
          if (!open) {
            setDetailsProduct(null);
          }
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
                  <Detail
                    label="Collection"
                    value={detailsProduct.collection}
                  />
                  <Detail label="Brand" value={detailsProduct.brand} />
                  <Detail label="Fabric" value={detailsProduct.fabric} />
                  <Detail label="Color" value={detailsProduct.color} />
                  <Detail
                    label="Sizes"
                    value={detailsProduct.sizes.join(", ")}
                  />
                  <Detail
                    label="Price"
                    value={formatCurrency(detailsProduct.price)}
                  />
                  <Detail label="Stock" value={String(detailsProduct.stock)} />
                  <Detail label="GST" value={`${detailsProduct.gst}%`} />
                  <Detail
                    label="Description"
                    value={detailsProduct.description}
                  />
                </div>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>

      <Dialog
        open={Boolean(deleteProduct)}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteProduct(null);
          }
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
