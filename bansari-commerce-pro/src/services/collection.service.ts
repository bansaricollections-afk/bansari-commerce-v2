// Sprint 13 — CollectionService
// Delta only

import type { SupabaseClient } from '@supabase/supabase-js';
import type { DAMCollection, DAMCollectionAsset } from '@/types/dam';

export class CollectionService {
  constructor(private readonly sb: SupabaseClient) {}

  async listCollections(input: {
    tenantId: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: DAMCollection[]; total: number }> {
    const { tenantId, page = 1, limit = 20 } = input;
    const offset = (page - 1) * limit;

    const { data, error, count } = await this.sb
      .from('dam_collections')
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw new Error(`List collections failed: ${error.message}`);
    return { data: (data ?? []) as DAMCollection[], total: count ?? 0 };
  }

  async getCollection(id: string): Promise<DAMCollection | null> {
    const { data, error } = await this.sb
      .from('dam_collections')
      .select('*')
      .eq('id', id)
      .single();
    if (error) return null;
    return data as DAMCollection;
  }

  async createCollection(input: Partial<DAMCollection> & { createdBy: string; tenantId: string }): Promise<DAMCollection> {
    const { data, error } = await this.sb
      .from('dam_collections')
      .insert({
        tenant_id: input.tenantId,
        organization_id: input.organization_id ?? null,
        name: input.name,
        description: input.description ?? null,
        is_smart: input.is_smart ?? false,
        smart_rules: input.smart_rules ?? null,
        cover_asset_id: input.cover_asset_id ?? null,
        created_by: input.createdBy,
      })
      .select()
      .single();

    if (error) throw new Error(`Create collection failed: ${error.message}`);
    return data as DAMCollection;
  }

  async updateCollection(id: string, updates: Partial<DAMCollection>): Promise<DAMCollection> {
    const { data, error } = await this.sb
      .from('dam_collections')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Update collection failed: ${error.message}`);
    return data as DAMCollection;
  }

  async deleteCollection(id: string): Promise<void> {
    await this.sb.from('dam_collection_assets').delete().eq('collection_id', id);
    const { error } = await this.sb.from('dam_collections').delete().eq('id', id);
    if (error) throw new Error(`Delete collection failed: ${error.message}`);
  }

  async addAssetToCollection(collectionId: string, assetId: string, addedBy: string): Promise<DAMCollectionAsset> {
    const { data: existing } = await this.sb
      .from('dam_collection_assets')
      .select('sort_order')
      .eq('collection_id', collectionId)
      .order('sort_order', { ascending: false })
      .limit(1)
      .single();

    const sortOrder = ((existing as { sort_order: number } | null)?.sort_order ?? 0) + 1;

    const { data, error } = await this.sb
      .from('dam_collection_assets')
      .insert({ collection_id: collectionId, asset_id: assetId, sort_order: sortOrder, added_by: addedBy })
      .select()
      .single();

    if (error) throw new Error(`Add asset to collection failed: ${error.message}`);
    return data as DAMCollectionAsset;
  }

  async removeAssetFromCollection(collectionId: string, assetId: string): Promise<void> {
    const { error } = await this.sb
      .from('dam_collection_assets')
      .delete()
      .eq('collection_id', collectionId)
      .eq('asset_id', assetId);

    if (error) throw new Error(`Remove asset from collection failed: ${error.message}`);
  }
}
