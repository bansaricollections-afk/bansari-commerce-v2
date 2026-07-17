"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

// ─── Constants ────────────────────────────────────────────────────────────────

const PRODUCTS_TABLE = "products";
const PRODUCT_IMAGES_BUCKET = "product-images";
const PAGE_SIZE = 8;
const LOW_STOCK_THRESHOLD = 5;
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

// ─── Schemas ──────────────────────────────────────────────────────────────────

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

type FieldErrors = Partial<Record<keyof ProductFormState, string>>;

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

// ─── Required fields for completeness tracker ─────────────────────────────────

const REQUIRED_FIELDS: Array<keyof ProductFormState> = [
  "name",
  "slug",
  "sku",
  "category",
  "collection",
  "brand",
  "fabric",
  "color",
  "sizes",
  "price",
  "stock",
  "hsn",
  "description",
  "seoTitle",
  "seoDescription",
];

// ─── Pure helpers ──────────────────────────────────────────────────────────────

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Build a safe, unique storage path for an uploaded image.
 *
 * Strategy:
 *   1. Strip the extension from the original filename.
 *   2. Slugify only the base name (no dots, no spaces).
 *   3. Re-attach the lowercased extension.
 *   4. Prefix with a timestamp so concurrent uploads never collide.
 *
 * Example: "My Photo.JPG" → "1720000000000-my-photo.jpg"
 */
function buildStoragePath(file: File): string {
  const lastDot = file.name.lastIndexOf(".");
  const rawBase = lastDot > 0 ? file.name.slice(0, lastDot) : file.name;
  const ext = lastDot > 0 ? file.name.slice(lastDot + 1).toLowerCase() : "jpg";
  const safeBase = slugify(rawBase) || "image";
  return `${Date.now()}-${safeBase}.${ext}`;
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

/** Compute listing completeness 0–100 */
function computeCompleteness(form: ProductFormState): number {
  const filled = REQUIRED_FIELDS.filter((key) => {
    const val = form[key];
    if (typeof val === "string") return val.trim().length > 0;
    if (typeof val === "boolean") return true;
    return false;
  }).length;
  const imageBonus = form.images.length > 0 ? 1 : 0;
  return Math.round(((filled + imageBonus) / (REQUIRED_FIELDS.length + 1)) * 100);
}

// ─── Design-system primitives ──────────────────────────────────────────────────

function FormField({
  label,
  htmlFor,
  required,
  error,
  hint,
  counter,
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  error?: string;
  hint?: string;
  counter?: { current: number; max: number };
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <label
          htmlFor={htmlFor}
          className="block text-sm font-semibold leading-none text-slate-700"
        >
          {label}
          {required ? <span className="ml-0.5 text-red-500"> *</span> : null}
        </label>
        {counter ? (
          <span
            className={cn(
              "text-xs tabular-nums",
              counter.current > counter.max
                ? "text-red-500"
                : counter.current > counter.max * 0.85
                ? "text-amber-600"
                : "text-slate-400"
            )}
          >
            {counter.current}/{counter.max}
          </span>
        ) : null}
      </div>
      {children}
      {error ? (
        <p className="text-xs text-red-600" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-slate-500">{hint}</p>
      ) : null}
    </div>
  );
}

function AdminInput({
  id,
  type = "text",
  value,
  onChange,
  placeholder,
  disabled,
  invalid,
  suffix,
  className,
}: {
  id: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  suffix?: React.ReactNode;
  className?: string;
}) {
  const input = (
    <input
      id={id}
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      aria-invalid={invalid}
      className={cn(
        "h-11 w-full rounded-lg border bg-white px-3.5 text-sm text-slate-900",
        "placeholder:text-slate-400",
        "outline-none transition",
        "focus:border-[#8A5A6A] focus:ring-2 focus:ring-[#8A5A6A]/20",
        "disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400",
        invalid
          ? "border-red-400 focus:border-red-500 focus:ring-red-200"
          : "border-slate-300",
        suffix ? "pr-12" : "",
        className
      )}
    />
  );
  if (!suffix) return input;
  return (
    <div className="relative">
      {input}
      <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-500">
        {suffix}
      </span>
    </div>
  );
}

function AdminTextarea({
  id,
  value,
  onChange,
  placeholder,
  rows = 6,
  minHeight,
  invalid,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  minHeight?: string;
  invalid?: boolean;
}) {
  return (
    <textarea
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      aria-invalid={invalid}
      className={cn(
        "w-full resize-y rounded-lg border bg-white px-3.5 py-3",
        "text-sm text-slate-900 placeholder:text-slate-400",
        "outline-none transition",
        "focus:border-[#8A5A6A] focus:ring-2 focus:ring-[#8A5A6A]/20",
        invalid
          ? "border-red-400 focus:border-red-500 focus:ring-red-200"
          : "border-slate-300"
      )}
      style={minHeight ? { minHeight } : undefined}
    />
  );
}

function FilterSelect({
  value,
  onChange,
  "aria-label": ariaLabel,
  children,
}: {
  value: string;
  onChange: (v: string) => void;
  "aria-label": string;
  children: React.ReactNode;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={ariaLabel}
      className="h-9 rounded-lg border border-slate-300 bg-white px-2.5 text-xs text-slate-900 outline-none transition focus:border-[#8A5A6A] focus:ring-2 focus:ring-[#8A5A6A]/20"
    >
      {children}
    </select>
  );
}

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
        <h3 className="whitespace-nowrap text-[11px] font-semibold uppercase tracking-widest text-slate-600">
          {title}
        </h3>
        <div className="h-px flex-1 bg-slate-200" />
      </div>
      {children}
    </section>
  );
}

