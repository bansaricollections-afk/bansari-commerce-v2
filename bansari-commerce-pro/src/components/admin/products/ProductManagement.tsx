"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  Edit,
  Eye,
  ImagePlus,
  Loader2,
  Package,
  Plus,
  RefreshCw,
  Search,
  ShoppingBag,
  Trash2,
  TrendingUp,
  Wand2,
  X,
  AlertTriangle,
  Camera,
  Tag,
  DollarSign,
  FileText,
  Settings2,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  LayoutGrid,
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
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

// ─── Constants ────────────────────────────────────────────────────────────────

const PRODUCT_IMAGES_BUCKET = "product-images";
const PAGE_SIZE = 12;
const LOW_STOCK_THRESHOLD = 5;
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const SEARCH_DEBOUNCE_MS = 350;

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

type ApiProductPayload = {
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
  compare_price?: number | null;
  cost?: number | null;
  stock: number;
  hsn: string;
  gst: number;
  description: string;
  seo_title: string;
  seo_description: string;
  featured: boolean;
  new_arrival: boolean;
  best_seller: boolean;
  active: boolean;
  images: ProductImage[];
};

type FieldErrors = Partial<Record<keyof ProductFormState, string>>;
type ToggleFieldId = keyof Pick<ProductFormState, "featured" | "newArrival" | "bestSeller" | "active">;

// ─── API response shapes ───────────────────────────────────────────────────────

type ApiProductRecord = {
  id: number;
  name: string;
  sku: string;
  slug: string;
  category: string;
  collection: string;
  brand?: string;
  fabric?: string;
  color?: string;
  sizes?: string[] | string;
  price: number;
  compare_price?: number | null;
  cost?: number | null;
  stock: number;
  hsn?: string;
  gst?: number;
  description?: string;
  seo_title?: string;
  seo_description?: string;
  featured?: boolean;
  new_arrival?: boolean;
  best_seller?: boolean;
  active?: boolean;
  images?: unknown;
  created_at?: string;
  updated_at?: string;
};

type ApiListResponse = {
  success: boolean;
  data: ApiProductRecord[];
  total: number;
  page: number;
  pageSize: number;
};

type ApiSingleResponse = {
  success: boolean;
  data: ApiProductRecord;
};

type ApiErrorResponse = {
  success: false;
  error: { code: string; message: string };
};

// ─── Wizard steps ─────────────────────────────────────────────────────────────

const STEPS = [
  { id: 0, label: "Media",      short: "Media",   icon: Camera,     fields: [] as (keyof ProductFormState)[] },
  { id: 1, label: "Basic Info", short: "Info",    icon: Tag,        fields: ["name","slug","sku","category","collection","brand","fabric","color","sizes"] as (keyof ProductFormState)[] },
  { id: 2, label: "Pricing",    short: "Price",   icon: DollarSign, fields: ["price","stock","hsn"] as (keyof ProductFormState)[] },
  { id: 3, label: "Content",    short: "Content", icon: FileText,   fields: ["description","seoTitle","seoDescription"] as (keyof ProductFormState)[] },
  { id: 4, label: "Visibility", short: "Publish", icon: Settings2,  fields: [] as (keyof ProductFormState)[] },
] as const;

// ─── Defaults ─────────────────────────────────────────────────────────────────

const emptyForm: ProductFormState = {
  name: "", sku: "", slug: "", category: "", collection: "",
  brand: "Bansari Collections", fabric: "", color: "", sizes: "",
  price: "", comparePrice: "", cost: "", stock: "", hsn: "", gst: "5",
  description: "", seoTitle: "", seoDescription: "",
  featured: false, newArrival: false, bestSeller: false, active: true,
  images: [],
};

const REQUIRED_FIELDS: Array<keyof ProductFormState> = [
  "name", "slug", "sku", "category", "collection", "brand",
  "fabric", "color", "sizes", "price", "stock", "hsn",
  "description", "seoTitle", "seoDescription",
];

// ─── Pure helpers ──────────────────────────────────────────────────────────────

function slugify(value: string) {
  return value.toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function buildStoragePath(file: File): string {
  const lastDot = file.name.lastIndexOf(".");
  const rawBase = lastDot > 0 ? file.name.slice(0, lastDot) : file.name;
  const ext = lastDot > 0 ? file.name.slice(lastDot + 1).toLowerCase() : "jpg";
  const safeBase = slugify(rawBase) || "image";
  return `${Date.now()}-${safeBase}.${ext}`;
}

function generateSku(category: string, name: string) {
  const categoryCode = category.replace(/[^a-zA-Z]/g, "").slice(0, 3).toUpperCase() || "PRD";
  const nameCode = name.replace(/[^a-zA-Z]/g, "").slice(0, 3).toUpperCase() || "BAN";
  return `BC-${categoryCode}-${nameCode}-${Date.now().toString().slice(-6)}`;
}

function parseSizes(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((i): i is string => typeof i === "string").filter(Boolean);
  if (typeof value === "string") return value.split(",").map((i) => i.trim()).filter(Boolean);
  return [];
}

function parseImages(value: unknown): ProductImage[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const r = item as Record<string, unknown>;
    const url = r.url; const alt = r.alt;
    if (typeof url !== "string" || !url) return [];
    return [{ url, alt: typeof alt === "string" && alt ? alt : "Product image" }];
  });
}

