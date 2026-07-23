// Sprint 13 — CollectionService
// DELTA ONLY — new service (DAM collections, distinct from storefront collections in existing types)

import { createClient } from '@/lib/supabase/server';
import type { DAMCollection, DAMCollectionAsset, SmartCollectionRule } from '@/types/dam';

export class DAMCollectionService {
  static async createCollection(
    tenantId: string,
    organizationId: string,
    userId: string,
    name: string,
    collectionType: DAMCollection['collection_type'] = 'manual',
    description?: string,
    smartRules?: SmartCollectionRule[],
    isPublic = false,
  ): Promise<DAMCollection> {
    const sb = await createClient();
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const { data, error } = await sb
      .from('dam_collections')
      .insert({
        tenant_id:       tenantId,
        organization_id: organizationId,
        created_by:      userId,
        name,
        slug,
        description,
        collection_type: collectionType,
        smart_rules:     smartRules ?? null,
        is_public:       isPublic,
      })
      .select()
      .single();
    if (error) throw new Error(`DAMCollectionService.createCollection: ${error.message}`);
    return data as DAMCollection;
  }

  static async listCollections(
    tenantId: string,
    organizationId?: string,
  ): Promise<DAMCollection[]> {
    const sb = await createClient();
    let query = sb
      .from('dam_collections')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('sort_order', { ascending: true });
    if (organizationId) query = query.eq('organization_id', organizationId);
    const { data, error } = await query;
    if (error) throw new Error(`DAMCollectionService.listCollections: ${error.message}`);
    return (data ?? []) as DAMCollection[];
  }

  static async addAssetToCollection(
    collectionId: string,
    assetId: string,
    addedBy: string,
    sortOrder = 0,
  ): Promise<DAMCollectionAsset> {
    const sb = await createClient();
    const { data, error } = await sb
      .from('dam_collection_assets')
      .upsert(
        { collection_id: collectionId, asset_id: assetId, added_by: addedBy, sort_order: sortOrder },
        { onConflict: 'collection_id,asset_id' },
      )
      .select()
      .single();
    if (error) throw new Error(`DAMCollectionService.addAssetToCollection: ${error.message}`);
    return data as DAMCollectionAsset;
  }

  static async removeAssetFromCollection(
    collectionId: string,
    assetId: string,
  ): Promise<void> {
    const sb = await createClient();
    const { error } = await sb
      .from('dam_collection_assets')
      .delete()
      .eq('collection_id', collectionId)
      .eq('asset_id', assetId);
    if (error) throw new Error(`DAMCollectionService.removeAssetFromCollection: ${error.message}`);
  }

  static async getCollectionAssets(
    collectionId: string,
    page = 1,
    limit = 50,
  ): Promise<{ assets: DAMCollectionAsset[]; total: number }> {
    const sb = await createClient();
    const from = (page - 1) * limit;
    const { data, error, count } = await sb
      .from('dam_collection_assets')
      .select('*, dam_assets(*)', { count: 'exact' })
      .eq('collection_id', collectionId)
      .order('sort_order', { ascending: true })
      .range(from, from + limit - 1);
    if (error) throw new Error(`DAMCollectionService.getCollectionAssets: ${error.message}`);
    return { assets: (data ?? []) as DAMCollectionAsset[], total: count ?? 0 };
  }

  // Evaluate smart collection rules against asset fields
  static async resolveSmartCollection(
    tenantId: string,
    collectionId: string,
  ): Promise<string[]> {
    const sb = await createClient();
    const { data: col } = await sb
      .from('dam_collections')
      .select('smart_rules')
      .eq('id', collectionId)
      .eq('tenant_id', tenantId)
      .single();

    if (!col?.smart_rules?.length) return [];

    const rules = col.smart_rules as SmartCollectionRule[];
    let query = sb.from('dam_assets').select('id').eq('tenant_id', tenantId);

    for (const rule of rules) {
      switch (rule.operator) {
        case 'equals':      query = query.eq(rule.field, rule.value);    break;
        case 'contains':    query = query.ilike(rule.field, `%${rule.value}%`); break;
        case 'starts_with': query = query.ilike(rule.field, `${rule.value}%`); break;
        case 'greater_than': query = query.gt(rule.field, rule.value);   break;
        case 'less_than':   query = query.lt(rule.field, rule.value);    break;
        case 'in':          query = query.in(rule.field, rule.value as string[]); break;
      }
    }

    const { data } = await query;
    return (data ?? []).map((r: { id: string }) => r.id);
  }
}
