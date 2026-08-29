"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  Edit,
  Eye,
  ImagePlus,
  Layers,
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
  ChevronDown,
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
import { logAdminSavePayload } from "@/lib/debug/product-debug";

// ─── Constants ────────────────────────────────────────────────────────────────

const PRODUCT_IMAGES_BUCKET = "product-images";
const PAGE_SIZE = 12;
const LOW_STOCK_THRESHOLD = 5;
const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024;

/*
 * VIDEO LIMITS — deliberately strict.
 *
 * Product clips are served straight from Supabase storage: Vercel does not
 * optimise video, so every play is raw egress against a small free-tier
 * allowance. A single unconstrained 15MB clip watched a few hundred times
 * would exhaust a month of bandwidth and start failing requests — the same
 * class of silent breakage the image-transformation quota just caused.
 *
 * These caps keep a clip to roughly the weight of one product photo. An 8
 * second 720p H.264 export lands comfortably under 3MB.
 */
const ALLOWED_VIDEO_MIME_TYPES = ["video/mp4", "video/webm"];
const MAX_VIDEO_SIZE_BYTES = 3 * 1024 * 1024;
const MAX_VIDEO_DURATION_SECONDS = 8;

/**
 * Read a video's duration without uploading it.
 *
 * Size alone is not a sufficient guard: a heavily compressed two-minute clip
 * can sit under the byte cap while being entirely wrong for a product page.
 * Resolves null when the browser cannot read the metadata, and the caller
 * treats that as acceptable rather than blocking a valid upload on a codec
 * quirk.
 */
function readVideoDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const probe = document.createElement("video");
    probe.preload = "metadata";
    const done = (value: number | null) => {
      URL.revokeObjectURL(url);
      resolve(value);
    };
    probe.onloadedmetadata = () =>
      done(Number.isFinite(probe.duration) ? probe.duration : null);
    probe.onerror = () => done(null);
    probe.src = url;
  });
}
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const SEARCH_DEBOUNCE_MS = 350;

// ─── Catalog lookup types ──────────────────────────────────────────────────────

type LookupItem = { id: number; name: string; slug: string; displayOrder?: number; active?: boolean };
type ColorItem  = LookupItem & { hex?: string };
type SubcatItem = LookupItem & { categoryId: number };
// slug is optional in the DB record but LookupSelect requires it; we default to ""
type SizeChartItem = { id: number; name: string; slug?: string; description?: string };

type CatalogData = {
  categories:    LookupItem[];
  subcategories: SubcatItem[];
  collections:   LookupItem[];
  sizeCharts:    SizeChartItem[];
  attrs: {
    fabric:   LookupItem[];
    color:    ColorItem[];
    occasion: LookupItem[];
    pattern:  LookupItem[];
    fit:      LookupItem[];
    sleeve:   LookupItem[];
    neck:     LookupItem[];
    work:     LookupItem[];
    length:   LookupItem[];
  };
};

const emptyCatalog: CatalogData = {
  categories: [], subcategories: [], collections: [], sizeCharts: [],
  attrs: { fabric: [], color: [], occasion: [], pattern: [], fit: [], sleeve: [], neck: [], work: [], length: [] },
};

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
  category_id: z.number().nullable().refine((v) => v !== null, {
    message: "Select a category from the catalog — a text-only match is not enough.",
  }),
  collection: z.string().trim().min(1, "Collection is required."),
  collection_id: z.number().nullable().refine((v) => v !== null, {
    message: "Select a collection from the catalog — a text-only match is not enough.",
  }),
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
  /** Explicit intent: sold through size variants. Never inferred. */
  isSizeManaged: boolean;
  images: ProductImage[];
  createdAt?: string;
  updatedAt?: string;
  // V2 FK fields (may be absent on legacy rows)
  category_id?: number | null;
  subcategory_id?: number | null;
  collection_id?: number | null;
  size_chart_id?: number | null;
  attr_fabric_id?: number | null;
  attr_color_id?: number | null;
  attr_occasion_id?: number | null;
  attr_pattern_id?: number | null;
  attr_fit_id?: number | null;
  attr_sleeve_id?: number | null;
  attr_neck_id?: number | null;
  attr_work_id?: number | null;
  attr_length_id?: number | null;
  // Phase 1B — model / sizing copy (stored inside specifications JSONB)
  specifications?: {
    modelInfo?: string | null;
    sizeWorn?: string | null;
    fitGuidance?: string | null;
    [key: string]: unknown;
  } | null;
};

type ProductFormState = {
  name: string;
  sku: string;
  slug: string;
  // text display fields (written from dropdown selection)
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
  /** Explicit intent: sold through size variants. Never inferred. */
  isSizeManaged: boolean;
  images: ProductImage[];
  // V2 FK IDs
  category_id: number | null;
  subcategory_id: number | null;
  collection_id: number | null;
  size_chart_id: number | null;
  attr_fabric_id: number | null;
  attr_color_id: number | null;
  attr_occasion_id: number | null;
  attr_pattern_id: number | null;
  attr_fit_id: number | null;
  attr_sleeve_id: number | null;
  attr_neck_id: number | null;
  attr_work_id: number | null;
  attr_length_id: number | null;
  // Phase 1B — specifications sub-fields (flat in form state, nested in payload)
  spec_modelInfo: string;
  spec_sizeWorn: string;
  spec_fitGuidance: string;
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
  is_size_managed: boolean;
  images: ProductImage[];
  // V2 FK IDs
  category_id: number | null;
  subcategory_id: number | null;
  collection_id: number | null;
  size_chart_id: number | null;
  attr_fabric_id: number | null;
  attr_color_id: number | null;
  attr_occasion_id: number | null;
  attr_pattern_id: number | null;
  attr_fit_id: number | null;
  attr_sleeve_id: number | null;
  attr_neck_id: number | null;
  attr_work_id: number | null;
  attr_length_id: number | null;
  // Phase 1B — merged into existing specifications JSONB
  specifications: {
    modelInfo: string;
    sizeWorn: string;
    fitGuidance: string;
    [key: string]: unknown;
  };
};

type FieldErrors = Partial<Record<keyof ProductFormState, string>>;
type ToggleFieldId = keyof Pick<ProductFormState, "featured" | "newArrival" | "bestSeller" | "active" | "isSizeManaged">;

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
  category_id?: number | null;
  subcategory_id?: number | null;
  collection_id?: number | null;
  size_chart_id?: number | null;
  attr_fabric_id?: number | null;
  attr_color_id?: number | null;
  attr_occasion_id?: number | null;
  attr_pattern_id?: number | null;
  attr_fit_id?: number | null;
  attr_sleeve_id?: number | null;
  attr_neck_id?: number | null;
  attr_work_id?: number | null;
  attr_length_id?: number | null;
  // Phase 1B — specifications JSONB (may be absent on legacy rows)
  specifications?: {
    modelInfo?: string | null;
    sizeWorn?: string | null;
    fitGuidance?: string | null;
    [key: string]: unknown;
  } | null;
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
  isSizeManaged: false,
  images: [],
  category_id: null, subcategory_id: null, collection_id: null, size_chart_id: null,
  attr_fabric_id: null, attr_color_id: null, attr_occasion_id: null,
  attr_pattern_id: null, attr_fit_id: null, attr_sleeve_id: null,
  attr_neck_id: null, attr_work_id: null, attr_length_id: null,
  // Phase 1B
  spec_modelInfo: "",
  spec_sizeWorn: "",
  spec_fitGuidance: "",
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
  const nameCode = name.replace(/[^a-zA-Z0-9]/g, "").slice(0, 4).toUpperCase() || "ITEM";
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `${categoryCode}-${nameCode}-${randomSuffix}`;
}

function normalizeImages(raw: unknown): ProductImage[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (item): item is ProductImage =>
      typeof item === "object" && item !== null &&
      typeof (item as ProductImage).url === "string" &&
      typeof (item as ProductImage).alt === "string"
  );
}