function mapApiProduct(row: ApiProductRecord): Product {
  return {
    id: row.id,
    name: row.name ?? "",
    sku: row.sku ?? "",
    slug: row.slug ?? "",
    category: row.category ?? "",
    collection: row.collection ?? "",
    brand: row.brand ?? "Bansari Collections",
    fabric: row.fabric ?? "",
    color: row.color ?? "",
    sizes: parseSizes(row.sizes),
    price: row.price ?? 0,
    comparePrice: row.compare_price ?? undefined,
    cost: row.cost ?? undefined,
    stock: row.stock ?? 0,
    hsn: row.hsn ?? "",
    gst: row.gst ?? 5,
    description: row.description ?? "",
    seoTitle: row.seo_title ?? "",
    seoDescription: row.seo_description ?? "",
    featured: row.featured ?? false,
    newArrival: row.new_arrival ?? false,
    bestSeller: row.best_seller ?? false,
    active: row.active ?? true,
    images: parseImages(row.images),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function productToForm(product: Product): ProductFormState {
  return {
    name: product.name, sku: product.sku, slug: product.slug,
    category: product.category, collection: product.collection, brand: product.brand,
    fabric: product.fabric, color: product.color, sizes: product.sizes.join(", "),
    price: String(product.price),
    comparePrice: product.comparePrice != null ? String(product.comparePrice) : "",
    cost: product.cost != null ? String(product.cost) : "",
    stock: String(product.stock),
    hsn: product.hsn, gst: String(product.gst), description: product.description,
    seoTitle: product.seoTitle, seoDescription: product.seoDescription,
    featured: product.featured, newArrival: product.newArrival,
    bestSeller: product.bestSeller, active: product.active, images: product.images,
  };
}

function toApiPayload(data: ValidProductForm): ApiProductPayload {
  return {
    name: data.name, sku: data.sku, slug: data.slug,
    category: data.category, collection: data.collection, brand: data.brand,
    fabric: data.fabric, color: data.color, sizes: data.sizes,
    price: data.price,
    compare_price: data.comparePrice ?? null,
    cost: data.cost ?? null,
    stock: data.stock, hsn: data.hsn, gst: data.gst,
    description: data.description, seo_title: data.seoTitle,
    seo_description: data.seoDescription, featured: data.featured,
    new_arrival: data.newArrival, best_seller: data.bestSeller,
    active: data.active, images: data.images,
  };
}

function prepareForm(form: ProductFormState) {
  return productFormSchema.safeParse({
    ...form,
    sizes: form.sizes.split(",").map((s) => s.trim()).filter(Boolean),
    comparePrice: form.comparePrice ? Number(form.comparePrice) : undefined,
    cost: form.cost ? Number(form.cost) : undefined,
  });
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);
}

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

// ─── API helpers ───────────────────────────────────────────────────────────────

function getErrorMessage(body: ApiErrorResponse): string {
  return body?.error?.message ?? "An unexpected error occurred.";
}

const STATUS_MESSAGES: Record<number, string> = {
  400: "Bad request — check your input.",
  401: "Not authenticated. Please log in again.",
  403: "You don't have permission to do that.",
  404: "Product not found.",
  409: "A product with this SKU or slug already exists.",
  422: "Validation failed — check all required fields.",
  500: "Server error — please try again.",
};

async function apiFetch<T>(
  url: string,
  options?: RequestInit,
  signal?: AbortSignal,
): Promise<T> {
  const res = await fetch(url, { ...options, signal, headers: { "Content-Type": "application/json", ...options?.headers } });
  const json = (await res.json()) as T | ApiErrorResponse;
  if (!res.ok) {
    const errBody = json as ApiErrorResponse;
    throw new Error(getErrorMessage(errBody) || STATUS_MESSAGES[res.status] || `HTTP ${res.status}`);
  }
  return json as T;
}

// ─── Design primitives ────────────────────────────────────────────────────────

function FormField({ label, htmlFor, required, error, hint, counter, children }: {
  label: string; htmlFor: string; required?: boolean; error?: string;
  hint?: string; counter?: { current: number; max: number }; children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={htmlFor} className="block text-[13px] font-semibold text-slate-700">
          {label}{required ? <span className="ml-0.5 text-[#8A5A6A]"> *</span> : null}
        </label>
        {counter ? (
          <span className={cn("text-[11px] tabular-nums",
            counter.current > counter.max ? "text-red-500" :
            counter.current > counter.max * 0.85 ? "text-amber-600" : "text-slate-400")}>
            {counter.current}/{counter.max}
          </span>
        ) : null}
      </div>
      {children}
      {error ? <p className="text-[11px] text-red-600" role="alert">{error}</p>
        : hint ? <p className="text-[11px] text-slate-400">{hint}</p> : null}
    </div>
  );
}

function AdminInput({ id, type = "text", value, onChange, placeholder, disabled, invalid, suffix, className }: {
  id: string; type?: string; value: string; onChange: (v: string) => void;
  placeholder?: string; disabled?: boolean; invalid?: boolean; suffix?: React.ReactNode; className?: string;
}) {
  const cls = cn(
    "h-10 w-full rounded-lg border bg-white px-3.5 text-sm text-slate-900",
    "placeholder:text-slate-300 outline-none transition-all duration-150",
    "focus:border-[#8A5A6A] focus:ring-2 focus:ring-[#8A5A6A]/15 focus:shadow-sm",
    "disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400",
    invalid ? "border-red-400 bg-red-50/30 focus:border-red-500 focus:ring-red-200" : "border-slate-200 hover:border-slate-300",
    suffix ? "pr-12" : "", className
  );
  if (!suffix) return <input id={id} type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} disabled={disabled} aria-invalid={invalid} className={cls} />;
  return (
    <div className="relative">
      <input id={id} type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} disabled={disabled} aria-invalid={invalid} className={cls} />
      <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400">{suffix}</span>
    </div>
  );
}

function AdminTextarea({ id, value, onChange, placeholder, rows = 5, minHeight, invalid }: {
  id: string; value: string; onChange: (v: string) => void;
  placeholder?: string; rows?: number; minHeight?: string; invalid?: boolean;
}) {
  return (
    <textarea id={id} value={value} onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder} rows={rows} aria-invalid={invalid}
      className={cn("w-full resize-y rounded-lg border bg-white px-3.5 py-3",
        "text-sm text-slate-900 placeholder:text-slate-300 outline-none transition-all duration-150",
        "focus:border-[#8A5A6A] focus:ring-2 focus:ring-[#8A5A6A]/15 focus:shadow-sm",
        invalid ? "border-red-400 bg-red-50/30 focus:border-red-500 focus:ring-red-200" : "border-slate-200 hover:border-slate-300")}
      style={minHeight ? { minHeight } : undefined} />
  );
}

function FilterSelect({ value, onChange, "aria-label": ariaLabel, children }: {
  value: string; onChange: (v: string) => void; "aria-label": string; children: React.ReactNode;
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} aria-label={ariaLabel}
      className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-900 outline-none transition focus:border-[#8A5A6A] focus:ring-2 focus:ring-[#8A5A6A]/20 shadow-sm">
      {children}
    </select>
  );
}

