// Sprint 13 — CollectionService
// Manages DAM collections, albums, smart collections
// DELTA ONLY

import { createClient } from '@supabase/supabase-js';
import type { DAMCollection, DAMAsset, SmartCollectionRule } from '@/types/dam';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export class CollectionService {
  static async createCollection(
    tenantId: string,
    createdBy: string,
    name: string,
    description?: string,
    isSmart = false,
    smartRules?: SmartCollectionRule[],
    organizationId?: string,
  ): Promise<DAMCollection> {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now();

    const { data, error } = await supabase
      .from('dam_collections')
      .insert({
        tenant_id: tenantId,
        organization_id: organizationId ?? null,
        name,
        slug,
        description: description ?? null,
        is_smart: isSmart,
        smart_rules: smartRules ?? null,
        created_by: createdBy,
      })
      .select()
      .single();

    if (error) throw new Error(`CollectionService.createCollection: ${error.message}`);
    return data as DAMCollection;
  }

  static async getCollection(tenantId: string, collectionId: string): Promise<DAMCollection | null> {
    const { data, error } = await supabase
      .from('dam_collections')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('id', collectionId)
      .single();

    if (error) return null;
    return data as DAMCollection;
  }

  static async listCollections(tenantId: string): Promise<DAMCollection[]> {
    const { data, error } = await supabase
      .from('dam_collections')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('name', { ascending: true });

    if (error) throw new Error(`CollectionService.listCollections: ${error.message}`);
    return (data ?? []) as DAMCollection[];
  }

  static async addAssetsToCollection(
    tenantId: string,
    collectionId: string,
    assetIds: string[],
    addedBy: string,
  ): Promise<void> {
    const rows = assetIds.map((assetId, i) => ({
      collection_id: collectionId,
      asset_id: assetId,
      tenant_id: tenantId,
      sort_order: i,
      added_by: addedBy,
    }));

    const { error } = await supabase
      .from('dam_collection_assets')
      .upsert(rows, { onConflict: 'collection_id,asset_id' });

    if (error) throw new Error(`CollectionService.addAssetsToCollection: ${error.message}`);

    // Update asset_count
    await this.syncAssetCount(collectionId);
  }

  static async removeAssetsFromCollection(
    tenantId: string,
    collectionId: string,
    assetIds: string[],
  ): Promise<void> {
    const { error } = await supabase
      .from('dam_collection_assets')
      .delete()
      .eq('tenant_id', tenantId)
      .eq('collection_id', collectionId)
      .in('asset_id', assetIds);

    if (error) throw new Error(`CollectionService.removeAssetsFromCollection: ${error.message}`);
    await this.syncAssetCount(collectionId);
  }

  static async getCollectionAssets(
    tenantId: string,
    collectionId: string,
    page = 1,
    perPage = 50,
  ): Promise<{ assets: DAMAsset[]; total: number }> {
    const from = (page - 1) * perPage;

    const { data, error, count } = await supabase
      .from('dam_collection_assets')
      .select('asset_id, dam_assets!inner(*)', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .eq('collection_id', collectionId)
      .order('sort_order', { ascending: true })
      .range(from, from + perPage - 1);

    if (error) throw new Error(`CollectionService.getCollectionAssets: ${error.message}`);

    const assets = ((data ?? []) as unknown as { dam_assets: DAMAsset }[]).map((r) => r.dam_assets);
    return { assets, total: count ?? 0 };
  }

  static async evaluateSmartCollection(tenantId: string, collectionId: string): Promise<void> {
    const collection = await this.getCollection(tenantId, collectionId);
    if (!collection?.is_smart || !collection.smart_rules?.length) return;

    // Build dynamic query from rules
    let query = supabase
      .from('dam_assets')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('status', 'active');

    for (const rule of collection.smart_rules) {
      if (rule.operator === 'equals') {
        query = query.eq(rule.field, rule.value);
      } else if (rule.operator === 'contains' && typeof rule.value === 'string') {
        query = query.ilike(rule.field, `%${rule.value}%`);
      } else if (rule.operator === 'gt' && typeof rule.value === 'number') {
        query = query.gt(rule.field, rule.value);
      } else if (rule.operator === 'lt' && typeof rule.value === 'number') {
        query = query.lt(rule.field, rule.value);
      } else if (rule.operator === 'in' && Array.isArray(rule.value)) {
        query = query.in(rule.field, rule.value as string[]);
      }
    }

    const { data } = await query;
    const assetIds = ((data ?? []) as { id: string }[]).map((r) => r.id);

    // Replace collection assets
    await supabase
      .from('dam_collection_assets')
      .delete()
      .eq('collection_id', collectionId);

    if (assetIds.length > 0) {
      const system = '00000000-0000-0000-0000-000000000000';
      await this.addAssetsToCollection(tenantId, collectionId, assetIds, system);
    }
  }

  static async deleteCollection(tenantId: string, collectionId: string): Promise<void> {
    const { error } = await supabase
      .from('dam_collections')
      .delete()
      .eq('tenant_id', tenantId)
      .eq('id', collectionId);

    if (error) throw new Error(`CollectionService.deleteCollection: ${error.message}`);
  }

  private static async syncAssetCount(collectionId: string): Promise<void> {
    const { count } = await supabase
      .from('dam_collection_assets')
      .select('id', { count: 'exact', head: true })
      .eq('collection_id', collectionId);

    await supabase
      .from('dam_collections')
      .update({ asset_count: count ?? 0, updated_at: new Date().toISOString() })
      .eq('id', collectionId);
  }
}