function mapApiProductToForm(p: ApiProductRecord): ProductFormState {
  const rawSizes = p.sizes;
  const sizesStr = Array.isArray(rawSizes)
    ? rawSizes.join(", ")
    : typeof rawSizes === "string" ? rawSizes : "";
  const specs = p.specifications ?? {};
  return {
    name:           p.name ?? "",
    sku:            p.sku ?? "",
    slug:           p.slug ?? "",
    category:       p.category ?? "",
    collection:     p.collection ?? "",
    brand:          p.brand ?? "Bansari Collections",
    fabric:         p.fabric ?? "",
    color:          p.color ?? "",
    sizes:          sizesStr,
    price:          String(p.price ?? ""),
    comparePrice:   p.compare_price != null ? String(p.compare_price) : "",
    cost:           p.cost != null ? String(p.cost) : "",
    stock:          String(p.stock ?? ""),
    hsn:            p.hsn ?? "",
    gst:            String(p.gst ?? "5"),
    description:    p.description ?? "",
    seoTitle:       p.seo_title ?? "",
    seoDescription: p.seo_description ?? "",
    featured:       p.featured ?? false,
    newArrival:     p.new_arrival ?? false,
    bestSeller:     p.best_seller ?? false,
    active:         p.active ?? true,
    isSizeManaged:  (p as { is_size_managed?: boolean }).is_size_managed ?? false,
    images:         normalizeImages(p.images),
    category_id:    p.category_id ?? null,
    subcategory_id: p.subcategory_id ?? null,
    collection_id:  p.collection_id ?? null,
    size_chart_id:  p.size_chart_id ?? null,
    attr_fabric_id:   p.attr_fabric_id ?? null,
    attr_color_id:    p.attr_color_id ?? null,
    attr_occasion_id: p.attr_occasion_id ?? null,
    attr_pattern_id:  p.attr_pattern_id ?? null,
    attr_fit_id:      p.attr_fit_id ?? null,
    attr_sleeve_id:   p.attr_sleeve_id ?? null,
    attr_neck_id:     p.attr_neck_id ?? null,
    attr_work_id:     p.attr_work_id ?? null,
    attr_length_id:   p.attr_length_id ?? null,
    // Phase 1B — read from specifications JSONB, fall back to ""
    spec_modelInfo:   typeof specs.modelInfo  === "string" ? specs.modelInfo  : "",
    spec_sizeWorn:    typeof specs.sizeWorn   === "string" ? specs.sizeWorn   : "",
    spec_fitGuidance: typeof specs.fitGuidance === "string" ? specs.fitGuidance : "",
  };
}

function mapApiProductToProduct(p: ApiProductRecord): Product {
  const rawSizes = p.sizes;
  const sizesArr = Array.isArray(rawSizes)
    ? rawSizes
    : typeof rawSizes === "string" && rawSizes.trim()
      ? rawSizes.split(",").map((s) => s.trim()).filter(Boolean)
      : [];
  return {
    id:             p.id,
    name:           p.name,
    sku:            p.sku,
    slug:           p.slug,
    category:       p.category,
    collection:     p.collection,
    brand:          p.brand ?? "Bansari Collections",
    fabric:         p.fabric ?? "",
    color:          p.color ?? "",
    sizes:          sizesArr,
    price:          p.price,
    comparePrice:   p.compare_price ?? undefined,
    cost:           p.cost ?? undefined,
    stock:          p.stock,
    hsn:            p.hsn ?? "",
    gst:            p.gst ?? 5,
    description:    p.description ?? "",
    seoTitle:       p.seo_title ?? "",
    seoDescription: p.seo_description ?? "",
    featured:       p.featured ?? false,
    newArrival:     p.new_arrival ?? false,
    bestSeller:     p.best_seller ?? false,
    active:         p.active ?? true,
    isSizeManaged:  (p as { is_size_managed?: boolean }).is_size_managed ?? false,
    images:         normalizeImages(p.images),
    createdAt:      p.created_at,
    updatedAt:      p.updated_at,
    category_id:    p.category_id ?? null,
    subcategory_id: p.subcategory_id ?? null,
    collection_id:  p.collection_id ?? null,
    size_chart_id:  p.size_chart_id ?? null,
    attr_fabric_id:   p.attr_fabric_id ?? null,
    attr_color_id:    p.attr_color_id ?? null,
    attr_occasion_id: p.attr_occasion_id ?? null,
    attr_pattern_id:  p.attr_pattern_id ?? null,
    attr_fit_id:      p.attr_fit_id ?? null,
    attr_sleeve_id:   p.attr_sleeve_id ?? null,
    attr_neck_id:     p.attr_neck_id ?? null,
    attr_work_id:     p.attr_work_id ?? null,
    attr_length_id:   p.attr_length_id ?? null,
    specifications:   p.specifications ?? null,
  };
}

// ─── Fetch helper ──────────────────────────────────────────────────────────────

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) },
    ...options,
  });
  if (!res.ok) {
    let errMsg = `HTTP ${res.status}`;
    try {
      const errBody = (await res.json()) as ApiErrorResponse;
      if (errBody?.error?.message) errMsg = errBody.error.message;
    } catch { /* ignore parse error */ }
    throw new Error(errMsg);
  }
  return res.json() as Promise<T>;
}

// ─── LookupSelect helper component ────────────────────────────────────────────

type LookupSelectProps = {
  label: string;
  value: number | null;
  options: LookupItem[];
  onChange: (id: number | null, name: string) => void;
  required?: boolean;
  error?: string;
  placeholder?: string;
};

function LookupSelect({ label, value, options, onChange, required, error, placeholder }: LookupSelectProps) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-semibold text-neutral-900 tracking-tight">
        {label}{required && <span className="text-rose-600 ml-0.5">*</span>}
      </label>
      <div className="relative">
        <select
          value={value ?? ""}
          onChange={(e) => {
            const id = e.target.value === "" ? null : Number(e.target.value);
            const name = id ? (options.find((o) => o.id === id)?.name ?? "") : "";
            onChange(id, name);
          }}
          className={cn(
            "w-full h-11 appearance-none rounded-lg border px-3.5 pr-9 text-sm font-medium text-neutral-900 bg-white shadow-sm",
            "focus:outline-none focus:ring-2 focus:ring-amber-600 focus:border-amber-600",
            "hover:border-neutral-400 transition-colors",
            error ? "border-rose-400" : "border-neutral-300"
          )}
        >
          <option value="" className="text-neutral-400">{placeholder ?? `Select ${label}`}</option>
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
      </div>
      {error && <p className="text-xs text-rose-600">{error}</p>}
    </div>
  );
}

// ─── ToggleSwitch helper ───────────────────────────────────────────────────────

