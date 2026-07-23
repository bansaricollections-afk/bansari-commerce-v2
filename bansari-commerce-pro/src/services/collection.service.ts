// Sprint 13 — CollectionService
// Folders, collections, albums, smart collections
import { createClient } from '@/lib/supabase/server';
import type { DAMCollection, DAMCollectionAsset, DAMFolder } from '@/types/dam';

export class CollectionService {
  private static async db() {
    return createClient();
  }

  // ---- Folders ----

  static async createFolder(
    tenantId: string,
    name: string,
    parentId: string | null,
    createdBy: string,
    organizationId?: string
  ): Promise<DAMFolder> {
    const supabase = await this.db();
    let path = `/${name}`;
    if (parentId) {
      const { data: parent } = await supabase
        .from('dam_folders')
        .select('path')
        .eq('id', parentId)
        .single();
      path = `${(parent as { path: string })?.path ?? ''}/${name}`;
    }
    const { data, error } = await supabase
      .from('dam_folders')
      .insert({ tenant_id: tenantId, organization_id: organizationId ?? null, parent_id: parentId, name, path, created_by: createdBy })
      .select()
      .single();
    if (error) throw new Error(`CollectionService.createFolder: ${error.message}`);
    return data as DAMFolder;
  }

  static async listFolders(tenantId: string, parentId?: string): Promise<DAMFolder[]> {
    const supabase = await this.db();
    let q = supabase.from('dam_folders').select('*').eq('tenant_id', tenantId);
    if (parentId) q = q.eq('parent_id', parentId);
    else q = q.is('parent_id', null);
    const { data } = await q.order('name');
    return (data ?? []) as DAMFolder[];
  }

  // ---- Collections ----

  static async createCollection(
    tenantId: string,
    name: string,
    description: string | null,
    isSmart: boolean,
    smartRules: DAMCollection['smart_rules'],
    createdBy: string
  ): Promise<DAMCollection> {
    const supabase = await this.db();
    const { data, error } = await supabase
      .from('dam_collections')
      .insert({ tenant_id: tenantId, name, description, is_smart: isSmart, smart_rules: smartRules, created_by: createdBy })
      .select()
      .single();
    if (error) throw new Error(`CollectionService.createCollection: ${error.message}`);
    return data as DAMCollection;
  }

  static async listCollections(tenantId: string): Promise<DAMCollection[]> {
    const supabase = await this.db();
    const { data } = await supabase
      .from('dam_collections')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('name');
    return (data ?? []) as DAMCollection[];
  }

  static async addAssetToCollection(
    collectionId: string,
    assetId: string,
    sortOrder: number,
    addedBy: string
  ): Promise<void> {
    const supabase = await this.db();
    await supabase
      .from('dam_collection_assets')
      .upsert({ collection_id: collectionId, asset_id: assetId, sort_order: sortOrder, added_by: addedBy }, { onConflict: 'collection_id,asset_id' });
  }

  static async removeAssetFromCollection(collectionId: string, assetId: string): Promise<void> {
    const supabase = await this.db();
    await supabase
      .from('dam_collection_assets')
      .delete()
      .eq('collection_id', collectionId)
      .eq('asset_id', assetId);
  }

  static async getCollectionAssets(collectionId: string): Promise<DAMCollectionAsset[]> {
    const supabase = await this.db();
    const { data } = await supabase
      .from('dam_collection_assets')
      .select('*')
      .eq('collection_id', collectionId)
      .order('sort_order');
    return (data ?? []) as DAMCollectionAsset[];
  }
}
