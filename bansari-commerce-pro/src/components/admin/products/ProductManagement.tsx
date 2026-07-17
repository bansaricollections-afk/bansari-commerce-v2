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

const PRODUCTS_TABLE = "products";
const PRODUCT_IMAGES_BUCKET = "product-images";
const PAGE_SIZE = 12;
const LOW_STOCK_THRESHOLD = 5;
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
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
type ToggleFieldId = keyof Pick<ProductFormState, "featured" | "newArrival" | "bestSeller" | "active">;

// ─── Wizard steps ─────────────────────────────────────────────────────────────

const STEPS = [
  { id: 0, label: "Media",      short: "Media",    icon: Camera,      fields: [] as (keyof ProductFormState)[] },
  { id: 1, label: "Basic Info", short: "Info",     icon: Tag,         fields: ["name","slug","sku","category","collection","brand","fabric","color","sizes"] as (keyof ProductFormState)[] },
  { id: 2, label: "Pricing",    short: "Price",    icon: DollarSign,  fields: ["price","stock","hsn"] as (keyof ProductFormState)[] },
  { id: 3, label: "Content",    short: "Content",  icon: FileText,    fields: ["description","seoTitle","seoDescription"] as (keyof ProductFormState)[] },
  { id: 4, label: "Visibility", short: "Publish",  icon: Settings2,   fields: [] as (keyof ProductFormState)[] },
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

function getString(row: DbProductRecord, key: string, fallback = "") {
  const value = row[key];
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return fallback;
}
function getNumber(row: DbProductRecord, key: string, fallback = 0) {
  const value = row[key];
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") { const p = Number(value); return Number.isFinite(p) ? p : fallback; }
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
  if (Array.isArray(value)) return value.filter((i): i is string => typeof i === "string").filter(Boolean);
  if (typeof value === "string") return value.split(",").map((i) => i.trim()).filter(Boolean);
  return [];
}
function parseImages(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const r = item as Record<string, unknown>;
    const url = r.url; const alt = r.alt;
    if (typeof url !== "string" || !url) return [];
    return [{ url, alt: typeof alt === "string" && alt ? alt : "Product image" }];
  });
}
function mapProduct(row: DbProductRecord): Product {
  return {
    id: getNumber(row, "id"), name: getString(row, "name"), sku: getString(row, "sku"),
    slug: getString(row, "slug"), category: getString(row, "category"),
    collection: getString(row, "collection"), brand: getString(row, "brand", "Bansari Collections"),
    fabric: getString(row, "fabric"), color: getString(row, "color"),
    sizes: parseSizes(row.sizes), price: getNumber(row, "price"),
    comparePrice: getOptionalNumber(row, "compare_price"), cost: getOptionalNumber(row, "cost"),
    stock: getNumber(row, "stock"), hsn: getString(row, "hsn"), gst: getNumber(row, "gst", 5),
    description: getString(row, "description"), seoTitle: getString(row, "seo_title"),
    seoDescription: getString(row, "seo_description"), featured: getBoolean(row, "featured"),
    newArrival: getBoolean(row, "new_arrival"), bestSeller: getBoolean(row, "best_seller"),
    active: getBoolean(row, "active", true), images: parseImages(row.images),
    createdAt: getString(row, "created_at", undefined), updatedAt: getString(row, "updated_at", undefined),
  };
}
function productToForm(product: Product): ProductFormState {
  return {
    name: product.name, sku: product.sku, slug: product.slug,
    category: product.category, collection: product.collection, brand: product.brand,
    fabric: product.fabric, color: product.color, sizes: product.sizes.join(", "),
    price: String(product.price), comparePrice: product.comparePrice ? String(product.comparePrice) : "",
    cost: product.cost ? String(product.cost) : "", stock: String(product.stock),
    hsn: product.hsn, gst: String(product.gst), description: product.description,
    seoTitle: product.seoTitle, seoDescription: product.seoDescription,
    featured: product.featured, newArrival: product.newArrival,
    bestSeller: product.bestSeller, active: product.active, images: product.images,
  };
}
function toPayload(product: ValidProductForm): DbProductRecord {
  return {
    name: product.name, sku: product.sku, slug: product.slug,
    category: product.category, collection: product.collection, brand: product.brand,
    fabric: product.fabric, color: product.color, sizes: product.sizes,
    price: product.price, compare_price: product.comparePrice ?? null,
    cost: product.cost ?? null, stock: product.stock, hsn: product.hsn,
    gst: product.gst, description: product.description, seo_title: product.seoTitle,
    seo_description: product.seoDescription, featured: product.featured,
    new_arrival: product.newArrival, best_seller: product.bestSeller,
    active: product.active, images: product.images, updated_at: new Date().toISOString(),
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
  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-base font-bold text-slate-900">Product Images</h3>
        <p className="mt-1 text-sm text-slate-400">Upload high-quality images. The first image becomes the cover photo.</p>
      </div>

      {/* Drop zone */}
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

      {/* Image grid */}
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

      {/* Name */}
      <FormField label="Product Name" htmlFor="name" required error={fieldErrors.name}>
        <AdminInput id="name" value={form.name} onChange={(v) => updateForm("name", v)}
          placeholder="e.g. Floral Embroidered Kurti" invalid={!!fieldErrors.name} />
      </FormField>

      {/* Slug + SKU */}
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

      {/* Category + Collection */}
      <div className="grid gap-5 sm:grid-cols-2">
        <FormField label="Category" htmlFor="category" required error={fieldErrors.category}>
          <AdminInput id="category" value={form.category} onChange={(v) => updateForm("category", v)} placeholder="e.g. Kurties" invalid={!!fieldErrors.category} />
        </FormField>
        <FormField label="Collection" htmlFor="collection" required error={fieldErrors.collection}>
          <AdminInput id="collection" value={form.collection} onChange={(v) => updateForm("collection", v)} placeholder="e.g. Summer 2026" invalid={!!fieldErrors.collection} />
        </FormField>
      </div>

      {/* Brand + Fabric + Color */}
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

      {/* Sizes */}
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

      {/* Price trio */}
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

      {/* Live margin/discount chips */}
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

      {/* Stock + Tax */}
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

      {/* Stock status visual */}
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
          <span className="text-[