function ToggleSwitch({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <label className="flex items-center justify-between cursor-pointer rounded-xl border border-neutral-200 bg-white px-4 py-3.5 hover:border-neutral-300 hover:shadow-sm transition-all">
      <div>
        <span className="font-medium text-sm text-neutral-900">{label}</span>
        {description && <p className="text-xs text-neutral-500 mt-0.5">{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent",
          "transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-amber-600 focus:ring-offset-1",
          checked ? "bg-neutral-900" : "bg-neutral-200"
        )}
      >
        <span
          className={cn(
            "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition-transform duration-200",
            checked ? "translate-x-5" : "translate-x-0"
          )}
        />
      </button>
    </label>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function ProductManagement() {
  // ── State ──────────────────────────────────────────────────────────────────
  const [products, setProducts]         = useState<Product[]>([]);
  const [total, setTotal]               = useState(0);
  const [currentPage, setCurrentPage]   = useState(0);
  const [isLoading, setIsLoading]       = useState(true);
  const [searchQuery, setSearchQuery]   = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  const [isSheetOpen, setIsSheetOpen]   = useState(false);
  const [editProduct, setEditProduct]   = useState<Product | null>(null);
  const [currentStep, setCurrentStep]   = useState(0);
  const [form, setForm]                 = useState<ProductFormState>({ ...emptyForm });
  const [fieldErrors, setFieldErrors]   = useState<FieldErrors>({});
  const [isSaving, setIsSaving]         = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  const [uploadingImages, setUploadingImages] = useState(false);
  const [imagePreviews, setImagePreviews]     = useState<string[]>([]);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete]   = useState<Product | null>(null);
  const [isDeleting, setIsDeleting]             = useState(false);

  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewProduct, setViewProduct]       = useState<Product | null>(null);

  // Catalog lookups
  const [catalog, setCatalog]           = useState<CatalogData>(emptyCatalog);
  const [catalogLoading, setCatalogLoading] = useState(false);

  const fileInputRef  = useRef<HTMLInputElement>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const supabase = useMemo(() => createClient(), []);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  // ── Load catalog lookups ───────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;
    setCatalogLoading(true);
    console.log("Loading catalog...");
    apiFetch<CatalogData & { success: boolean }>("/api/admin/catalog")
      .then((res) => {
        console.log("Catalog response", res);
        if (cancelled) return;
        setCatalog({
          categories:    res.categories    ?? [],
          subcategories: res.subcategories ?? [],
          collections:   res.collections   ?? [],
          sizeCharts:    res.sizeCharts    ?? [],
          attrs:         res.attrs         ?? emptyCatalog.attrs,
        });
      })
      .catch((error) => {
        console.error("Catalog load failed", error);
        toast.error("Failed to load product catalog");
      })
      .finally(() => { if (!cancelled) setCatalogLoading(false); });
    return () => { cancelled = true; };
  }, []);

  // Subcategories filtered by selected category
  const filteredSubcats = useMemo(
    () => catalog.subcategories.filter((s) => !form.category_id || s.categoryId === form.category_id),
    [catalog.subcategories, form.category_id]
  );

  // ── Legacy classification resolution ──────────────────────────────────────
  // Existing products may carry a text `category`/`collection` with no FK
  // (pre-dating the catalog tables). Once the catalog is loaded, attempt a
  // SAFE exact-name match to auto-resolve the FK. Never invent a mapping —
  // if no exact match exists, category_id/collection_id stay null and the
  // classification card below surfaces an explicit warning instead.
  useEffect(() => {
    if (catalogLoading) return;
    if (!form.category_id && form.category) {
      const match = catalog.categories.find((c) => c.name === form.category);
      if (match) setField("category_id", match.id);
    }
    if (!form.collection_id && form.collection) {
      const match = catalog.collections.find((c) => c.name === form.collection);
      if (match) setField("collection_id", match.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalogLoading, catalog.categories, catalog.collections, form.category, form.collection]);

  const categoryUnresolved = !form.category_id && !!form.category;
  const collectionUnresolved = !form.collection_id && !!form.collection;

  // SizeCharts coerced to LookupItem (slug defaults to "")
  const sizeChartOptions = useMemo<LookupItem[]>(
    () => catalog.sizeCharts.map((sc) => ({ id: sc.id, name: sc.name, slug: sc.slug ?? "" })),
    [catalog.sizeCharts]
  );

  // ── Search debounce ────────────────────────────────────────────────────────

  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setDebouncedQuery(searchQuery);
      setCurrentPage(0);
    }, SEARCH_DEBOUNCE_MS);
    return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current); };
  }, [searchQuery]);

  // ── Load products ──────────────────────────────────────────────────────────

  const loadProducts = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(currentPage),
        limit: String(PAGE_SIZE),
        orderBy: "created_at",
        ascending: "false",
      });
      if (debouncedQuery) params.set("q", debouncedQuery);
      const res = await apiFetch<ApiListResponse>(`/api/admin/products?${params.toString()}`);
      setProducts((res.data ?? []).map(mapApiProductToProduct));
      setTotal(res.total ?? 0);
    } catch (err) {
      toast.error("Failed to load products.");
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, debouncedQuery]);

  useEffect(() => { void loadProducts(); }, [loadProducts]);

  // ── Form helpers ───────────────────────────────────────────────────────────

  const setField = useCallback(
    <K extends keyof ProductFormState>(key: K, value: ProductFormState[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
      setFieldErrors((prev) => { const next = { ...prev }; delete next[key]; return next; });
    },
    []
  );

  const handleToggle = useCallback((field: ToggleFieldId) => {
    setForm((prev) => ({ ...prev, [field]: !prev[field] }));
  }, []);

  // ── Slug auto-generation ───────────────────────────────────────────────────

  const handleNameChange = useCallback((value: string) => {
    setField("name", value);
    if (!editProduct) setField("slug", slugify(value));
  }, [editProduct, setField]);

  // ── Open new / edit ────────────────────────────────────────────────────────

  const openNew = useCallback(() => {
    setEditProduct(null);
    setForm({ ...emptyForm });
    setFieldErrors({});
    setCurrentStep(0);
    setImagePreviews([]);
    setIsSheetOpen(true);
  }, []);

  const openEdit = useCallback((p: Product) => {
    setEditProduct(p);
    setForm(mapApiProductToForm(p as unknown as ApiProductRecord));
    setFieldErrors({});
    setCurrentStep(0);
    setImagePreviews(p.images.map((img) => img.url));
    setIsSheetOpen(true);
  }, []);

  // ── Image upload ───────────────────────────────────────────────────────────

  const handleImageUpload = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;

      /*
       * Validation is async now because a video's duration can only be read
       * by loading its metadata. Images keep exactly the rules they had.
       */
      const candidates = Array.from(files);
      const valid: File[] = [];

      for (const f of candidates) {
        const isVideoFile = ALLOWED_VIDEO_MIME_TYPES.includes(f.type);

        if (!isVideoFile && !ALLOWED_MIME_TYPES.includes(f.type)) {
          toast.error(`${f.name}: unsupported type.`);
          continue;
        }

        if (isVideoFile) {
          if (f.size > MAX_VIDEO_SIZE_BYTES) {
            toast.error(
              `${f.name} exceeds ${MAX_VIDEO_SIZE_BYTES / 1024 / 1024} MB. Export a shorter or more compressed clip.`
            );
            continue;
          }
          const duration = await readVideoDuration(f);
          // null means the browser could not read metadata — allow it rather
          // than block a valid upload over a codec quirk.
          if (duration !== null && duration > MAX_VIDEO_DURATION_SECONDS) {
            toast.error(
              `${f.name} is ${Math.round(duration)}s. Product clips must be ${MAX_VIDEO_DURATION_SECONDS}s or shorter.`
            );
            continue;
          }
        } else if (f.size > MAX_FILE_SIZE_BYTES) {
          toast.error(
            `${f.name} exceeds ${MAX_FILE_SIZE_BYTES / 1024 / 1024} MB.`
          );
          continue;
        }

        valid.push(f);
      }

      if (valid.length === 0) return;
      setUploadingImages(true);
      try {
        const uploaded: ProductImage[] = [];
        for (const file of valid) {
          const path = buildStoragePath(file);
          const { error } = await supabase.storage.from(PRODUCT_IMAGES_BUCKET).upload(path, file, { upsert: false });
          if (error) { toast.error(`Upload failed: ${error.message}`); continue; }
          const { data: { publicUrl } } = supabase.storage.from(PRODUCT_IMAGES_BUCKET).getPublicUrl(path);
          // mediaType is what ProductGallery switches on to render a <video>
          // instead of next/image. Without it the clip would be handed to the
          // image optimiser and fail.
          uploaded.push({
            url: publicUrl,
            alt: form.name || file.name,
            ...(ALLOWED_VIDEO_MIME_TYPES.includes(file.type)
              ? { mediaType: "video" as const }
              : {}),
          });
        }
        if (uploaded.length > 0) {
          setForm((prev) => ({ ...prev, images: [...prev.images, ...uploaded] }));
          setImagePreviews((prev) => [...prev, ...uploaded.map((u) => u.url)]);
          toast.success(`${uploaded.length} image(s) uploaded.`);
        }
      } finally {
        setUploadingImages(false);
      }
    },
    [supabase, form.name]
  );

  const removeImage = useCallback((index: number) => {
    setForm((prev) => ({ ...prev, images: prev.images.filter((_, i) => i !== index) }));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // ── Validation ─────────────────────────────────────────────────────────────

  function validateStep(stepId: number): FieldErrors {
    const errors: FieldErrors = {};
    const step = STEPS.find((s) => s.id === stepId);
    if (!step || step.fields.length === 0) return errors;
    for (const field of step.fields) {
      const val = form[field];
      if (REQUIRED_FIELDS.includes(field)) {
        const strVal = typeof val === "string" ? val.trim() : String(val ?? "");
        if (!strVal) {
          errors[field] = `${String(field).replace(/([A-Z])/g, " $1")} is required.`;
        }
      }
    }
    return errors;
  }

  function validateAll(): FieldErrors {
    const errors: FieldErrors = {};
    const result = productFormSchema.safeParse({
      ...form,
      sizes: form.sizes.split(",").map((s) => s.trim()).filter(Boolean),
      price: form.price,
      comparePrice: form.comparePrice || undefined,
      cost: form.cost || undefined,
      stock: form.stock,
      gst: form.gst,
    });
    if (!result.success) {
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof ProductFormState;
        if (!errors[field]) errors[field] = issue.message;
      }
    }
    return errors;
  }

  // ── Step navigation ────────────────────────────────────────────────────────

  const handleNext = useCallback(() => {
    const errors = validateStep(currentStep);
    if (Object.keys(errors).length > 0) { setFieldErrors(errors); return; }
    setCurrentStep((s) => Math.min(s + 1, STEPS.length - 1));
  }, [currentStep, form]);

  const handleBack = useCallback(() => {
    setCurrentStep((s) => Math.max(s - 1, 0));
  }, []);

  // ── Build API payload ──────────────────────────────────────────────────────

  function buildPayload(publishNow: boolean): ApiProductPayload {
    const sizesArr = form.sizes.split(",").map((s) => s.trim()).filter(Boolean);
    return {
      name:           form.name,
      sku:            form.sku,
      slug:           form.slug,
      category:       form.category,
      collection:     form.collection,
      brand:          form.brand,
      fabric:         form.fabric,
      color:          form.color,
      sizes:          sizesArr,
      price:          Number(form.price),
      compare_price:  form.comparePrice ? Number(form.comparePrice) : null,
      cost:           form.cost ? Number(form.cost) : null,
      stock:          Number(form.stock),
      hsn:            form.hsn,
      gst:            Number(form.gst),
      description:    form.description,
      seo_title:      form.seoTitle,
      seo_description: form.seoDescription,
      featured:       form.featured,
      new_arrival:    form.newArrival,
      best_seller:    form.bestSeller,
      active:         publishNow ? true : form.active,
      is_size_managed: form.isSizeManaged,
      images:         form.images,
      // V2 FK IDs
      category_id:    form.category_id,
      subcategory_id: form.subcategory_id,
      collection_id:  form.collection_id,
      size_chart_id:  form.size_chart_id,
      attr_fabric_id:   form.attr_fabric_id,
      attr_color_id:    form.attr_color_id,
      attr_occasion_id: form.attr_occasion_id,
      attr_pattern_id:  form.attr_pattern_id,
      attr_fit_id:      form.attr_fit_id,
      attr_sleeve_id:   form.attr_sleeve_id,
      attr_neck_id:     form.attr_neck_id,
      attr_work_id:     form.attr_work_id,
      attr_length_id:   form.attr_length_id,
      // Phase 1B — merge new fields into specifications; existing keys are preserved
      // by the API handler which does a JSONB merge (or the record starts empty).
      specifications: {
        modelInfo:   form.spec_modelInfo,
        sizeWorn:    form.spec_sizeWorn,
        fitGuidance: form.spec_fitGuidance,
      },
    };
  }

  // ── Save ───────────────────────────────────────────────────────────────────

  const handleSave = useCallback(async (publishNow = false) => {
    const errors = validateAll();
    if (Object.keys(errors).length > 0) { setFieldErrors(errors); toast.error("Please fix validation errors."); return; }

    if (publishNow) setIsPublishing(true); else setIsSaving(true);

    try {
      const payload = buildPayload(publishNow);
      // FIX: was "edit" — not assignable to 'create' | 'update' union in logAdminSavePayload
      logAdminSavePayload(editProduct ? "update" : "create", payload, editProduct?.id);

      let result: ApiSingleResponse;
      if (editProduct) {
        result = await apiFetch<ApiSingleResponse>(`/api/admin/products/${editProduct.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        result = await apiFetch<ApiSingleResponse>("/api/admin/products", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }

      toast.success(
        publishNow
          ? `"${result.data.name}" published successfully.`
          : `"${result.data.name}" saved.`
      );
      setIsSheetOpen(false);
      await loadProducts();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setIsSaving(false);
      setIsPublishing(false);
    }
  }, [editProduct, form, loadProducts]);

  /**
   * Save ONLY the images of an existing product.
   *
   * handleSave runs validateAll(), which enforces the entire product schema —
   * 15 required fields including sku, slug, hsn, sizes, seoTitle and
   * seoDescription. That is right when creating a product, but it means
   * changing a photograph on an existing one is blocked until every legacy
   * field is filled in. Products created before those fields existed have
   * them empty, so editing their images demanded unrelated data entry first.
   *
   * The API accepts a partial payload: ProductV2Service.update guards every
   * field with `payload.x !== undefined` and only re-checks sku/slug
   * uniqueness when those are actually changing. Sending just { images } is
   * therefore safe and touches nothing else.
   */
  const handleSaveImagesOnly = useCallback(async () => {
    if (!editProduct) return;
    setIsSaving(true);
    try {
      const result = await apiFetch<ApiSingleResponse>(
        `/api/admin/products/${editProduct.id}`,
        {
          method: "PUT",
          body: JSON.stringify({ images: form.images }),
        }
      );
      toast.success(`Images updated for "${result.data.name}".`);
      await loadProducts();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update images.");
    } finally {
      setIsSaving(false);
    }
  }, [editProduct, form.images, loadProducts]);

  // ── Delete ─────────────────────────────────────────────────────────────────

  const handleDelete = useCallback(async () => {
    if (!productToDelete) return;
    setIsDeleting(true);
    try {
      await apiFetch(`/api/admin/products/${productToDelete.id}`, { method: "DELETE" });
      toast.success(`"${productToDelete.name}" deleted.`);
      setDeleteDialogOpen(false);
      setProductToDelete(null);
      await loadProducts();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setIsDeleting(false);
    }
  }, [productToDelete, loadProducts]);

  // ── Stats ──────────────────────────────────────────────────────────────────

  const stats = useMemo(() => ({
    total:      products.length,
    active:     products.filter((p) => p.active).length,
    featured:   products.filter((p) => p.featured).length,
    lowStock:   products.filter((p) => p.stock <= LOW_STOCK_THRESHOLD && p.stock > 0).length,
    outOfStock: products.filter((p) => p.stock === 0).length,
  }), [products]);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <div className="bg-white border-b border-neutral-200 px-6 py-5">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div>
            <h1 className="font-serif text-3xl text-neutral-900 tracking-tight">Products</h1>
            <p className="text-sm text-neutral-500 mt-1">{total} product{total !== 1 ? "s" : ""} total</p>
          </div>
          <Button onClick={openNew} className="flex items-center gap-2 bg-neutral-900 hover:bg-amber-700 transition-colors">
            <Plus className="h-4 w-4" />
            Add Product
          </Button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="max-w-7xl mx-auto px-6 py-5 grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: "Total",       value: stats.total,      icon: Package,   color: "text-neutral-600" },
          { label: "Active",      value: stats.active,     icon: CheckCircle2, color: "text-green-600" },
          { label: "Featured",    value: stats.featured,   icon: Sparkles,  color: "text-amber-700" },
          { label: "Low Stock",   value: stats.lowStock,   icon: AlertTriangle, color: "text-yellow-600" },
          { label: "Out of Stock",value: stats.outOfStock, icon: ShoppingBag, color: "text-red-600" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl border border-neutral-200 p-3.5 flex items-center gap-3 hover:shadow-sm hover:border-neutral-300 transition-all">
            <Icon className={cn("h-5 w-5", color)} />
            <div>
              <p className="text-xs text-neutral-500">{label}</p>
              <p className="text-lg font-semibold text-neutral-900">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="max-w-7xl mx-auto px-6 pb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
          <input
            type="text"
            placeholder="Search products by name, SKU, or slug..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-600 bg-white"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Product grid */}
      <div className="max-w-7xl mx-auto px-6 pb-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-neutral-400">
            <Package className="h-12 w-12 mb-3 opacity-40" />
            <p className="text-lg font-medium">No products found</p>
            <p className="text-sm">Create your first product to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {products.map((p) => (
              <div
                key={p.id}
                className="bg-white rounded-xl border border-neutral-200 overflow-hidden hover:shadow-md transition-shadow"
              >
                {/* Product image */}
                <div className="aspect-square relative bg-neutral-100">
                  {p.images[0] ? (
                    <Image
                      src={p.images[0].url}
                      alt={p.images[0].alt}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Package className="h-12 w-12 text-neutral-300" />
                    </div>
                  )}
                  {/* Status badges */}
                  <div className="absolute top-2 left-2 flex flex-col gap-1">
                    {p.featured   && <Badge className="bg-amber-600 text-white text-xs">Featured</Badge>}
                    {p.bestSeller && <Badge className="bg-orange-500 text-white text-xs">Best Seller</Badge>}
                    {p.newArrival && <Badge className="bg-green-600 text-white text-xs">New</Badge>}
                  </div>
                  {!p.active && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <span className="text-white text-sm font-medium bg-black/60 px-2 py-1 rounded">Inactive</span>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="p-3">
                  <p className="font-medium text-neutral-900 text-sm line-clamp-1">{p.name}</p>
                  <p className="text-xs text-neutral-500 mt-0.5">{p.sku} · {p.category}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="font-semibold text-neutral-900">₹{p.price.toLocaleString("en-IN")}</span>
                    {p.stock <= LOW_STOCK_THRESHOLD && (
                      <span className={cn("text-xs font-medium", p.stock === 0 ? "text-red-600" : "text-yellow-600")}>
                        {p.stock === 0 ? "Out of stock" : `${p.stock} left`}
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 mt-3">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 text-xs"
                      asChild
                    >
                      <Link href={`/admin/products/${p.id}/inventory`}>
                        <Layers className="h-3 w-3 mr-1" /> Sizes
                      </Link>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 text-xs"
                      onClick={() => { setViewProduct(p); setViewDialogOpen(true); }}
                    >
                      <Eye className="h-3 w-3 mr-1" /> View
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 text-xs"
                      onClick={() => openEdit(p)}
                    >
                      <Edit className="h-3 w-3 mr-1" /> Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600 hover:bg-red-50 text-xs"
                      onClick={() => { setProductToDelete(p); setDeleteDialogOpen(true); }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-8">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 0}
              onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-neutral-600">
              Page {currentPage + 1} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages - 1}
              onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* ── Add/Edit Sheet ──────────────────────────────────────────────────── */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto p-0">
          <SheetHeader className="sticky top-0 z-10 bg-white border-b border-neutral-200 px-6 py-5">
            <SheetTitle className="font-serif text-xl text-neutral-900">
              {editProduct ? `Edit: ${editProduct.name}` : "Add New Product"}
            </SheetTitle>
            <SheetDescription className="text-sm text-neutral-500">
              Step {currentStep + 1} of {STEPS.length} — {STEPS[currentStep]?.label}
            </SheetDescription>

            {/* Step tabs */}
            <div className="flex gap-1 mt-3">
              {STEPS.map((step) => {
                const Icon = step.icon;
                const isActive = currentStep === step.id;
                const isDone = currentStep > step.id;
                return (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => setCurrentStep(step.id)}
                    className={cn(
                      "flex-1 flex flex-col items-center gap-1 py-2 rounded-lg text-xs transition-colors",
                      isActive ? "bg-neutral-900 text-white font-semibold" :
                      isDone   ? "text-amber-700 hover:bg-amber-50" :
                                 "text-neutral-400 hover:bg-neutral-50"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="hidden sm:block">{step.short}</span>
                  </button>
                );
              })}
            </div>
          </SheetHeader>

          <div className="px-6 py-6 space-y-6">

            {/* ── STEP 0: Media ─────────────────────────────────────────── */}
            {currentStep === 0 && (
              <div className="space-y-5">
                <div className="flex items-baseline justify-between">
                  <div className="flex items-center gap-2"><span className="h-3.5 w-0.5 rounded-full bg-amber-600" /><p className="text-xs font-bold uppercase tracking-[0.12em] text-neutral-900">Product Photography</p></div>
                  {imagePreviews.length > 0 && (
                    <p className="text-xs text-neutral-400">{imagePreviews.length} image{imagePreviews.length === 1 ? "" : "s"}</p>
                  )}
                </div>

                <div
                  className="border-2 border-dashed border-neutral-300 rounded-xl p-10 text-center cursor-pointer hover:border-amber-500 hover:bg-amber-50/40 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => { e.preventDefault(); handleImageUpload(e.dataTransfer.files); }}
                >
                  {uploadingImages ? (
                    <Loader2 className="h-9 w-9 animate-spin text-neutral-400 mx-auto" />
                  ) : (
                    <>
                      <ImagePlus className="h-10 w-10 text-neutral-300 mx-auto mb-3" />
                      <p className="text-sm text-neutral-700 font-medium">Drag and drop, or click to upload</p>
                      <p className="text-xs text-neutral-500 mt-1">
                        Images: JPEG, PNG, WebP, GIF · max {MAX_FILE_SIZE_BYTES / 1024 / 1024} MB each
                      </p>
                      <p className="text-xs text-neutral-500">
                        Video: MP4, WebM · max {MAX_VIDEO_SIZE_BYTES / 1024 / 1024} MB, {MAX_VIDEO_DURATION_SECONDS}s
                      </p>
                    </>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept={[...ALLOWED_MIME_TYPES, ...ALLOWED_VIDEO_MIME_TYPES].join(",")}
                  className="hidden"
                  onChange={(e) => handleImageUpload(e.target.files)}
                />

                {/*
                  Images-only save, shown when editing an existing product.
                  The main Save runs the full product schema, so a product
                  missing a legacy field (hsn, seoTitle, sizes...) could not
                  have its photographs changed without filling in unrelated
                  data first. This writes just the images.
                */}
                {editProduct && (
                  <div className="flex items-center justify-between gap-3 rounded-md border border-neutral-200 bg-neutral-50 px-4 py-3">
                    <p className="text-xs text-neutral-600">
                      Changing photos only? Save them without completing the rest of the form.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isSaving || uploadingImages}
                      onClick={handleSaveImagesOnly}
                    >
                      {isSaving ? "Saving…" : "Save images only"}
                    </Button>
                  </div>
                )}

                {imagePreviews.length > 0 && (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                    {imagePreviews.map((url, i) => (
                      <div
                        key={i}
                        className={cn(
                          "group relative aspect-[3/4] overflow-hidden rounded-md bg-neutral-100 border",
                          i === 0 ? "border-neutral-900 ring-1 ring-neutral-900" : "border-neutral-200"
                        )}
                      >
                        <Image src={url} alt={`Preview ${i + 1}`} fill className="object-cover" sizes="200px" />
                        {i === 0 && (
                          <span className="absolute left-1.5 top-1.5 bg-neutral-900 text-white text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-sm">
                            Primary
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => removeImage(i)}
                          aria-label={`Remove image ${i + 1}`}
                          className="absolute top-1.5 right-1.5 bg-black/60 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── STEP 1: Basic Info ────────────────────────────────────── */}
            {currentStep === 1 && (
              <div className="space-y-4">
                {/* Name — visually dominant */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500">
                    Product Name <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="e.g. Silk Embroidered Saree"
                    className={cn(
                      "w-full h-12 rounded-lg border px-3.5 py-2 font-serif text-lg text-neutral-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-600 focus:border-amber-600",
                      fieldErrors.name ? "border-rose-400" : "border-neutral-300"
                    )}
                  />
                  {fieldErrors.name && <p className="text-xs text-rose-600">{fieldErrors.name}</p>}
                </div>

                {/* Slug — secondary */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-neutral-700">
                    Slug <span className="text-rose-600">*</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={form.slug}
                      onChange={(e) => setField("slug", slugify(e.target.value))}
                      className={cn(
                        "flex-1 h-9 rounded-md border px-3 py-2 text-xs text-neutral-600 shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-600",
                        fieldErrors.slug ? "border-rose-400" : "border-neutral-300"
                      )}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setField("slug", slugify(form.name))}
                      className="shrink-0"
                    >
                      <RefreshCw className="h-3 w-3" />
                    </Button>
                  </div>
                  {fieldErrors.slug && <p className="text-xs text-rose-600">{fieldErrors.slug}</p>}
                </div>

                {/* SKU */}
                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-neutral-900">
                    SKU <span className="text-rose-600">*</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={form.sku}
                      onChange={(e) => setField("sku", e.target.value)}
                      className={cn(
                        "flex-1 h-10 rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-600",
                        fieldErrors.sku ? "border-rose-400" : "border-neutral-300"
                      )}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setField("sku", generateSku(form.category, form.name))}
                      className="shrink-0"
                    >
                      <Wand2 className="h-3 w-3" />
                    </Button>
                  </div>
                  {fieldErrors.sku && <p className="text-xs text-rose-600">{fieldErrors.sku}</p>}
                </div>

                {/* ── Product Classification — distinct card, own section ── */}
                <div className="sm:col-span-2 rounded-xl border border-neutral-200 bg-neutral-50/70 p-5 space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="h-3.5 w-0.5 rounded-full bg-amber-600" />
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-neutral-900">
                      Product Classification
                    </p>
                  </div>

                  {(categoryUnresolved || collectionUnresolved) && (
                    <div className="rounded-lg border border-amber-300 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-900 space-y-1">
                      {categoryUnresolved && (
                        <p>
                          Legacy category &ldquo;{form.category}&rdquo; has no matching catalog record.
                          Select the correct category below before publishing.
                        </p>
                      )}
                      {collectionUnresolved && (
                        <p>
                          Legacy collection &ldquo;{form.collection}&rdquo; has no matching catalog record.
                          Select the correct collection below before publishing.
                        </p>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Category */}
                    <LookupSelect
                      label="Category"
                      required
                      value={form.category_id}
                      options={catalog.categories}
                      error={fieldErrors.category_id ?? fieldErrors.category}
                      onChange={(id, name) => {
                        setField("category_id", id);
                        setField("category", name);
                        setField("subcategory_id", null);
                      }}
                    />

                    {/* Subcategory — depends on Category */}
                    <LookupSelect
                      label="Subcategory"
                      value={form.subcategory_id}
                      options={filteredSubcats}
                      onChange={(id, name) => setField("subcategory_id", id)}
                      placeholder={form.category_id ? "Select subcategory (optional)" : "Select category first"}
                    />

                    {/* Collection — independent of Category */}
                    <LookupSelect
                      label="Collection"
                      required
                      value={form.collection_id}
                      options={catalog.collections}
                      error={fieldErrors.collection_id ?? fieldErrors.collection}
                      onChange={(id, name) => {
                        setField("collection_id", id);
                        setField("collection", name);
                      }}
                    />
                  </div>

                  {(form.category_id || form.collection_id) && (
                    <div className="flex flex-wrap gap-x-8 gap-y-1 border-t border-neutral-200 pt-3 text-xs">
                      {form.category_id && (
                        <span className="text-neutral-500">
                          Category <span className="ml-1 font-medium text-neutral-900">{form.category}</span>
                        </span>
                      )}
                      {form.subcategory_id && (
                        <span className="text-neutral-500">
                          Subcategory{" "}
                          <span className="ml-1 font-medium text-neutral-900">
                            {filteredSubcats.find((s) => s.id === form.subcategory_id)?.name ?? catalog.subcategories.find((s) => s.id === form.subcategory_id)?.name}
                          </span>
                        </span>
                      )}
                      {form.collection_id && (
                        <span className="text-neutral-500">
                          Collection <span className="ml-1 font-medium text-neutral-900">{form.collection}</span>
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Brand */}
                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-neutral-900">
                    Brand <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.brand}
                    onChange={(e) => setField("brand", e.target.value)}
                    className={cn(
                      "w-full h-10 rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-600",
                      fieldErrors.brand ? "border-rose-400" : "border-neutral-300"
                    )}
                  />
                </div>

                {/* ── CORE attributes ── */}
                <div className="rounded-xl border border-neutral-200 bg-neutral-50/70 p-5 space-y-4">
                  <div className="flex items-center gap-2"><span className="h-3.5 w-0.5 rounded-full bg-amber-600" /><p className="text-xs font-bold uppercase tracking-[0.12em] text-neutral-900">Core Attributes</p></div>
                  <div className="grid grid-cols-2 gap-4">
                    <LookupSelect
                      label="Fabric"
                      required
                      value={form.attr_fabric_id}
                      options={catalog.attrs.fabric}
                      error={fieldErrors.fabric}
                      onChange={(id, name) => { setField("attr_fabric_id", id); setField("fabric", name); }}
                    />
                    <LookupSelect
                      label="Color"
                      required
                      value={form.attr_color_id}
                      options={catalog.attrs.color}
                      error={fieldErrors.color}
                      onChange={(id, name) => { setField("attr_color_id", id); setField("color", name); }}
                    />
                    <LookupSelect
                      label="Pattern"
                      value={form.attr_pattern_id}
                      options={catalog.attrs.pattern}
                      onChange={(id) => setField("attr_pattern_id", id)}
                      placeholder="Optional"
                    />
                    <LookupSelect
                      label="Work"
                      value={form.attr_work_id}
                      options={catalog.attrs.work}
                      onChange={(id) => setField("attr_work_id", id)}
                      placeholder="Optional"
                    />
                  </div>
                </div>

                {/* ── STYLE attributes ── */}
                <div className="rounded-xl border border-neutral-200 bg-neutral-50/70 p-5 space-y-4">
                  <div className="flex items-center gap-2"><span className="h-3.5 w-0.5 rounded-full bg-amber-600" /><p className="text-xs font-bold uppercase tracking-[0.12em] text-neutral-900">Style</p></div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <LookupSelect
                      label="Occasion"
                      value={form.attr_occasion_id}
                      options={catalog.attrs.occasion}
                      onChange={(id) => setField("attr_occasion_id", id)}
                      placeholder="Optional"
                    />
                    <LookupSelect
                      label="Fit"
                      value={form.attr_fit_id}
                      options={catalog.attrs.fit}
                      onChange={(id) => setField("attr_fit_id", id)}
                      placeholder="Optional"
                    />
                    <LookupSelect
                      label="Sleeve"
                      value={form.attr_sleeve_id}
                      options={catalog.attrs.sleeve}
                      onChange={(id) => setField("attr_sleeve_id", id)}
                      placeholder="Optional"
                    />
                    <LookupSelect
                      label="Neck"
                      value={form.attr_neck_id}
                      options={catalog.attrs.neck}
                      onChange={(id) => setField("attr_neck_id", id)}
                      placeholder="Optional"
                    />
                    <LookupSelect
                      label="Length"
                      value={form.attr_length_id}
                      options={catalog.attrs.length}
                      onChange={(id) => setField("attr_length_id", id)}
                      placeholder="Optional"
                    />
                  </div>
                </div>

                {/* ── SIZE ── */}
                <div className="rounded-xl border border-neutral-200 bg-neutral-50/70 p-5 space-y-4">
                  <div className="flex items-center gap-2"><span className="h-3.5 w-0.5 rounded-full bg-amber-600" /><p className="text-xs font-bold uppercase tracking-[0.12em] text-neutral-900">Size</p></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-sm font-semibold text-neutral-900">
                        Available Sizes <span className="text-rose-600">*</span>
                      </label>
                      <input
                        type="text"
                        value={form.sizes}
                        onChange={(e) => setField("sizes", e.target.value)}
                        placeholder="XS, S, M, L, XL"
                        className={cn(
                          "w-full h-10 rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-600",
                          fieldErrors.sizes ? "border-rose-400" : "border-neutral-300"
                        )}
                      />
                      {fieldErrors.sizes && <p className="text-xs text-rose-600">{fieldErrors.sizes}</p>}
                    </div>
                    <LookupSelect
                      label="Size Chart"
                      value={form.size_chart_id}
                      options={sizeChartOptions}
                      onChange={(id) => setField("size_chart_id", id)}
                      placeholder="Select (optional)"
                    />
                  </div>
                  <p className="text-xs text-neutral-500">Comma-separated list of sizes</p>
                </div>
              </div>
            )}

            {/* ── STEP 2: Pricing ───────────────────────────────────────── */}
            {currentStep === 2 && (
              <div className="space-y-4">
                {/* Selling Price — visually dominant, own row */}
                <div className="rounded-xl border border-neutral-200 bg-neutral-50/70 p-5 space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-[0.12em] text-neutral-900">
                    Selling Price (₹) <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.price}
                    onChange={(e) => setField("price", e.target.value)}
                    className={cn(
                      "w-full sm:w-64 h-12 rounded-lg border px-3.5 py-2 font-serif text-2xl text-neutral-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-600 focus:border-amber-600",
                      fieldErrors.price ? "border-rose-400" : "border-neutral-300"
                    )}
                  />
                  {fieldErrors.price && <p className="text-xs text-rose-600">{fieldErrors.price}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Compare Price */}
                  <div className="space-y-1.5">
                    <label className="block text-sm font-semibold text-neutral-900">Compare At (₹)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.comparePrice}
                      onChange={(e) => setField("comparePrice", e.target.value)}
                      placeholder="Original price"
                      className="w-full h-10 rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-600"
                    />
                  </div>

                  {/* Cost */}
                  <div className="space-y-1.5">
                    <label className="block text-sm font-semibold text-neutral-900">Cost (₹)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.cost}
                      onChange={(e) => setField("cost", e.target.value)}
                      placeholder="Cost of goods"
                      className="w-full h-10 rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-600"
                    />
                  </div>

                  {/* Stock */}
                  <div className="space-y-1.5">
                    <label className="block text-sm font-semibold text-neutral-900">
                      Stock <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={form.stock}
                      onChange={(e) => setField("stock", e.target.value)}
                      className={cn(
                        "w-full h-10 rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-600",
                        fieldErrors.stock ? "border-rose-400" : "border-neutral-300"
                      )}
                    />
                    {fieldErrors.stock && <p className="text-xs text-rose-600">{fieldErrors.stock}</p>}
                  </div>

                  {/* HSN */}
                  <div className="space-y-1.5">
                    <label className="block text-sm font-semibold text-neutral-900">
                      HSN Code <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="text"
                      value={form.hsn}
                      onChange={(e) => setField("hsn", e.target.value)}
                      placeholder="e.g. 5208"
                      className={cn(
                        "w-full h-10 rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-600",
                        fieldErrors.hsn ? "border-rose-400" : "border-neutral-300"
                      )}
                    />
                    {fieldErrors.hsn && <p className="text-xs text-rose-600">{fieldErrors.hsn}</p>}
                  </div>

                  {/* GST */}
                  <div className="space-y-1.5">
                    <label className="block text-sm font-semibold text-neutral-900">GST (%)</label>
                    <select
                      value={form.gst}
                      onChange={(e) => setField("gst", e.target.value)}
                      className="w-full h-10 rounded-md border border-neutral-300 px-3 py-2 text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-600"
                    >
                      {[0, 5, 12, 18, 28].map((r) => (
                        <option key={r} value={r}>{r}%</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* ── STEP 3: Content ───────────────────────────────────────── */}
            {currentStep === 3 && (
              <div className="space-y-5">
                <div className="flex items-center gap-2"><span className="h-3.5 w-0.5 rounded-full bg-amber-600" /><p className="text-xs font-bold uppercase tracking-[0.12em] text-neutral-900">Product Description</p></div>
                {/* Description */}
                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-neutral-900">
                    Description <span className="text-rose-600">*</span>
                  </label>
                  <textarea
                    rows={6}
                    value={form.description}
                    onChange={(e) => setField("description", e.target.value)}
                    placeholder="Detailed product description..."
                    className={cn(
                      "w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-600 resize-none",
                      fieldErrors.description ? "border-rose-400" : "border-neutral-300"
                    )}
                  />
                  {fieldErrors.description && <p className="text-xs text-rose-600">{fieldErrors.description}</p>}
                </div>

                {/* SEO */}
                <div className="flex items-center gap-2 pt-2"><span className="h-3.5 w-0.5 rounded-full bg-amber-600" /><p className="text-xs font-bold uppercase tracking-[0.12em] text-neutral-900">SEO</p></div>
                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-neutral-900">
                    SEO Title <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.seoTitle}
                    onChange={(e) => setField("seoTitle", e.target.value)}
                    placeholder="Page title for search engines"
                    className={cn(
                      "w-full h-10 rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-600",
                      fieldErrors.seoTitle ? "border-rose-400" : "border-neutral-300"
                    )}
                  />
                  {fieldErrors.seoTitle && <p className="text-xs text-rose-600">{fieldErrors.seoTitle}</p>}
                </div>

                {/* SEO Description */}
                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-neutral-900">
                    SEO Description <span className="text-rose-600">*</span>
                  </label>
                  <textarea
                    rows={3}
                    value={form.seoDescription}
                    onChange={(e) => setField("seoDescription", e.target.value)}
                    placeholder="Meta description for search engines (150-160 chars)"
                    className={cn(
                      "w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-600 resize-none",
                      fieldErrors.seoDescription ? "border-rose-400" : "border-neutral-300"
                    )}
                  />
                  {fieldErrors.seoDescription && <p className="text-xs text-rose-600">{fieldErrors.seoDescription}</p>}
                </div>

                {/* Phase 1B — Model & Fit Information */}
                <div className="rounded-xl border border-neutral-200 bg-neutral-50/70 p-5 space-y-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-amber-600" />
                    <h3 className="text-sm font-semibold text-neutral-900">Model &amp; Fit Information</h3>
                  </div>

                  {/* Model Info — FIX: removed smart quote from placeholder */}
                  <div className="space-y-1.5">
                    <label className="block text-sm font-semibold text-neutral-900">Model Info</label>
                    <input
                      type="text"
                      value={form.spec_modelInfo}
                      onChange={(e) => setField("spec_modelInfo", e.target.value)}
                      placeholder="e.g. Model is 5ft 7in, Measurements: 34-26-36"
                      className="w-full h-10 rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-600"
                    />
                    <p className="text-xs text-neutral-500">Displayed on PDP to help customers size correctly</p>
                  </div>

                  {/* Size Worn */}
                  <div className="space-y-1.5">
                    <label className="block text-sm font-semibold text-neutral-900">Size Worn</label>
                    <input
                      type="text"
                      value={form.spec_sizeWorn}
                      onChange={(e) => setField("spec_sizeWorn", e.target.value)}
                      placeholder="e.g. Model is wearing size S"
                      className="w-full h-10 rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-600"
                    />
                  </div>

                  {/* Fit Guidance */}
                  <div className="space-y-1.5">
                    <label className="block text-sm font-semibold text-neutral-900">Fit Guidance</label>
                    <input
                      type="text"
                      value={form.spec_fitGuidance}
                      onChange={(e) => setField("spec_fitGuidance", e.target.value)}
                      placeholder="e.g. Slim fit, size up if between sizes"
                      className="w-full h-10 rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-600"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ── STEP 4: Visibility ────────────────────────────────────── */}
            {currentStep === 4 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2"><span className="h-3.5 w-0.5 rounded-full bg-amber-600" /><p className="text-xs font-bold uppercase tracking-[0.12em] text-neutral-900">Product Status</p></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <ToggleSwitch
                  checked={form.active}
                  onChange={(v) => setField("active", v)}
                  label="Active"
                  description="Product is visible to customers"
                />
                <ToggleSwitch
                  checked={form.isSizeManaged}
                  onChange={(v) => setField("isSizeManaged", v)}
                  label="Size-managed product"
                  description="Sold by size. Stock is set per size under Sizes, and the product cannot be published until at least one size has stock."
                />
                <ToggleSwitch
                  checked={form.featured}
                  onChange={(v) => setField("featured", v)}
                  label="Featured"
                  description="Show in featured sections on homepage"
                />
                <ToggleSwitch
                  checked={form.newArrival}
                  onChange={(v) => setField("newArrival", v)}
                  label="New Arrival"
                  description="Tag product as a new arrival"
                />
                <ToggleSwitch
                  checked={form.bestSeller}
                  onChange={(v) => setField("bestSeller", v)}
                  label="Best Seller"
                  description="Tag product as a best seller"
                />
                </div>
              </div>
            )}
          </div>

          {/* ── Sheet footer ─────────────────────────────────────────────── */}
          <SheetFooter className="sticky bottom-0 bg-white border-t border-neutral-200 px-6 py-4 flex flex-row items-center justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 0}
              className="flex items-center gap-1"
            >
              <ChevronLeft className="h-4 w-4" /> Back
            </Button>

            <div className="flex gap-2">
              {currentStep < STEPS.length - 1 ? (
                <Button type="button" onClick={handleNext} className="flex items-center gap-1 bg-neutral-900 hover:bg-neutral-800">
                  Next <ChevronRight className="h-4 w-4" />
                </Button>
              ) : (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleSave(false)}
                    disabled={isSaving || isPublishing}
                  >
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                    Save Draft
                  </Button>
                  <Button
                    type="button"
                    onClick={() => handleSave(true)}
                    disabled={isSaving || isPublishing}
                    className="bg-neutral-900 hover:bg-amber-700 transition-colors flex items-center gap-1"
                  >
                    {isPublishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    Publish Product
                  </Button>
                </>
              )}
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ── Delete Dialog ───────────────────────────────────────────────────── */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Delete Product
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-semibold text-neutral-900">{productToDelete?.name}</span>?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:justify-end">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
              className="flex items-center gap-1"
            >
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── View Dialog ────────────────────────────────────────────────────── */}
      {viewProduct && (
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="sm:max-w-lg overflow-y-auto max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>{viewProduct.name}</DialogTitle>
              <DialogDescription className="text-xs text-neutral-500">
                {viewProduct.sku} · {viewProduct.category} · {viewProduct.collection}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Image */}
              {viewProduct.images[0] && (
                <div className="aspect-video relative rounded-lg overflow-hidden bg-neutral-100">
                  <Image
                    src={viewProduct.images[0].url}
                    alt={viewProduct.images[0].alt}
                    fill
                    className="object-cover"
                    sizes="512px"
                  />
                </div>
              )}

              {/* Details grid */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <div>
                  <span className="text-neutral-500">Price</span>
                  <p className="font-semibold">₹{viewProduct.price.toLocaleString("en-IN")}</p>
                </div>
                {viewProduct.comparePrice && (
                  <div>
                    <span className="text-neutral-500">Compare at</span>
                    <p className="font-semibold line-through text-neutral-400">₹{viewProduct.comparePrice.toLocaleString("en-IN")}</p>
                  </div>
                )}
                <div>
                  <span className="text-neutral-500">Stock</span>
                  <p className={cn("font-semibold", viewProduct.stock === 0 ? "text-red-600" : viewProduct.stock <= LOW_STOCK_THRESHOLD ? "text-yellow-600" : "text-neutral-900")}>
                    {viewProduct.stock}
                  </p>
                </div>
                <div>
                  <span className="text-neutral-500">Brand</span>
                  <p className="font-medium">{viewProduct.brand}</p>
                </div>
                <div>
                  <span className="text-neutral-500">Fabric</span>
                  <p className="font-medium">{viewProduct.fabric}</p>
                </div>
                <div>
                  <span className="text-neutral-500">Color</span>
                  <p className="font-medium">{viewProduct.color}</p>
                </div>
                <div>
                  <span className="text-neutral-500">Sizes</span>
                  <p className="font-medium">{viewProduct.sizes.join(", ")}</p>
                </div>
                <div>
                  <span className="text-neutral-500">HSN / GST</span>
                  <p className="font-medium">{viewProduct.hsn} / {viewProduct.gst}%</p>
                </div>
              </div>

              {/* Badges */}
              <div className="flex flex-wrap gap-2">
                {viewProduct.active    && <Badge className="bg-green-100 text-green-700">Active</Badge>}
                {!viewProduct.active   && <Badge className="bg-neutral-100 text-neutral-500">Inactive</Badge>}
                {viewProduct.featured  && <Badge className="bg-amber-100 text-amber-800">Featured</Badge>}
                {viewProduct.bestSeller && <Badge className="bg-orange-100 text-orange-700">Best Seller</Badge>}
                {viewProduct.newArrival && <Badge className="bg-green-100 text-green-700">New Arrival</Badge>}
              </div>

              {/* Description */}
              {viewProduct.description && (
                <div>
                  <p className="text-sm font-medium text-neutral-700 mb-1">Description</p>
                  <p className="text-sm text-neutral-600 leading-relaxed">{viewProduct.description}</p>
                </div>
              )}

              {/* Specifications (Phase 1B) */}
              {viewProduct.specifications && (
                Object.values(viewProduct.specifications).some(Boolean)
              ) && (
                <div className="rounded-xl border border-neutral-200 bg-neutral-50/70 p-4 space-y-1.5">
                  <p className="text-sm font-medium text-neutral-700">Model &amp; Fit</p>
                  {viewProduct.specifications.modelInfo  && <p className="text-xs text-neutral-600">{viewProduct.specifications.modelInfo}</p>}
                  {viewProduct.specifications.sizeWorn   && <p className="text-xs text-neutral-500">Wearing: {viewProduct.specifications.sizeWorn}</p>}
                  {viewProduct.specifications.fitGuidance && <p className="text-xs text-neutral-500">Fit: {viewProduct.specifications.fitGuidance}</p>}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setViewDialogOpen(false)}>Close</Button>
              <Button
                onClick={() => {
                  setViewDialogOpen(false);
                  openEdit(viewProduct);
                }}
                className="bg-neutral-900 hover:bg-neutral-800"
              >
                <Edit className="h-4 w-4 mr-1" /> Edit
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
