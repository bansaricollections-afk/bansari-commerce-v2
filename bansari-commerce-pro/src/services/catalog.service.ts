/**
 * Product Management 2.0 — Catalog Service
 *
 * Provides lookup helpers for all master/reference tables:
 * categories, subcategories, collections, tags, attribute masters, sizes.
 *
 * Uses service-role client (admin-only writes; public reads via RLS).
 * All reads are cached via Next.js fetch cache where applicable.
 * No N+1 queries — each function issues a single SELECT.
 */
import { createServiceRoleClient } from '@/lib/supabase/service';
import {
  mapCategory,
  mapSubcategory,
  mapCollection,
  mapTag,
  mapSize,
  mapSizeChart,
  mapAttributeOption,
} from '@/lib/product-mapper';
import type {
  Category,
  Subcategory,
  Collection,
  Tag,
  SizeEntry,
  SizeChart,
  AttributeOption,
  DbAttrTable,
  DbCategory,
  DbSubcategory,
  DbCollection,
  DbTag,
  DbSizeMaster,
  DbSizeChart,
  DbAttributeOption,
} from '@/types/product-v2';
import { ProductError } from '@/lib/product-errors';

// ============================================================
// CATEGORIES
// ============================================================

export async function getCategories(activeOnly = true): Promise<Category[]> {
  const sb = createServiceRoleClient();
  let q = sb
    .from('categories')
    .select('id, name, slug, description, display_order, active, created_at, updated_at')
    .order('display_order', { ascending: true });
  if (activeOnly) q = q.eq('active', true);
  const { data, error } = await q;
  if (error) throw new ProductError(error.message, 'INTERNAL');
  return ((data ?? []) as DbCategory[]).map(mapCategory);
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  const sb = createServiceRoleClient();
  const { data, error } = await sb
    .from('categories')
    .select('id, name, slug, description, display_order, active, created_at, updated_at')
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw new ProductError(error.message, 'INTERNAL');
  return data ? mapCategory(data as DbCategory) : null;
}

export async function getCategoryById(id: number): Promise<Category | null> {
  const sb = createServiceRoleClient();
  const { data, error } = await sb
    .from('categories')
    .select('id, name, slug, description, display_order, active, created_at, updated_at')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new ProductError(error.message, 'INTERNAL');
  return data ? mapCategory(data as DbCategory) : null;
}

export async function createCategory(
  payload: { name: string; slug: string; description?: string; display_order?: number }
): Promise<Category> {
  const sb = createServiceRoleClient();
  const { data, error } = await sb
    .from('categories')
    .insert(payload)
    .select('id, name, slug, description, display_order, active, created_at, updated_at')
    .single();
  if (error) throw new ProductError(error.message, 'INTERNAL');
  return mapCategory(data as DbCategory);
}

export async function updateCategory(
  id: number,
  payload: Partial<{ name: string; slug: string; description: string; display_order: number; active: boolean }>
): Promise<Category> {
  const sb = createServiceRoleClient();
  const { data, error } = await sb
    .from('categories')
    .update(payload)
    .eq('id', id)
    .select('id, name, slug, description, display_order, active, created_at, updated_at')
    .single();
  if (error) throw new ProductError(error.message, 'INTERNAL');
  return mapCategory(data as DbCategory);
}

// ============================================================
// SUBCATEGORIES
// ============================================================

export async function getSubcategories(
  categoryId?: number,
  activeOnly = true
): Promise<Subcategory[]> {
  const sb = createServiceRoleClient();
  let q = sb
    .from('subcategories')
    .select('id, category_id, name, slug, description, display_order, active, created_at, updated_at')
    .order('display_order', { ascending: true });
  if (activeOnly) q = q.eq('active', true);
  if (categoryId !== undefined) q = q.eq('category_id', categoryId);
  const { data, error } = await q;
  if (error) throw new ProductError(error.message, 'INTERNAL');
  return ((data ?? []) as DbSubcategory[]).map(mapSubcategory);
}

// ============================================================
// COLLECTIONS
// ============================================================

export async function getCollections(activeOnly = true): Promise<Collection[]> {
  const sb = createServiceRoleClient();
  let q = sb
    .from('collections')
    .select('id, name, slug, description, banner_url, display_order, active, created_at, updated_at')
    .order('display_order', { ascending: true });
  if (activeOnly) q = q.eq('active', true);
  const { data, error } = await q;
  if (error) throw new ProductError(error.message, 'INTERNAL');
  return ((data ?? []) as DbCollection[]).map(mapCollection);
}

