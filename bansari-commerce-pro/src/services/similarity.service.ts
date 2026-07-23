// Sprint 13 — SimilarityService
// Delta only

import type { SupabaseClient } from '@supabase/supabase-js';
import type { DAMSimilarity } from '@/types/dam';

export class SimilarityService {
  constructor(private readonly sb: SupabaseClient) {}

  async findSimilar(assetId: string, tenantId: string, threshold = 0.85): Promise<DAMSimilarity[]> {
    const { data, error } = await this.sb
      .from('dam_similarity')
      .select('*')
      .eq('asset_id', assetId)
      .eq('tenant_id', tenantId)
      .gte('similarity_score', threshold)
      .neq('similar_asset_id', assetId)
      .order('similarity_score', { ascending: false });

    if (error) throw new Error(`Find similar failed: ${error.message}`);
    return (data ?? []) as DAMSimilarity[];
  }

  async findDuplicates(tenantId: string): Promise<DAMSimilarity[]> {
    const { data, error } = await this.sb
      .from('dam_similarity')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_duplicate', true)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Find duplicates failed: ${error.message}`);
    return (data ?? []) as DAMSimilarity[];
  }

  async saveSimilarity(input: Omit<DAMSimilarity, 'id' | 'created_at'>): Promise<void> {
    const { error } = await this.sb
      .from('dam_similarity')
      .upsert(input, { onConflict: 'asset_id,similar_asset_id' });

    if (error) throw new Error(`Save similarity failed: ${error.message}`);
  }

  async markDuplicate(assetId: string, similarAssetId: string, tenantId: string): Promise<void> {
    const { error } = await this.sb
      .from('dam_similarity')
      .update({ is_duplicate: true })
      .eq('asset_id', assetId)
      .eq('similar_asset_id', similarAssetId)
      .eq('tenant_id', tenantId);

    if (error) throw new Error(`Mark duplicate failed: ${error.message}`);
  }
}