type ToggleFieldId = keyof Pick<
  ProductFormState,
  "featured" | "newArrival" | "bestSeller" | "active"
>;

function ToggleCard({
  id,
  label,
  description,
  checked,
  onChange,
}: {
  id: ToggleFieldId;
  label: string;
  description?: string;
  checked: boolean;
  onChange: (id: ToggleFieldId, checked: boolean) => void;
}) {
  return (
    <label
      htmlFor={id}
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors",
        checked
          ? "border-[#8A5A6A] bg-[#8A5A6A]/10"
          : "border-slate-200 bg-white hover:bg-slate-50"
      )}
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(id, e.target.checked)}
        className="mt-0.5 size-4 accent-[#8A5A6A]"
      />
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-800">{label}</p>
        {description ? (
          <p className="mt-0.5 text-xs text-slate-500">{description}</p>
        ) : null}
      </div>
    </label>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 rounded-lg border border-slate-200 bg-white p-3">
      <dt className="text-xs font-medium text-slate-500">{label}</dt>
      <dd className="text-sm text-slate-900">{value || "-"}</dd>
    </div>
  );
}

function CompletenessBar({ pct }: { pct: number }) {
  const color =
    pct >= 90
      ? "bg-emerald-500"
      : pct >= 60
      ? "bg-amber-400"
      : "bg-red-400";
  return (
    <div className="flex items-center gap-2.5">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200">
        <div
          className={cn("h-full rounded-full transition-all", color)}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="shrink-0 text-xs font-medium tabular-nums text-slate-600">
        {pct}% complete
      </span>
    </div>
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
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [isDirty, setIsDirty] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Unsaved changes guard ──────────────────────────────────────────────────

  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (isDirty && formOpen) {
        e.preventDefault();
      }
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty, formOpen]);

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

  const completeness = useMemo(() => computeCompleteness(form), [form]);

  // ── Event handlers ────────────────────────────────────────────────────────

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
    setIsDirty(true);
    if (fieldErrors[id]) {
      setFieldErrors((e) => { const n = { ...e }; delete n[id]; return n; });
    }
  }
  function updateToggle(id: ToggleFieldId, checked: boolean) {
    setForm((c) => ({ ...c, [id]: checked }));
    setIsDirty(true);
  }
  function openCreateForm() {
    setDrawerMode("create");
    setForm(emptyForm);
    setFieldErrors({});
    setIsDirty(false);
    setFormOpen(true);
  }
  function openEditForm(product: Product) {
    setDrawerMode("edit");
    setForm(productToForm(product));
    setFieldErrors({});
    setIsDirty(false);
    setFormOpen(true);
  }
  function applySlug() {
    setForm((c) => ({
      ...c,
      slug: slugify(c.name),
      seoTitle: c.seoTitle || c.name,
    }));
    setIsDirty(true);
  }
  function applySku() {
    setForm((c) => ({
      ...c,
      sku: generateSku(c.category, c.name),
    }));
    setIsDirty(true);
  }

  // ── Image upload ──────────────────────────────────────────────────────────
  //
  // Fix summary vs. original code:
  //   1. buildStoragePath() correctly separates base name from extension so the
  //      extension is never appended twice and slugify() never corrupts dots.
  //   2. Client-side MIME type and file-size guards give immediate feedback
  //      instead of letting Supabase return an opaque error after the network round-trip.
  //   3. upload() now passes { upsert: false, cacheControl: '3600' } so re-uploads
  //      of the same filename do not silently fail, and assets are CDN-cached.
  //   4. getPublicUrl() result is verified: if the returned URL is empty the
  //      caller gets a clear error instead of an empty-src <img>.
  //   5. setUploading(false) is called in a finally block so the spinner always
  //      clears even when an early return fires for one file in the loop.

  async function handleImageUpload(files: FileList | null) {
    if (!files || files.length === 0) return;

    // ── Client-side validation ──
    for (const file of Array.from(files)) {
      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        toast.error(`"${file.name}" is not a supported image type. Use JPG, PNG, or WebP.`);
        return;
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        toast.error(`"${file.name}" exceeds the 5 MB limit (${(file.size / 1024 / 1024).toFixed(1)} MB).`);
        return;
      }
    }

    setUploading(true);
    const uploadedImages: ProductImage[] = [];

    try {
      for (const file of Array.from(files)) {
        // Correct path: timestamp + slugified base + original extension (never doubled).
        const path = buildStoragePath(file);

        const { error: uploadError } = await supabase.storage
          .from(PRODUCT_IMAGES_BUCKET)
          .upload(path, file, {
            cacheControl: "3600",
            upsert: false,
            contentType: file.type,
          });

        if (uploadError) {
          // Provide the Supabase error message verbatim so the developer can
          // immediately diagnose bucket-not-found, RLS, or size errors.
          toast.error(`Upload failed for "${file.name}": ${uploadError.message}`);
          return;
        }

        const { data: urlData } = supabase.storage
          .from(PRODUCT_IMAGES_BUCKET)
          .getPublicUrl(path);

        if (!urlData.publicUrl) {
          toast.error(`Could not generate public URL for "${file.name}". Ensure the bucket is set to public.`);
          return;
        }

        uploadedImages.push({
          url: urlData.publicUrl,
          alt: form.name.trim() || file.name,
        });
      }

      if (uploadedImages.length > 0) {
        setForm((c) => ({ ...c, images: [...c.images, ...uploadedImages] }));
        setIsDirty(true);
        toast.success(
          `${uploadedImages.length} image${
            uploadedImages.length > 1 ? "s" : ""
          } uploaded successfully.`
        );
      }
    } finally {
      setUploading(false);
      // Reset the file input so the same file can be re-selected if needed.
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  function removeImage(url: string) {
    setForm((c) => ({ ...c, images: c.images.filter((img) => img.url !== url) }));
    setIsDirty(true);
  }

  async function handleSubmit() {
    const result = prepareForm(form);
    if (!result.success) {
      const errors: FieldErrors = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof ProductFormState | undefined;
        if (key) errors[key] = issue.message;
      }
      setFieldErrors(errors);
      toast.error(result.error.issues[0]?.message ?? "Invalid product data.");
      return;
    }
    setFieldErrors({});
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
      toast.success("Product created successfully.");
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
      toast.success("Product updated successfully.");
    }
    setSaving(false);
    setIsDirty(false);
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

  function handleDrawerOpenChange(open: boolean) {
    if (!open && isDirty) {
      if (!window.confirm("You have unsaved changes. Discard them?")) return;
    }
    setFormOpen(open);
    if (!open) setIsDirty(false);
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Products</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage catalog, pricing, stock, media, and SEO for Bansari products.
          </p>
        </div>
        <Button type="button" size="lg" onClick={openCreateForm}>
          <Plus className="size-4" />
          New Product
        </Button>
      </div>

      {/* ── Product table card ───────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-900">
            Product Catalog
          </h2>
          <p className="mt-0.5 text-sm text-slate-500">
            {filteredProducts.length} product{filteredProducts.length !== 1 ? "s" : ""}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 bg-slate-50 px-5 py-3">
          <label className="relative min-w-[200px] flex-1">
            <span className="sr-only">Search products</span>
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={query}
              onChange={(e) => updateQuery(e.target.value)}
              placeholder="Search by name, SKU, category…"
              className="h-9 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-[#8A5A6A] focus:ring-2 focus:ring-[#8A5A6A]/20"
            />
          </label>

          <FilterSelect
            value={categoryFilter}
            onChange={updateCategoryFilter}
            aria-label="Filter by category"
          >
            <option value="all">All categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </FilterSelect>

          <FilterSelect
            value={statusFilter}
            onChange={updateStatusFilter}
            aria-label="Filter by status"
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="featured">Featured</option>
            <option value="new-arrival">New Arrival</option>
            <option value="best-seller">Best Seller</option>
          </FilterSelect>

          <FilterSelect
            value={stockFilter}
            onChange={updateStockFilter}
            aria-label="Filter by stock"
          >
            <option value="all">All stock</option>
            <option value="in-stock">In stock</option>
            <option value="low-stock">Low stock</option>
            <option value="out-of-stock">Out of stock</option>
          </FilterSelect>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={loadProducts}
            disabled={loading}
            className="border-slate-300 text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
            Refresh
          </Button>
        </div>

        {error ? (
          <div className="border-b border-red-200 bg-red-50 px-5 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-200 bg-slate-50/60">
                <TableHead className="w-[320px] px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Product</TableHead>
                <TableHead className="px-4 py-3.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Category</TableHead>
                <TableHead className="px-4 py-3.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Price</TableHead>
                <TableHead className="px-4 py-3.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Stock</TableHead>
                <TableHead className="px-4 py-3.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Status</TableHead>
                <TableHead className="px-4 py-3.5 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-40 text-center">
                    <span className="inline-flex items-center gap-2 text-slate-500">
                      <Loader2 className="size-4 animate-spin" />
                      Loading products…
                    </span>
                  </TableCell>
                </TableRow>
              ) : visibleProducts.length > 0 ? (
                visibleProducts.map((product) => (
                  <TableRow
                    key={product.id}
                    className="border-slate-100 hover:bg-slate-50/60 transition-colors"
                  >
                    <TableCell className="px-5 py-4">
                      <div className="flex items-center gap-3.5">
                        <div className="relative size-12 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
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
                          <p className="truncate text-sm font-semibold text-slate-900">
                            {product.name}
                          </p>
                          <p className="mt-0.5 truncate text-xs text-slate-500">
                            {product.sku}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-4">
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                        {product.category}
                      </span>
                    </TableCell>
                    <TableCell className="px-4 py-4">
                      <span className="text-sm font-semibold text-slate-900 tabular-nums">
                        {formatCurrency(product.price)}
                      </span>
                      {product.comparePrice && product.comparePrice > product.price ? (
                        <span className="ml-1.5 text-xs text-slate-400 line-through tabular-nums">
                          {formatCurrency(product.comparePrice)}
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell className="px-4 py-4">
                      <Badge variant={stockVariant(product)}>
                        {stockLabel(product)}
                      </Badge>
                      <p className="mt-0.5 text-xs text-slate-500 tabular-nums">
                        {product.stock} units
                      </p>
                    </TableCell>
                    <TableCell className="px-4 py-4">
                      <div className="flex flex-wrap gap-1.5">
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                            product.active
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-slate-100 text-slate-600"
                          )}
                        >
                          {product.active ? "Active" : "Inactive"}
                        </span>
                        {product.featured ? (
                          <span className="inline-flex items-center rounded-full bg-[#8A5A6A]/10 px-2.5 py-0.5 text-xs font-medium text-[#8A5A6A]">
                            Featured
                          </span>
                        ) : null}
                        {product.bestSeller ? (
                          <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                            Best Seller
                          </span>
                        ) : null}
                        {product.newArrival ? (
                          <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                            New
                          </span>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-4">
                      <div className="flex justify-end gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={`View ${product.name}`}
                          onClick={() => setDetailsProduct(product)}
                          className="size-8 text-slate-500 hover:text-slate-900"
                        >
                          <Eye className="size-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={`Edit ${product.name}`}
                          onClick={() => openEditForm(product)}
                          className="size-8 text-slate-500 hover:text-slate-900"
                        >
                          <Edit className="size-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          aria-label={`Delete ${product.name}`}
                          onClick={() => setDeleteProduct(product)}
                          className="size-8"
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
                    <div className="flex flex-col items-center gap-2">
                      <ImagePlus className="size-8 text-slate-300" />
                      <p className="text-sm text-slate-500">
                        No products match the current filters.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50/60 px-5 py-3 text-sm md:flex-row md:items-center md:justify-between">
          <p className="text-slate-500">
            Showing <span className="font-medium text-slate-700">{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filteredProducts.length)}</span> of{" "}
            <span className="font-medium text-slate-700">{filteredProducts.length}</span> products
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="border-slate-300"
            >
              Previous
            </Button>
            <span className="min-w-[80px] text-center text-xs text-slate-500 tabular-nums">
              Page {page} of {totalPages}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page === totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="border-slate-300"
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      {/* ── CREATE / EDIT PRODUCT DRAWER ── */}
      <Sheet open={formOpen} onOpenChange={handleDrawerOpenChange}>
        <SheetContent
          className={cn(
            "w-full",
            "md:max-w-[700px]",
            "lg:max-w-[820px]",
            "xl:max-w-[960px]",
            "flex h-screen flex-col overflow-hidden p-0"
          )}
        >
          {/* Sticky header */}
          <SheetHeader className="shrink-0 border-b border-slate-200 bg-white px-8 py-5">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0 flex-1">
                <SheetTitle className="text-xl font-bold text-slate-900">
                  {drawerMode === "create" ? "Create Product" : "Edit Product"}
                </SheetTitle>
                <SheetDescription className="mt-0.5 text-sm text-slate-500">
                  {drawerMode === "create"
                    ? "Fill in the details below to add a new product to the catalog."
                    : `Editing: ${form.name || "(untitled)"}`}
                </SheetDescription>
              </div>
              {isDirty ? (
                <span className="shrink-0 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                  Unsaved
                </span>
              ) : null}
            </div>
            <div className="mt-3">
              <CompletenessBar pct={completeness} />
            </div>
          </SheetHeader>

          {/* Scrollable form body */}
          <div className="flex-1 overflow-y-auto bg-slate-50">
            <div className="space-y-8 px-8 py-7">

              {/* ── Section 1: Media ── */}
              <FormSection title="Media">
                {/* Drop zone */}
                <div
                  role="button"
                  tabIndex={0}
                  aria-label="Upload product images"
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setDragOver(true);
                  }}
                  onDragEnter={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setDragOver(true);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setDragOver(false);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setDragOver(false);
                    void handleImageUpload(e.dataTransfer.files);
                  }}
                  onClick={() => {
                    if (!uploading) fileInputRef.current?.click();
                  }}
                  onKeyDown={(e) => {
                    if ((e.key === "Enter" || e.key === " ") && !uploading) {
                      fileInputRef.current?.click();
                    }
                  }}
                  className={cn(
                    "flex cursor-pointer flex-col items-center justify-center gap-3",
                    "rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors",
                    uploading && "pointer-events-none opacity-60",
                    dragOver
                      ? "border-[#8A5A6A] bg-[#8A5A6A]/5"
                      : "border-slate-300 bg-white hover:border-[#8A5A6A]/60 hover:bg-slate-50"
                  )}
                >
                  {uploading ? (
                    <>
                      <Loader2 className="size-6 animate-spin text-slate-400" />
                      <p className="text-sm font-medium text-slate-700">Uploading…</p>
                    </>
                  ) : (
                    <>
                      <ImagePlus className="size-6 text-slate-400" />
                      <div>
                        <p className="text-sm font-medium text-slate-700">
                          Drop images or click to upload
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          JPG, PNG, WebP — max 5 MB each
                        </p>
                      </div>
                    </>
                  )}
                </div>

                {/* Hidden file input — reset value after each upload so the
                    same file can be selected again without re-opening the picker */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  multiple
                  className="sr-only"
                  onChange={(e) => {
                    void handleImageUpload(e.target.files);
                  }}
                />

                {/* Image thumbnails */}
                {form.images.length > 0 ? (
                  <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
                    {form.images.map((img, i) => (
                      <div
                        key={img.url}
                        className="group relative aspect-square overflow-hidden rounded-lg border border-slate-200 bg-slate-100"
                      >
                        <Image
                          src={img.url}
                          alt={img.alt}
                          fill
                          sizes="120px"
                          className="object-cover"
                        />
                        {i === 0 ? (
                          <span className="absolute left-1 top-1 rounded bg-[#8A5A6A] px-1.5 py-0.5 text-[10px] font-semibold text-white">
                            Cover
                          </span>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => removeImage(img.url)}
                          aria-label={`Remove image ${i + 1}`}
                          className="absolute right-1 top-1 hidden size-6 items-center justify-center rounded-full bg-black/50 text-white transition hover:bg-black/70 group-hover:flex"
                        >
                          <X className="size-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : null}
              </FormSection>

              {/* ── Section 2: Basic Info ── */}
              <FormSection title="Basic Info">
                <div className="grid gap-5">
                  <FormField label="Product Name" htmlFor="name" required error={fieldErrors.name}>
                    <AdminInput
                      id="name"
                      value={form.name}
                      onChange={(v) => updateForm("name", v)}
                      placeholder="e.g. Floral Embroidered Kurti"
                      invalid={!!fieldErrors.name}
                    />
                  </FormField>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <FormField label="Slug" htmlFor="slug" required error={fieldErrors.slug}
                      hint="URL-safe identifier, e.g. floral-embroidered-kurti">
                      <div className="flex gap-2">
                        <AdminInput
                          id="slug"
                          value={form.slug}
                          onChange={(v) => updateForm("slug", v)}
                          placeholder="floral-embroidered-kurti"
                          invalid={!!fieldErrors.slug}
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={applySlug}
                          disabled={!form.name}
                          className="h-11 shrink-0 border-slate-300 text-xs"
                          aria-label="Auto-generate slug from name"
                        >
                          <Wand2 className="size-3.5" />
                        </Button>
                      </div>
                    </FormField>

                    <FormField label="SKU" htmlFor="sku" required error={fieldErrors.sku}
                      hint="Stock-keeping unit — must be unique">
                      <div className="flex gap-2">
                        <AdminInput
                          id="sku"
                          value={form.sku}
                          onChange={(v) => updateForm("sku", v)}
                          placeholder="BC-KUR-FLO-123456"
                          invalid={!!fieldErrors.sku}
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={applySku}
                          disabled={!form.name && !form.category}
                          className="h-11 shrink-0 border-slate-300 text-xs"
                          aria-label="Auto-generate SKU"
                        >
                          <Wand2 className="size-3.5" />
                        </Button>
                      </div>
                    </FormField>
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <FormField label="Category" htmlFor="category" required error={fieldErrors.category}>
                      <AdminInput
                        id="category"
                        value={form.category}
                        onChange={(v) => updateForm("category", v)}
                        placeholder="e.g. Kurties"
                        invalid={!!fieldErrors.category}
                      />
                    </FormField>
                    <FormField label="Collection" htmlFor="collection" required error={fieldErrors.collection}>
                      <AdminInput
                        id="collection"
                        value={form.collection}
                        onChange={(v) => updateForm("collection", v)}
                        placeholder="e.g. Summer 2026"
                        invalid={!!fieldErrors.collection}
                      />
                    </FormField>
                  </div>

                  <div className="grid gap-5 sm:grid-cols-3">
                    <FormField label="Brand" htmlFor="brand" required error={fieldErrors.brand}>
                      <AdminInput
                        id="brand"
                        value={form.brand}
                        onChange={(v) => updateForm("brand", v)}
                        placeholder="Bansari Collections"
                        invalid={!!fieldErrors.brand}
                      />
                    </FormField>
                    <FormField label="Fabric" htmlFor="fabric" required error={fieldErrors.fabric}>
                      <AdminInput
                        id="fabric"
                        value={form.fabric}
                        onChange={(v) => updateForm("fabric", v)}
                        placeholder="e.g. Cotton"
                        invalid={!!fieldErrors.fabric}
                      />
                    </FormField>
                    <FormField label="Color" htmlFor="color" required error={fieldErrors.color}>
                      <AdminInput
                        id="color"
                        value={form.color}
                        onChange={(v) => updateForm("color", v)}
                        placeholder="e.g. Teal"
                        invalid={!!fieldErrors.color}
                      />
                    </FormField>
                  </div>

                  <FormField label="Sizes" htmlFor="sizes" required error={fieldErrors.sizes}
                    hint="Comma-separated: S, M, L, XL, XXL">
                    <AdminInput
                      id="sizes"
                      value={form.sizes}
                      onChange={(v) => updateForm("sizes", v)}
                      placeholder="S, M, L, XL, XXL"
                      invalid={!!fieldErrors.sizes}
                    />
                  </FormField>
                </div>
              </FormSection>

              {/* ── Section 3: Pricing & Inventory ── */}
              <FormSection title="Pricing & Inventory">
                <div className="grid gap-5">
                  <div className="grid gap-5 sm:grid-cols-3">
                    <FormField label="Selling Price" htmlFor="price" required error={fieldErrors.price}>
                      <AdminInput
                        id="price"
                        type="number"
                        value={form.price}
                        onChange={(v) => updateForm("price", v)}
                        placeholder="0"
                        suffix="₹"
                        invalid={!!fieldErrors.price}
                      />
                    </FormField>
                    <FormField label="Compare Price" htmlFor="comparePrice" error={fieldErrors.comparePrice}
                      hint="Original / MRP — shown as strikethrough">
                      <AdminInput
                        id="comparePrice"
                        type="number"
                        value={form.comparePrice}
                        onChange={(v) => updateForm("comparePrice", v)}
                        placeholder="0"
                        suffix="₹"
                        invalid={!!fieldErrors.comparePrice}
                      />
                    </FormField>
                    <FormField label="Cost" htmlFor="cost" error={fieldErrors.cost}
                      hint="Cost of goods (not shown publicly)">
                      <AdminInput
                        id="cost"
                        type="number"
                        value={form.cost}
                        onChange={(v) => updateForm("cost", v)}
                        placeholder="0"
                        suffix="₹"
                        invalid={!!fieldErrors.cost}
                      />
                    </FormField>
                  </div>

                  <div className="grid gap-5 sm:grid-cols-3">
                    <FormField label="Stock" htmlFor="stock" required error={fieldErrors.stock}>
                      <AdminInput
                        id="stock"
                        type="number"
                        value={form.stock}
                        onChange={(v) => updateForm("stock", v)}
                        placeholder="0"
                        suffix="units"
                        invalid={!!fieldErrors.stock}
                      />
                    </FormField>
                    <FormField label="HSN Code" htmlFor="hsn" required error={fieldErrors.hsn}
                      hint="Harmonised System Nomenclature">
                      <AdminInput
                        id="hsn"
                        value={form.hsn}
                        onChange={(v) => updateForm("hsn", v)}
                        placeholder="6211"
                        invalid={!!fieldErrors.hsn}
                      />
                    </FormField>
                    <FormField label="GST Rate" htmlFor="gst" required error={fieldErrors.gst}>
                      <AdminInput
                        id="gst"
                        type="number"
                        value={form.gst}
                        onChange={(v) => updateForm("gst", v)}
                        placeholder="5"
                        suffix="%"
                        invalid={!!fieldErrors.gst}
                      />
                    </FormField>
                  </div>
                </div>
              </FormSection>

              {/* ── Section 4: Description ── */}
              <FormSection title="Description">
                <FormField
                  label="Product Description"
                  htmlFor="description"
                  required
                  error={fieldErrors.description}
                  counter={{ current: form.description.length, max: 2000 }}
                >
                  <AdminTextarea
                    id="description"
                    value={form.description}
                    onChange={(v) => updateForm("description", v)}
                    placeholder="Describe the product — fabric, fit, occasion, care instructions…"
                    rows={6}
                    minHeight="140px"
                    invalid={!!fieldErrors.description}
                  />
                </FormField>
              </FormSection>

              {/* ── Section 5: SEO ── */}
              <FormSection title="SEO">
                <div className="grid gap-5">
                  <FormField
                    label="SEO Title"
                    htmlFor="seoTitle"
                    required
                    error={fieldErrors.seoTitle}
                    counter={{ current: form.seoTitle.length, max: 60 }}
                  >
                    <AdminInput
                      id="seoTitle"
                      value={form.seoTitle}
                      onChange={(v) => updateForm("seoTitle", v)}
                      placeholder="Floral Embroidered Kurti — Bansari Collections"
                      invalid={!!fieldErrors.seoTitle}
                    />
                  </FormField>
                  <FormField
                    label="SEO Description"
                    htmlFor="seoDescription"
                    required
                    error={fieldErrors.seoDescription}
                    counter={{ current: form.seoDescription.length, max: 160 }}
                  >
                    <AdminTextarea
                      id="seoDescription"
                      value={form.seoDescription}
                      onChange={(v) => updateForm("seoDescription", v)}
                      placeholder="Shop the Floral Embroidered Kurti from Bansari Collections. Premium cotton, sizes S–XXL. Free shipping on orders above ₹999."
                      rows={3}
                      invalid={!!fieldErrors.seoDescription}
                    />
                  </FormField>
                </div>
              </FormSection>

              {/* ── Section 6: Flags ── */}
              <FormSection title="Visibility & Flags">
                <div className="grid gap-3 sm:grid-cols-2">
                  <ToggleCard
                    id="active"
                    label="Active"
                    description="Product is visible in the storefront."
                    checked={form.active}
                    onChange={updateToggle}
                  />
                  <ToggleCard
                    id="featured"
                    label="Featured"
                    description="Shown in featured sections and homepage."
                    checked={form.featured}
                    onChange={updateToggle}
                  />
                  <ToggleCard
                    id="newArrival"
                    label="New Arrival"
                    description="Tagged as a new arrival in filters."
                    checked={form.newArrival}
                    onChange={updateToggle}
                  />
                  <ToggleCard
                    id="bestSeller"
                    label="Best Seller"
                    description="Tagged as a best seller in filters."
                    checked={form.bestSeller}
                    onChange={updateToggle}
                  />
                </div>
              </FormSection>

            </div>
          </div>

          {/* Sticky footer */}
          <SheetFooter className="shrink-0 border-t border-slate-200 bg-white px-8 py-5">
            <div className="flex w-full items-center justify-between gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleDrawerOpenChange(false)}
                disabled={saving}
                className="border-slate-300"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => void handleSubmit()}
                disabled={saving || uploading}
                className="min-w-[140px] bg-[#8A5A6A] text-white hover:bg-[#7a4a5a]"
              >
                {saving ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Saving…
                  </>
                ) : drawerMode === "create" ? (
                  "Create Product"
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ── PRODUCT DETAILS SHEET ── */}
      <Sheet open={!!detailsProduct} onOpenChange={(open) => { if (!open) setDetailsProduct(null); }}>
        <SheetContent className="w-full md:max-w-[560px] overflow-y-auto">
          {detailsProduct ? (
            <>
              <SheetHeader className="mb-6">
                <SheetTitle>{detailsProduct.name}</SheetTitle>
                <SheetDescription>{detailsProduct.sku}</SheetDescription>
              </SheetHeader>
              {detailsProduct.images[0]?.url ? (
                <div className="relative mb-6 aspect-square w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                  <Image
                    src={detailsProduct.images[0].url}
                    alt={detailsProduct.images[0].alt}
                    fill
                    className="object-cover"
                  />
                </div>
              ) : null}
              <dl className="grid gap-3">
                <Detail label="Category" value={detailsProduct.category} />
                <Detail label="Collection" value={detailsProduct.collection} />
                <Detail label="Brand" value={detailsProduct.brand} />
                <Detail label="Fabric" value={detailsProduct.fabric} />
                <Detail label="Color" value={detailsProduct.color} />
                <Detail label="Sizes" value={detailsProduct.sizes.join(", ")} />
                <Detail label="Price" value={formatCurrency(detailsProduct.price)} />
                <Detail label="Stock" value={`${detailsProduct.stock} units`} />
                <Detail label="HSN" value={detailsProduct.hsn} />
                <Detail label="GST" value={`${detailsProduct.gst}%`} />
                <Detail label="Description" value={detailsProduct.description} />
                <Detail label="SEO Title" value={detailsProduct.seoTitle} />
                <Detail label="SEO Description" value={detailsProduct.seoDescription} />
              </dl>
            </>
          ) : null}
        </SheetContent>
      </Sheet>

      {/* ── DELETE CONFIRMATION DIALOG ── */}
      <Dialog open={!!deleteProduct} onOpenChange={(open) => { if (!open) setDeleteProduct(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete product?</DialogTitle>
            <DialogDescription>
              <strong>{deleteProduct?.name}</strong> will be permanently removed from the catalog. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteProduct(null)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void handleDelete()}
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