export async function getCollectionBySlug(slug: string): Promise<Collection | null> {
  const sb = createServiceRoleClient();
  const { data, error } = await sb
    .from('collections')
    .select('id, name, slug, description, banner_url, display_order, active, created_at, updated_at')
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw new ProductError(error.message, 'INTERNAL');
  return data ? mapCollection(data as DbCollection) : null;
}

export async function createCollection(
  payload: { name: string; slug: string; description?: string; banner_url?: string; display_order?: number }
): Promise<Collection> {
  const sb = createServiceRoleClient();
  const { data, error } = await sb
    .from('collections')
    .insert(payload)
    .select('id, name, slug, description, banner_url, display_order, active, created_at, updated_at')
    .single();
  if (error) throw new ProductError(error.message, 'INTERNAL');
  return mapCollection(data as DbCollection);
}

export async function updateCollection(
  id: number,
  payload: Partial<{ name: string; slug: string; description: string; banner_url: string; display_order: number; active: boolean }>
): Promise<Collection> {
  const sb = createServiceRoleClient();
  const { data, error } = await sb
    .from('collections')
    .update(payload)
    .eq('id', id)
    .select('id, name, slug, description, banner_url, display_order, active, created_at, updated_at')
    .single();
  if (error) throw new ProductError(error.message, 'INTERNAL');
  return mapCollection(data as DbCollection);
}

// ============================================================
// TAGS
// ============================================================

export async function getTags(): Promise<Tag[]> {
  const sb = createServiceRoleClient();
  const { data, error } = await sb
    .from('tags')
    .select('id, name, slug')
    .order('name', { ascending: true });
  if (error) throw new ProductError(error.message, 'INTERNAL');
  return ((data ?? []) as DbTag[]).map(mapTag);
}

export async function upsertTag(name: string): Promise<Tag> {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const sb = createServiceRoleClient();
  const { data, error } = await sb
    .from('tags')
    .upsert({ name, slug }, { onConflict: 'slug' })
    .select('id, name, slug')
    .single();
  if (error) throw new ProductError(error.message, 'INTERNAL');
  return mapTag(data as DbTag);
}

// ============================================================
// SIZE MASTER
// ============================================================

export async function getSizes(activeOnly = true): Promise<SizeEntry[]> {
  const sb = createServiceRoleClient();
  let q = sb
    .from('size_master')
    .select('id, name, sort_order, active')
    .order('sort_order', { ascending: true });
  if (activeOnly) q = q.eq('active', true);
  const { data, error } = await q;
  if (error) throw new ProductError(error.message, 'INTERNAL');
  return ((data ?? []) as DbSizeMaster[]).map(mapSize);
}

export async function getSizeCharts(): Promise<SizeChart[]> {
  const sb = createServiceRoleClient();
  const { data, error } = await sb
    .from('size_charts')
    .select('id, name, description, chart_data, created_at, updated_at')
    .order('name', { ascending: true });
  if (error) throw new ProductError(error.message, 'INTERNAL');
  return ((data ?? []) as DbSizeChart[]).map(mapSizeChart);
}

// ============================================================
// ATTRIBUTE MASTERS (generic loader)
// ============================================================

export async function getAttributeOptions(
  table: DbAttrTable,
  activeOnly = true
): Promise<AttributeOption[]> {
  const sb = createServiceRoleClient();
  // attr_color has extra 'hex' column; others do not
  const cols =
    table === 'attr_color'
      ? 'id, name, slug, display_order, active, hex'
      : 'id, name, slug, display_order, active';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q = (sb.from(table as any) as any)
    .select(cols)
    .order('display_order', { ascending: true });
  if (activeOnly) q = q.eq('active', true);
  const { data, error } = await q;
  if (error) throw new ProductError(error.message, 'INTERNAL');
  return ((data ?? []) as DbAttributeOption[]).map(mapAttributeOption);
}

export async function createAttributeOption(
  table: DbAttrTable,
  payload: { name: string; slug: string; display_order?: number; hex?: string }
): Promise<AttributeOption> {
  const sb = createServiceRoleClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (sb.from(table as any) as any)
    .insert(payload)
    .select('id, name, slug, display_order, active' + (table === 'attr_color' ? ', hex' : ''))
    .single();
  if (error) throw new ProductError(error.message, 'INTERNAL');
  return mapAttributeOption(data as DbAttributeOption);
}
