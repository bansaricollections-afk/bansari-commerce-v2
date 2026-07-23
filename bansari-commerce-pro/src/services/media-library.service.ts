// Sprint 13 — MediaLibraryService
// Unified facade: tag management, metadata, usage tracking, search
import { createClient } from '@/lib/supabase/server';
import type { DAMAsset, DAMMetadata, DAMTag, DAMUsage } from '@/types/dam';

export class MediaLibraryService {
  private static async db() {
    return createClient();
  }

  // ---- Tags ----

  static async createTag(tenantId: string, name: string, color?: string): Promise<DAMTag> {
    const supabase = await this.db();
    const slug = name.toLowerCase().replace(/\s+/g, '-');
    const { data, error } = await supabase
      .from('dam_tags')
      .upsert({ tenant_id: tenantId, name, slug, color: color ?? null, is_ai_generated: false }, { onConflict: 'tenant_id,slug' })
      .select()
      .single();
    if (error) throw new Error(`MediaLibraryService.createTag: ${error.message}`);
    return data as DAMTag;
  }

  static async listTags(tenantId: string): Promise<DAMTag[]> {
    const supabase = await this.db();
    const { data } = await supabase
      .from('dam_tags')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('name');
    return (data ?? []) as DAMTag[];
  }

  static async tagAsset(
    assetId: string,
    tagId: string,
    source: 'manual' | 'ai' | 'import' = 'manual'
  ): Promise<void> {
    const supabase = await this.db();
    await supabase
      .from('dam_asset_tags')
      .upsert({ asset_id: assetId, tag_id: tagId, source }, { onConflict: 'asset_id,tag_id' });
  }

  static async untagAsset(assetId: string, tagId: string): Promise<void> {
    const supabase = await this.db();
    await supabase.from('dam_asset_tags').delete().eq('asset_id', assetId).eq('tag_id', tagId);
  }

  // ---- Metadata ----

  static async setMetadata(
    tenantId: string,
    assetId: string,
    key: string,
    value: string,
    dataType: DAMMetadata['data_type'] = 'string'
  ): Promise<void> {
    const supabase = await this.db();
    await supabase
      .from('dam_metadata')
      .upsert(
        { tenant_id: tenantId, asset_id: assetId, key, value, data_type: dataType },
        { onConflict: 'asset_id,key' }
      );
  }

  static async getMetadata(tenantId: string, assetId: string): Promise<DAMMetadata[]> {
    const supabase = await this.db();
    const { data } = await supabase
      .from('dam_metadata')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('asset_id', assetId);
    return (data ?? []) as DAMMetadata[];
  }

  // ---- Usage Tracking ----

  static async recordUsage(
    tenantId: string,
    assetId: string,
    usedBy: string,
    contextType: DAMUsage['context_type'],
    contextId?: string,
    contextName?: string
  ): Promise<void> {
    const supabase = await this.db();
    await supabase.from('dam_usage').insert({
      tenant_id: tenantId,
      asset_id: assetId,
      used_by: usedBy,
      context_type: contextType,
      context_id: contextId ?? null,
      context_name: contextName ?? null,
    });
  }

  static async getUsage(tenantId: string, assetId: string): Promise<DAMUsage[]> {
    const supabase = await this.db();
    const { data } = await supabase
      .from('dam_usage')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('asset_id', assetId)
      .order('used_at', { ascending: false });
    return (data ?? []) as DAMUsage[];
  }

  // ---- Full-text search ----

  static async searchAssets(
    tenantId: string,
    query: string,
    limit = 50
  ): Promise<DAMAsset[]> {
    const supabase = await this.db();
    const { data } = await supabase
      .from('dam_assets')
      .select('*')
      .eq('tenant_id', tenantId)
      .neq('status', 'deleted')
      .textSearch('name', query)
      .limit(limit);
    return (data ?? []) as DAMAsset[];
  }
}