function ToggleCard({ id, label, description, checked, onChange }: {
  id: ToggleFieldId; label: string; description?: string;
  checked: boolean; onChange: (id: ToggleFieldId, checked: boolean) => void;
}) {
  return (
    <label htmlFor={id}
      className={cn(
        "flex cursor-pointer items-start gap-3.5 rounded-xl border p-4 transition-all duration-200",
        checked
          ? "border-[#8A5A6A] bg-gradient-to-br from-[#8A5A6A]/8 to-[#8A5A6A]/4 shadow-sm"
          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/80"
      )}>
      <div className={cn(
        "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-all duration-200",
        checked ? "border-[#8A5A6A] bg-[#8A5A6A]" : "border-slate-300 bg-white"
      )}>
        {checked && <svg className="h-3 w-3 text-white" viewBox="0 0 12 12" fill="none"><polyline points="1.5,6 5,9.5 10.5,3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
      </div>
      <div className="min-w-0">
        <p className={cn("text-sm font-semibold transition-colors", checked ? "text-[#8A5A6A]" : "text-slate-800")}>{label}</p>
        {description ? <p className="mt-0.5 text-xs text-slate-400 leading-relaxed">{description}</p> : null}
      </div>
    </label>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 rounded-lg border border-slate-100 bg-slate-50 p-3">
      <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</dt>
      <dd className="text-sm text-slate-900">{value || "—"}</dd>
    </div>
  );
}

function CompletenessBar({ pct }: { pct: number }) {
  const color = pct >= 90 ? "bg-emerald-500" : pct >= 60 ? "bg-amber-400" : pct >= 30 ? "bg-[#8A5A6A]" : "bg-slate-300";
  return (
    <div className="flex items-center gap-3">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
        <div className={cn("h-full rounded-full transition-all duration-500", color)} style={{ width: `${pct}%` }} />
      </div>
      <span className={cn("shrink-0 text-xs font-semibold tabular-nums",
        pct >= 90 ? "text-emerald-600" : pct >= 60 ? "text-amber-600" : "text-slate-500")}>
        {pct}%
      </span>
    </div>
  );
}

// ─── Product Card ─────────────────────────────────────────────────────────────

function ProductCard({ product, onView, onEdit, onDelete }: {
  product: Product; onView: (p: Product) => void; onEdit: (p: Product) => void; onDelete: (p: Product) => void;
}) {
  const hasImage = !!product.images[0]?.url;
  const discount = product.comparePrice && product.comparePrice > product.price
    ? Math.round(((product.comparePrice - product.price) / product.comparePrice) * 100) : null;
  const stockStatus = product.stock === 0 ? "out" : product.stock <= LOW_STOCK_THRESHOLD ? "low" : "ok";

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300">
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-gradient-to-br from-[#f5f0f2] to-[#ede8ea]">
        {hasImage ? (
          <Image src={product.images[0].url} alt={product.images[0].alt} fill
            sizes="(max-width:640px) 100vw,(max-width:1024px) 50vw,280px"
            className="object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <div className="rounded-2xl bg-white/60 p-4 backdrop-blur-sm">
              <ImagePlus className="size-8 text-[#8A5A6A]/40" />
            </div>
            <span className="text-xs font-medium text-[#8A5A6A]/50">No image</span>
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/50 to-transparent" />
        <div className="absolute left-2.5 top-2.5 flex flex-col gap-1.5">
          {product.newArrival && <span className="inline-flex items-center gap-1 rounded-full bg-blue-500 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow">✦ New</span>}
          {product.bestSeller && <span className="inline-flex items-center gap-1 rounded-full bg-amber-400 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow">★ Best</span>}
          {product.featured && <span className="inline-flex items-center gap-1 rounded-full bg-[#8A5A6A] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow">♦ Featured</span>}
          {discount && <span className="inline-flex items-center rounded-full bg-emerald-500 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow">-{discount}%</span>}
        </div>
        <div className="absolute right-2.5 top-2.5">
          <span className={cn("inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-[10px] font-semibold shadow backdrop-blur-sm",
            product.active ? "bg-emerald-500/90 text-white" : "bg-slate-800/70 text-slate-200")}>
            <span className={cn("size-1.5 rounded-full", product.active ? "bg-white" : "bg-slate-400")} />
            {product.active ? "Live" : "Off"}
          </span>
        </div>
        <div className="absolute bottom-2.5 left-2.5">
          <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium backdrop-blur-sm",
            stockStatus === "out" && "bg-red-500/90 text-white",
            stockStatus === "low" && "bg-amber-400/90 text-white",
            stockStatus === "ok" && "bg-white/80 text-slate-700")}>
            {stockStatus === "out" && <AlertTriangle className="size-2.5" />}
            {stockStatus === "out" ? "Out of stock" : stockStatus === "low" ? `Low · ${product.stock}` : `${product.stock} in stock`}
          </span>
        </div>
        <div className="absolute inset-x-0 bottom-0 translate-y-full transition-transform duration-300 group-hover:translate-y-0">
          <div className="flex items-center justify-center gap-2 bg-white/95 px-3 py-2.5 backdrop-blur-sm">
            <button type="button" onClick={() => onView(product)} aria-label={`View ${product.name}`}
              className="flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg bg-slate-100 text-xs font-semibold text-slate-700 transition hover:bg-slate-200">
              <Eye className="size-3.5" /> View
            </button>
            <button type="button" onClick={() => onEdit(product)} aria-label={`Edit ${product.name}`}
              className="flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#8A5A6A] text-xs font-semibold text-white transition hover:bg-[#7a4a5a]">
              <Edit className="size-3.5" /> Edit
            </button>
            <button type="button" onClick={() => onDelete(product)} aria-label={`Delete ${product.name}`}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-500 text-white transition hover:bg-red-600">
              <Trash2 className="size-3.5" />
            </button>
          </div>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3.5">
        <span className="self-start rounded-full bg-[#8A5A6A]/8 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#8A5A6A]">
          {product.category || "Uncategorised"}
        </span>
        <p className="line-clamp-2 text-sm font-bold leading-snug text-slate-900">{product.name}</p>
        <p className="font-mono text-[10px] text-slate-400">{product.sku}</p>
        <div className="mt-auto flex items-baseline gap-2 pt-1">
          <span className="text-base font-extrabold text-slate-900 tabular-nums">{formatCurrency(product.price)}</span>
          {product.comparePrice && product.comparePrice > product.price ? (
            <span className="text-xs text-slate-400 line-through tabular-nums">{formatCurrency(product.comparePrice)}</span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="aspect-[4/5] w-full animate-pulse bg-gradient-to-br from-slate-100 to-slate-200" />
      <div className="space-y-2.5 p-3.5">
        <div className="h-3 w-16 animate-pulse rounded-full bg-slate-100" />
        <div className="h-4 w-3/4 animate-pulse rounded bg-slate-100" />
        <div className="h-3 w-24 animate-pulse rounded bg-slate-100" />
        <div className="h-5 w-20 animate-pulse rounded bg-slate-100" />
      </div>
    </div>
  );
}

function StatPill({ icon, label, value, color }: {
  icon: React.ReactNode; label: string; value: number; color: string;
}) {
  return (
    <div className={cn("flex items-center gap-2.5 rounded-xl border px-4 py-2.5 shadow-sm", color)}>
      <span className="shrink-0">{icon}</span>
      <div>
        <p className="text-lg font-bold tabular-nums leading-none">{value}</p>
        <p className="mt-0.5 text-[11px] font-medium opacity-75">{label}</p>
      </div>
    </div>
  );
}

// ─── Wizard Step Panels ───────────────────────────────────────────────────────

function StepMedia({ form, fieldErrors, uploading, dragOver, fileInputRef, onDragOver, onDragEnter, onDragLeave, onDrop, onClick, onKeyDown, onRemove }: {
  form: ProductFormState; fieldErrors: FieldErrors; uploading: boolean; dragOver: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onDragOver: (e: React.DragEvent) => void; onDragEnter: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void; onDrop: (e: React.DragEvent) => void;
  onClick: () => void; onKeyDown: (e: React.KeyboardEvent) => void;
  onRemove: (url: string) => void;
}) {
  void fieldErrors;
  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-base font-bold text-slate-900">Product Images</h3>
        <p className="mt-1 text-sm text-slate-400">Upload high-quality images. The first image becomes the cover photo.</p>
      </div>

      <div role="button" tabIndex={0} aria-label="Upload product images"
        onDragOver={onDragOver} onDragEnter={onDragEnter} onDragLeave={onDragLeave} onDrop={onDrop}
        onClick={onClick} onKeyDown={onKeyDown}
        className={cn(
          "relative flex cursor-pointer flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed px-8 py-14 text-center transition-all duration-200",
          uploading && "pointer-events-none opacity-60",
          dragOver
            ? "border-[#8A5A6A] bg-[#8A5A6A]/5 shadow-inner"
            : "border-slate-200 bg-slate-50/80 hover:border-[#8A5A6A]/50 hover:bg-white"
        )}>
        {uploading ? (
          <>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#8A5A6A]/10">
              <Loader2 className="size-7 animate-spin text-[#8A5A6A]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-700">Uploading images…</p>
              <p className="mt-1 text-xs text-slate-400">Please wait</p>
            </div>
          </>
        ) : (
          <>
            <div className={cn(
              "flex h-14 w-14 items-center justify-center rounded-2xl transition-colors duration-200",
              dragOver ? "bg-[#8A5A6A] text-white" : "bg-[#8A5A6A]/10 text-[#8A5A6A]"
            )}>
              <Camera className="size-7" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">Drop images here or <span className="text-[#8A5A6A] underline underline-offset-2">browse files</span></p>
              <p className="mt-1.5 text-xs text-slate-400">JPG, PNG, WebP · Max 5 MB each · Multiple allowed</p>
            </div>
            {form.images.length === 0 && (
              <div className="mt-2 flex items-center gap-4 text-xs text-slate-300">
                <span>Recommended: 800×1000px</span>
                <span>·</span>
                <span>Square or portrait</span>
              </div>
            )}
          </>
        )}
      </div>

      {form.images.length > 0 && (
        <div className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            {form.images.length} image{form.images.length > 1 ? "s" : ""} uploaded
          </p>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
            {form.images.map((img, i) => (
              <div key={img.url} className="group relative aspect-square overflow-hidden rounded-xl border-2 border-slate-200 bg-slate-100 shadow-sm">
                <Image src={img.url} alt={img.alt} fill sizes="120px" className="object-cover" />
                {i === 0 && (
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-1.5 pb-1.5 pt-4">
                    <span className="block text-center text-[9px] font-bold uppercase tracking-widest text-white">Cover</span>
                  </div>
                )}
                <button type="button" onClick={() => onRemove(img.url)} aria-label={`Remove image ${i + 1}`}
                  className="absolute right-1.5 top-1.5 hidden h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white transition hover:bg-red-500 group-hover:flex">
                  <X className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StepBasicInfo({ form, fieldErrors, updateForm, applySlug, applySku }: {
  form: ProductFormState; fieldErrors: FieldErrors;
  updateForm: (id: keyof ProductFormState, v: string) => void;
  applySlug: () => void; applySku: () => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-bold text-slate-900">Basic Information</h3>
        <p className="mt-1 text-sm text-slate-400">Product identity, categorisation and attributes.</p>
      </div>

      <FormField label="Product Name" htmlFor="name" required error={fieldErrors.name}>
        <AdminInput id="name" value={form.name} onChange={(v) => updateForm("name", v)}
          placeholder="e.g. Floral Embroidered Kurti" invalid={!!fieldErrors.name} />
      </FormField>

      <div className="grid gap-5 sm:grid-cols-2">
        <FormField label="URL Slug" htmlFor="slug" required error={fieldErrors.slug} hint="e.g. floral-embroidered-kurti">
          <div className="flex gap-2">
            <AdminInput id="slug" value={form.slug} onChange={(v) => updateForm("slug", v)}
              placeholder="auto-generated" invalid={!!fieldErrors.slug} className="flex-1" />
            <button type="button" onClick={applySlug} disabled={!form.name}
              aria-label="Generate slug"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-[#8A5A6A] hover:text-[#8A5A6A] disabled:opacity-40">
              <Wand2 className="size-4" />
            </button>
          </div>
        </FormField>
        <FormField label="SKU" htmlFor="sku" required error={fieldErrors.sku} hint="Must be unique across catalog">
          <div className="flex gap-2">
            <AdminInput id="sku" value={form.sku} onChange={(v) => updateForm("sku", v)}
              placeholder="BC-KUR-FLO-123456" invalid={!!fieldErrors.sku} className="flex-1 font-mono text-xs" />
            <button type="button" onClick={applySku} disabled={!form.name && !form.category}
              aria-label="Generate SKU"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-[#8A5A6A] hover:text-[#8A5A6A] disabled:opacity-40">
              <Sparkles className="size-4" />
            </button>
          </div>
        </FormField>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <FormField label="Category" htmlFor="category" required error={fieldErrors.category}>
          <AdminInput id="category" value={form.category} onChange={(v) => updateForm("category", v)} placeholder="e.g. Kurties" invalid={!!fieldErrors.category} />
        </FormField>
        <FormField label="Collection" htmlFor="collection" required error={fieldErrors.collection}>
          <AdminInput id="collection" value={form.collection} onChange={(v) => updateForm("collection", v)} placeholder="e.g. Summer 2026" invalid={!!fieldErrors.collection} />
        </FormField>
      </div>

      <div className="grid gap-5 sm:grid-cols-3">
        <FormField label="Brand" htmlFor="brand" required error={fieldErrors.brand}>
          <AdminInput id="brand" value={form.brand} onChange={(v) => updateForm("brand", v)} placeholder="Bansari Collections" invalid={!!fieldErrors.brand} />
        </FormField>
        <FormField label="Fabric" htmlFor="fabric" required error={fieldErrors.fabric}>
          <AdminInput id="fabric" value={form.fabric} onChange={(v) => updateForm("fabric", v)} placeholder="e.g. Cotton" invalid={!!fieldErrors.fabric} />
        </FormField>
        <FormField label="Color" htmlFor="color" required error={fieldErrors.color}>
          <AdminInput id="color" value={form.color} onChange={(v) => updateForm("color", v)} placeholder="e.g. Teal" invalid={!!fieldErrors.color} />
        </FormField>
      </div>

      <FormField label="Available Sizes" htmlFor="sizes" required error={fieldErrors.sizes} hint="Comma-separated — e.g. XS, S, M, L, XL, XXL">
        <AdminInput id="sizes" value={form.sizes} onChange={(v) => updateForm("sizes", v)} placeholder="S, M, L, XL, XXL" invalid={!!fieldErrors.sizes} />
        {form.sizes.trim() && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {form.sizes.split(",").map((s) => s.trim()).filter(Boolean).map((s) => (
              <span key={s} className="rounded-full bg-[#8A5A6A]/10 px-2.5 py-0.5 text-[11px] font-semibold text-[#8A5A6A]">{s}</span>
            ))}
          </div>
        )}
      </FormField>
    </div>
  );
}

function StepPricing({ form, fieldErrors, updateForm }: {
  form: ProductFormState; fieldErrors: FieldErrors;
  updateForm: (id: keyof ProductFormState, v: string) => void;
}) {
  const margin = form.cost && form.price
    ? Math.round(((Number(form.price) - Number(form.cost)) / Number(form.price)) * 100)
    : null;
  const discount = form.comparePrice && form.price && Number(form.comparePrice) > Number(form.price)
    ? Math.round(((Number(form.comparePrice) - Number(form.price)) / Number(form.comparePrice)) * 100)
    : null;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-bold text-slate-900">Pricing & Inventory</h3>
        <p className="mt-1 text-sm text-slate-400">Set selling price, stock levels and tax details.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <FormField label="Selling Price" htmlFor="price" required error={fieldErrors.price}>
          <AdminInput id="price" type="number" value={form.price} onChange={(v) => updateForm("price", v)} placeholder="0" suffix="₹" invalid={!!fieldErrors.price} />
        </FormField>
        <FormField label="Compare Price" htmlFor="comparePrice" error={fieldErrors.comparePrice} hint="MRP — strikethrough on storefront">
          <AdminInput id="comparePrice" type="number" value={form.comparePrice} onChange={(v) => updateForm("comparePrice", v)} placeholder="0" suffix="₹" invalid={!!fieldErrors.comparePrice} />
        </FormField>
        <FormField label="Cost Price" htmlFor="cost" error={fieldErrors.cost} hint="Internal — not shown to customers">
          <AdminInput id="cost" type="number" value={form.cost} onChange={(v) => updateForm("cost", v)} placeholder="0" suffix="₹" invalid={!!fieldErrors.cost} />
        </FormField>
      </div>

      {(margin !== null || discount !== null) && (
        <div className="flex flex-wrap gap-2">
          {discount !== null && (
            <div className="flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
              <TrendingUp className="size-3.5" /> {discount}% discount shown to customers
            </div>
          )}
          {margin !== null && (
            <div className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
              {margin}% margin
            </div>
          )}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <FormField label="Stock" htmlFor="stock" required error={fieldErrors.stock}>
          <AdminInput id="stock" type="number" value={form.stock} onChange={(v) => updateForm("stock", v)} placeholder="0" suffix="units" invalid={!!fieldErrors.stock} />
        </FormField>
        <FormField label="HSN Code" htmlFor="hsn" required error={fieldErrors.hsn} hint="Harmonised System Nomenclature">
          <AdminInput id="hsn" value={form.hsn} onChange={(v) => updateForm("hsn", v)} placeholder="6211" invalid={!!fieldErrors.hsn} />
        </FormField>
        <FormField label="GST Rate" htmlFor="gst" error={fieldErrors.gst}>
          <AdminInput id="gst" type="number" value={form.gst} onChange={(v) => updateForm("gst", v)} placeholder="5" suffix="%" invalid={!!fieldErrors.gst} />
        </FormField>
      </div>

      {form.stock !== "" && (
        <div className={cn(
          "flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium",
          Number(form.stock) === 0
            ? "border-red-200 bg-red-50 text-red-700"
            : Number(form.stock) <= LOW_STOCK_THRESHOLD
            ? "border-amber-200 bg-amber-50 text-amber-700"
            : "border-emerald-200 bg-emerald-50 text-emerald-700"
        )}>
          <Package className="size-4 shrink-0" />
          {Number(form.stock) === 0 ? "Out of stock — product will be hidden from storefront"
            : Number(form.stock) <= LOW_STOCK_THRESHOLD ? `Low stock warning — only ${form.stock} units remaining`
            : `${form.stock} units available`}
        </div>
      )}
    </div>
  );
}

function StepContent({ form, fieldErrors, updateForm }: {
  form: ProductFormState; fieldErrors: FieldErrors;
  updateForm: (id: keyof ProductFormState, v: string) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-bold text-slate-900">Content & SEO</h3>
        <p className="mt-1 text-sm text-slate-400">Write a compelling description and optimise for search engines.</p>
      </div>

      <FormField label="Product Description" htmlFor="description" required error={fieldErrors.description}
        counter={{ current: form.description.length, max: 2000 }}>
        <AdminTextarea id="description" value={form.description} onChange={(v) => updateForm("description", v)}
          placeholder="Describe the product — fabric feel, fit, occasion, care instructions, what makes it special…"
          rows={7} minHeight="160px" invalid={!!fieldErrors.description} />
      </FormField>

      <div className="h-px bg-slate-100" />

      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <LayoutGrid className="size-3.5 text-slate-400" />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Search Engine Preview</span>
        </div>
        {(form.seoTitle || form.seoDescription) && (
          <div className="mt-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="truncate text-sm font-semibold text-blue-700">{form.seoTitle || "SEO title…"}</p>
            <p className="mt-0.5 text-xs text-emerald-700">bansaricollections.in › products › {form.slug || "product-slug"}</p>
            <p className="mt-1 line-clamp-2 text-xs text-slate-500 leading-relaxed">{form.seoDescription || "SEO description…"}</p>
          </div>
        )}
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <FormField label="SEO Title" htmlFor="seoTitle" required error={fieldErrors.seoTitle}
          counter={{ current: form.seoTitle.length, max: 70 }}>
          <AdminInput id="seoTitle" value={form.seoTitle} onChange={(v) => updateForm("seoTitle", v)}
            placeholder="Buy Floral Kurti Online | Bansari Collections" invalid={!!fieldErrors.seoTitle} />
        </FormField>
        <FormField label="SEO Description" htmlFor="seoDescription" required error={fieldErrors.seoDescription}
          counter={{ current: form.seoDescription.length, max: 160 }}>
          <AdminInput id="seoDescription" value={form.seoDescription} onChange={(v) => updateForm("seoDescription", v)}
            placeholder="Shop this beautiful floral embroidered kurti…" invalid={!!fieldErrors.seoDescription} />
        </FormField>
      </div>
    </div>
  );
}

function StepVisibility({ form, onToggle }: {
  form: ProductFormState;
  onToggle: (id: ToggleFieldId, checked: boolean) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-bold text-slate-900">Visibility & Status</h3>
        <p className="mt-1 text-sm text-slate-400">Control how and where this product appears on your store.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <ToggleCard id="active" label="Published" description="Visible to customers on storefront" checked={form.active} onChange={onToggle} />
        <ToggleCard id="featured" label="Featured" description="Shown in featured collections and homepage" checked={form.featured} onChange={onToggle} />
        <ToggleCard id="newArrival" label="New Arrival" description="Highlighted in new arrivals section" checked={form.newArrival} onChange={onToggle} />
        <ToggleCard id="bestSeller" label="Best Seller" description="Shown in best sellers and trending" checked={form.bestSeller} onChange={onToggle} />
      </div>
      <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
        <p className="text-xs text-slate-500 leading-relaxed">
          <strong className="font-semibold text-slate-700">Tip:</strong> A product must be Published to appear on the storefront.
          Featured, New Arrival and Best Seller flags are only visible when Published is enabled.
        </p>
      </div>
    </div>
  );
}

// ─── Wizard Step Bar ──────────────────────────────────────────────────────────

function WizardStepBar({ step, maxStep, onStep }: { step: number; maxStep: number; onStep: (s: number) => void }) {
  return (
    <div className="flex items-center gap-1" role="tablist" aria-label="Form steps">
      {STEPS.map((s, i) => {
        const Icon = s.icon;
        const done = i < step;
        const active = i === step;
        const reachable = i <= maxStep;
        return (
          <button key={s.id} type="button"
            role="tab" aria-selected={active} aria-label={s.label}
            disabled={!reachable}
            onClick={() => reachable && onStep(i)}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 rounded-xl py-2.5 transition-all duration-200",
              active ? "bg-[#8A5A6A] text-white shadow-md" :
              done ? "bg-[#8A5A6A]/10 text-[#8A5A6A] hover:bg-[#8A5A6A]/20" :
              "bg-slate-50 text-slate-300 cursor-default"
            )}>
            <Icon className="size-4" />
            <span className="hidden text-[10px] font-semibold sm:block">{s.short}</span>
            {done && !active && <CheckCircle2 className="size-2.5" />}
          </button>
        );
      })}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ProductManagement() {
  // Supabase client — only used for Storage (image upload). No DB calls.
  const supabase = createClient();

  // ── Product list state ────────────────────────────────────────────────────────
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  // ── Catalog state (categories derived from products) ──────────────────────────
  const [catalogCategories, setCatalogCategories] = useState<string[]>([]);

  // ── Sheet state ───────────────────────────────────────────────────────────────
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductFormState>(emptyForm);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  const [wizardStep, setWizardStep] = useState(0);
  const [wizardMaxStep, setWizardMaxStep] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // ── Dialog state ──────────────────────────────────────────────────────────────
  const [viewProduct, setViewProduct] = useState<Product | null>(null);
  const [deleteProduct, setDeleteProduct] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ── Abort controller ref for stale-request cancellation ───────────────────────
  const listAbortRef = useRef<AbortController | null>(null);

  // ── Debounce search ───────────────────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // ── Load products via Admin API ───────────────────────────────────────────────
  const loadProducts = useCallback(async (pageIndex = 0) => {
    // Cancel any in-flight request
    listAbortRef.current?.abort();
    const controller = new AbortController();
    listAbortRef.current = controller;

    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(pageIndex));
      params.set("pageSize", String(PAGE_SIZE));
      params.set("sortBy", "created_at");
      params.set("sortDir", "desc");
      if (debouncedSearch.trim()) params.set("q", debouncedSearch.trim());
      if (filterCategory) params.set("category", filterCategory);
      if (filterStatus === "active") params.set("active", "true");
      if (filterStatus === "inactive") params.set("active", "false");
      if (filterStatus === "low") { params.set("minStock", "1"); params.set("maxStock", String(LOW_STOCK_THRESHOLD)); }
      if (filterStatus === "out") { params.set("minStock", "0"); params.set("maxStock", "0"); }

      const res = await apiFetch<ApiListResponse>(
        `/api/admin/products?${params.toString()}`,
        { method: "GET" },
        controller.signal,
      );

      const mapped = (res.data ?? []).map(mapApiProduct);
      setProducts(pageIndex === 0 ? mapped : (prev) => [...prev, ...mapped]);
      setTotal(res.total ?? 0);
      setPage(pageIndex);

      // Derive categories for filter dropdown
      if (pageIndex === 0) {
        setCatalogCategories((prev) => {
          const set = new Set([...prev, ...mapped.map((p) => p.category).filter(Boolean)]);
          return Array.from(set).sort();
        });
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      const msg = err instanceof Error ? err.message : "Failed to load products";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, filterCategory, filterStatus]);

  useEffect(() => { void loadProducts(0); }, [loadProducts]);

  const hasMore = useMemo(() => total > (page + 1) * PAGE_SIZE, [total, page]);

  // ── Stats (derived from current page — accurate for visible products) ──────────
  const stats = useMemo(() => ({
    total,
    active: products.filter((p) => p.active).length,
    lowStock: products.filter((p) => p.stock > 0 && p.stock <= LOW_STOCK_THRESHOLD).length,
    outOfStock: products.filter((p) => p.stock === 0).length,
  }), [products, total]);

  // ── Form helpers ──────────────────────────────────────────────────────────────

  const updateForm = useCallback((id: keyof ProductFormState, v: string) => {
    setForm((prev) => ({ ...prev, [id]: v }));
    setFieldErrors((prev) => { const next = { ...prev }; delete next[id]; return next; });
  }, []);

  const toggleField = useCallback((id: ToggleFieldId, checked: boolean) => {
    setForm((prev) => ({ ...prev, [id]: checked }));
  }, []);

  const applySlug = useCallback(() => {
    setForm((prev) => ({ ...prev, slug: slugify(prev.name) }));
  }, []);

  const applySku = useCallback(() => {
    setForm((prev) => ({ ...prev, sku: generateSku(prev.category, prev.name) }));
  }, []);

  // ── Image upload — Supabase Storage (stays client-side per spec) ──────────────

  const uploadFiles = useCallback(async (files: FileList | File[]) => {
    const list = Array.from(files);
    const valid = list.filter((f) => {
      if (!ALLOWED_MIME_TYPES.includes(f.type)) { toast.error(`${f.name}: unsupported file type`); return false; }
      if (f.size > MAX_FILE_SIZE_BYTES) { toast.error(`${f.name}: exceeds 5 MB limit`); return false; }
      return true;
    });
    if (!valid.length) return;
    setUploading(true);
    try {
      const uploaded: ProductImage[] = [];
      for (const file of valid) {
        const path = buildStoragePath(file);
        const { error: upErr } = await supabase.storage.from(PRODUCT_IMAGES_BUCKET).upload(path, file, { upsert: false });
        if (upErr) { toast.error(`${file.name}: ${upErr.message}`); continue; }
        const { data: { publicUrl } } = supabase.storage.from(PRODUCT_IMAGES_BUCKET).getPublicUrl(path);
        uploaded.push({ url: publicUrl, alt: file.name.split(".")[0] || "Product image" });
      }
      if (uploaded.length) {
        setForm((prev) => ({ ...prev, images: [...prev.images, ...uploaded] }));
        toast.success(`${uploaded.length} image${uploaded.length > 1 ? "s" : ""} uploaded`);
      }
    } finally {
      setUploading(false);
    }
  }, [supabase]);

  const removeImage = useCallback((url: string) => {
    setForm((prev) => ({ ...prev, images: prev.images.filter((i) => i.url !== url) }));
  }, []);

  // ── Drag & drop ───────────────────────────────────────────────────────────────

  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); }, []);
  const handleDragEnter = useCallback((e: React.DragEvent) => { e.preventDefault(); setDragOver(true); }, []);
  const handleDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); setDragOver(false); }, []);
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    if (e.dataTransfer.files.length) void uploadFiles(e.dataTransfer.files);
  }, [uploadFiles]);
  const handleDropZoneClick = useCallback(() => { fileInputRef.current?.click(); }, []);
  const handleDropZoneKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileInputRef.current?.click(); }
  }, []);

  // ── Open sheet ────────────────────────────────────────────────────────────────

  const openCreateSheet = useCallback(() => {
    setEditingProduct(null);
    setForm(emptyForm);
    setFieldErrors({});
    setWizardStep(0);
    setWizardMaxStep(0);
    setSheetOpen(true);
  }, []);

  const openEditSheet = useCallback((product: Product) => {
    setEditingProduct(product);
    setForm(productToForm(product));
    setFieldErrors({});
    setWizardStep(0);
    setWizardMaxStep(STEPS.length - 1);
    setSheetOpen(true);
  }, []);

  // ── Wizard navigation ─────────────────────────────────────────────────────────

  const goToStep = useCallback((target: number) => {
    setWizardStep(target);
    setWizardMaxStep((prev) => Math.max(prev, target));
  }, []);

  const handleNext = useCallback(() => {
    if (wizardStep < STEPS.length - 1) goToStep(wizardStep + 1);
  }, [wizardStep, goToStep]);

  const handlePrev = useCallback(() => {
    if (wizardStep > 0) setWizardStep((s) => s - 1);
  }, [wizardStep]);

  // ── Save — POST /api/admin/products or PUT /api/admin/products/[id] ───────────

  const handleSave = useCallback(async () => {
    const parsed = prepareForm(form);
    if (!parsed.success) {
      const errors: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof ProductFormState;
        if (!errors[key]) errors[key] = issue.message;
      }
      setFieldErrors(errors);
      for (const stepDef of STEPS) {
        if (stepDef.fields.some((f) => errors[f])) {
          setWizardStep(stepDef.id);
          break;
        }
      }
      toast.error("Please fix the highlighted fields.");
      return;
    }

    setSaving(true);
    try {
      const payload = toApiPayload(parsed.data);

      if (editingProduct) {
        await apiFetch<ApiSingleResponse>(
          `/api/admin/products/${editingProduct.id}`,
          { method: "PUT", body: JSON.stringify(payload) },
        );
        toast.success("Product updated successfully.");
      } else {
        await apiFetch<ApiSingleResponse>(
          `/api/admin/products`,
          { method: "POST", body: JSON.stringify(payload) },
        );
        toast.success("Product created successfully.");
      }

      setSheetOpen(false);
      void loadProducts(0);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save product";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }, [form, editingProduct, loadProducts]);

  // ── Delete — DELETE /api/admin/products/[id] ──────────────────────────────────

  const handleDelete = useCallback(async () => {
    if (!deleteProduct) return;
    setDeleting(true);
    try {
      await apiFetch<{ success: boolean }>(
        `/api/admin/products/${deleteProduct.id}`,
        { method: "DELETE" },
      );
      toast.success(`"${deleteProduct.name}" deleted.`);
      setDeleteProduct(null);
      void loadProducts(0);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to delete product";
      toast.error(msg);
    } finally {
      setDeleting(false);
    }
  }, [deleteProduct, loadProducts]);

  // ── Completeness ──────────────────────────────────────────────────────────────

  const completeness = useMemo(() => computeCompleteness(form), [form]);

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#faf9f7] px-4 py-8 sm:px-6 lg:px-8">
      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" multiple accept={ALLOWED_MIME_TYPES.join(",")}
        className="hidden" onChange={(e) => { if (e.target.files) void uploadFiles(e.target.files); }} />

      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Products</h1>
          <p className="mt-0.5 text-sm text-slate-500">Manage your catalogue — add, edit and control visibility.</p>
        </div>
        <Button onClick={openCreateSheet}
          className="inline-flex items-center gap-2 rounded-xl bg-[#8A5A6A] px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-[#7a4a5a]">
          <Plus className="size-4" /> Add Product
        </Button>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatPill icon={<ShoppingBag className="size-5" />} label="Total" value={stats.total} color="border-slate-200 bg-white text-slate-800" />
        <StatPill icon={<CheckCircle2 className="size-5" />} label="Active" value={stats.active} color="border-emerald-200 bg-emerald-50 text-emerald-800" />
        <StatPill icon={<AlertTriangle className="size-5" />} label="Low Stock" value={stats.lowStock} color="border-amber-200 bg-amber-50 text-amber-800" />
        <StatPill icon={<Package className="size-5" />} label="Out of Stock" value={stats.outOfStock} color="border-red-200 bg-red-50 text-red-800" />
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-300" />
          <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search products…" aria-label="Search products"
            className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-4 text-sm text-slate-900 placeholder:text-slate-300 outline-none transition focus:border-[#8A5A6A] focus:ring-2 focus:ring-[#8A5A6A]/20 shadow-sm" />
        </div>
        <FilterSelect value={filterCategory} onChange={setFilterCategory} aria-label="Filter by category">
          <option value="">All categories</option>
          {catalogCategories.map((c) => <option key={c} value={c}>{c}</option>)}
        </FilterSelect>
        <FilterSelect value={filterStatus} onChange={setFilterStatus} aria-label="Filter by status">
          <option value="">All status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="low">Low stock</option>
          <option value="out">Out of stock</option>
        </FilterSelect>
        <button type="button" onClick={() => void loadProducts(0)} aria-label="Refresh products"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-[#8A5A6A] hover:text-[#8A5A6A]">
          <RefreshCw className="size-4" />
        </button>
      </div>

      {/* Grid */}
      {loading && products.length === 0 ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-[#8A5A6A]/10">
            <ShoppingBag className="size-10 text-[#8A5A6A]/40" />
          </div>
          <h3 className="mt-5 text-lg font-bold text-slate-900">No products yet</h3>
          <p className="mt-2 max-w-sm text-sm text-slate-400">Add your first product to start building your catalogue.</p>
          <Button onClick={openCreateSheet} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#8A5A6A] px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-[#7a4a5a]">
            <Plus className="size-4" /> Add First Product
          </Button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {products.map((p) => (
              <ProductCard key={p.id} product={p}
                onView={setViewProduct} onEdit={openEditSheet} onDelete={setDeleteProduct} />
            ))}
          </div>
          {hasMore && (
            <div className="mt-8 flex justify-center">
              <Button onClick={() => void loadProducts(page + 1)} disabled={loading}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-[#8A5A6A] hover:text-[#8A5A6A]">
                {loading ? <Loader2 className="size-4 animate-spin" /> : null}
                Load more
              </Button>
            </div>
          )}
        </>
      )}

      {/* ── Add / Edit Sheet ──────────────────────────────────────────────────── */}
      <Sheet open={sheetOpen} onOpenChange={(open) => { if (!open && !saving) setSheetOpen(false); }}>
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl"
        >
          {/* Sheet header */}
          <SheetHeader className="shrink-0 border-b border-slate-100 px-6 py-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <SheetTitle className="text-lg font-bold text-slate-900">
                  {editingProduct ? "Edit Product" : "New Product"}
                </SheetTitle>
                <SheetDescription className="mt-1 text-xs text-slate-400">
                  {editingProduct ? `Editing · ${editingProduct.name}` : "Fill in the details to add a product to your catalogue."}
                </SheetDescription>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1.5">
                <span className="text-[11px] font-semibold text-slate-400">Completeness</span>
                <div className="w-32">
                  <CompletenessBar pct={completeness} />
                </div>
              </div>
            </div>
            <div className="mt-4">
              <WizardStepBar step={wizardStep} maxStep={wizardMaxStep} onStep={goToStep} />
            </div>
          </SheetHeader>

          {/* Step content */}
          <div className="flex-1 overflow-y-auto px-6 py-6">
            {wizardStep === 0 && (
              <StepMedia
                form={form} fieldErrors={fieldErrors} uploading={uploading} dragOver={dragOver}
                fileInputRef={fileInputRef}
                onDragOver={handleDragOver} onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave} onDrop={handleDrop}
                onClick={handleDropZoneClick} onKeyDown={handleDropZoneKeyDown}
                onRemove={removeImage}
              />
            )}
            {wizardStep === 1 && (
              <StepBasicInfo
                form={form} fieldErrors={fieldErrors}
                updateForm={updateForm} applySlug={applySlug} applySku={applySku}
              />
            )}
            {wizardStep === 2 && (
              <StepPricing form={form} fieldErrors={fieldErrors} updateForm={updateForm} />
            )}
            {wizardStep === 3 && (
              <StepContent form={form} fieldErrors={fieldErrors} updateForm={updateForm} />
            )}
            {wizardStep === 4 && (
              <StepVisibility form={form} onToggle={toggleField} />
            )}
          </div>

          {/* Sheet footer */}
          <SheetFooter className="shrink-0 border-t border-slate-100 px-6 py-4">
            <div className="flex w-full items-center justify-between gap-3">
              <button type="button" onClick={handlePrev} disabled={wizardStep === 0}
                className="flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-40">
                <ChevronLeft className="size-4" /> Back
              </button>
              <div className="flex items-center gap-2">
                {wizardStep < STEPS.length - 1 ? (
                  <button type="button" onClick={handleNext}
                    className="flex h-9 items-center gap-1.5 rounded-lg bg-[#8A5A6A] px-4 text-sm font-semibold text-white shadow transition hover:bg-[#7a4a5a]">
                    Next <ChevronRight className="size-4" />
                  </button>
                ) : (
                  <button type="button" onClick={() => void handleSave()} disabled={saving}
                    className="flex h-9 min-w-[110px] items-center justify-center gap-2 rounded-lg bg-[#8A5A6A] px-5 text-sm font-semibold text-white shadow transition hover:bg-[#7a4a5a] disabled:opacity-60">
                    {saving ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
                    {saving ? "Saving…" : editingProduct ? "Save Changes" : "Publish Product"}
                  </button>
                )}
              </div>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ── View Dialog ───────────────────────────────────────────────────────── */}
      <Dialog open={!!viewProduct} onOpenChange={(open) => { if (!open) setViewProduct(null); }}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          {viewProduct && (
            <>
              <DialogHeader>
                <div className="flex items-start gap-3">
                  <Badge className={cn("mt-0.5 shrink-0 rounded-full px-2.5 text-[10px] font-bold uppercase",
                    viewProduct.active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500")}>
                    {viewProduct.active ? "Live" : "Draft"}
                  </Badge>
                  <div>
                    <DialogTitle className="text-lg font-bold text-slate-900">{viewProduct.name}</DialogTitle>
                    <DialogDescription className="font-mono text-xs">{viewProduct.sku}</DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              {/* Images */}
              {viewProduct.images.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {viewProduct.images.slice(0, 6).map((img, i) => (
                    <div key={img.url} className={cn("relative overflow-hidden rounded-xl bg-slate-100",
                      i === 0 ? "col-span-2 row-span-2 aspect-[4/5]" : "aspect-square")}>
                      <Image src={img.url} alt={img.alt} fill sizes="300px" className="object-cover" />
                    </div>
                  ))}
                </div>
              )}

              {/* Details */}
              <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                <Detail label="Category" value={viewProduct.category} />
                <Detail label="Collection" value={viewProduct.collection} />
                <Detail label="Brand" value={viewProduct.brand} />
                <Detail label="Fabric" value={viewProduct.fabric} />
                <Detail label="Color" value={viewProduct.color} />
                <Detail label="Sizes" value={viewProduct.sizes.join(", ")} />
                <Detail label="Price" value={formatCurrency(viewProduct.price)} />
                <Detail label="Compare Price" value={viewProduct.comparePrice ? formatCurrency(viewProduct.comparePrice) : "—"} />
                <Detail label="Stock" value={String(viewProduct.stock)} />
                <Detail label="HSN" value={viewProduct.hsn} />
                <Detail label="GST" value={`${viewProduct.gst}%`} />
                <Detail label="Slug" value={viewProduct.slug} />
              </dl>

              {/* Description */}
              {viewProduct.description && (
                <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Description</p>
                  <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">{viewProduct.description}</p>
                </div>
              )}

              {/* Flags */}
              <div className="flex flex-wrap gap-2">
                {viewProduct.featured && <span className="rounded-full bg-[#8A5A6A]/10 px-3 py-1 text-xs font-semibold text-[#8A5A6A]">Featured</span>}
                {viewProduct.newArrival && <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">New Arrival</span>}
                {viewProduct.bestSeller && <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">Best Seller</span>}
              </div>

              <DialogFooter className="flex-row gap-2">
                <Button variant="outline" onClick={() => setViewProduct(null)} className="flex-1">
                  Close
                </Button>
                <Button onClick={() => { setViewProduct(null); openEditSheet(viewProduct); }}
                  className="flex-1 bg-[#8A5A6A] text-white hover:bg-[#7a4a5a]">
                  <Edit className="mr-1.5 size-4" /> Edit Product
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirm Dialog ─────────────────────────────────────────────── */}
      <Dialog open={!!deleteProduct} onOpenChange={(open) => { if (!open && !deleting) setDeleteProduct(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="size-5" /> Delete Product
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete{" "}
              <strong className="text-slate-900">&quot;{deleteProduct?.name}&quot;</strong>?{" "}
              This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-row gap-2">
            <Button variant="outline" onClick={() => setDeleteProduct(null)} disabled={deleting} className="flex-1">
              Cancel
            </Button>
            <Button onClick={() => void handleDelete()} disabled={deleting}
              className="flex-1 bg-red-500 text-white hover:bg-red-600">
              {deleting ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : <Trash2 className="mr-1.5 size-4" />}
              {deleting ? "Deleting…" : "Yes, Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
