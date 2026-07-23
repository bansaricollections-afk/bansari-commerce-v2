// Sprint 13 — SimilarityService
// Visual search embeddings, duplicate detection, similarity scoring
import { createClient } from '@/lib/supabase/server';
import type { DAMAsset, DAMSimilarity } from '@/types/dam';

export class SimilarityService {
  private static async db() {
    return createClient();
  }

  static async saveSimilarity(
    assetId: string,
    similarAssetId: string,
    score: number,
    isDuplicate: boolean
  ): Promise<void> {
    const supabase = await this.db();
    await supabase
      .from('dam_similarity')
      .upsert(
        { asset_id: assetId, similar_asset_id: similarAssetId, similarity_score: score, is_duplicate: isDuplicate },
        { onConflict: 'asset_id,similar_asset_id' }
      );
  }

  static async findSimilar(
    tenantId: string,
    assetId: string,
    threshold = 0.8,
    limit = 20
  ): Promise<Array<DAMSimilarity & { asset: DAMAsset }>> {
    const supabase = await this.db();
    const { data } = await supabase
      .from('dam_similarity')
      .select('*, asset:similar_asset_id(id, name, thumbnail_url, asset_type, status)')
      .eq('asset_id', assetId)
      .gte('similarity_score', threshold)
      .order('similarity_score', { ascending: false })
      .limit(limit);
    return (data ?? []) as Array<DAMSimilarity & { asset: DAMAsset }>;
  }

  static async getDuplicates(
    tenantId: string,
    page = 1,
    limit = 50
  ): Promise<DAMSimilarity[]> {
    const supabase = await this.db();
    const { data } = await supabase
      .from('dam_similarity')
      .select('*')
      .eq('is_duplicate', true)
      .order('similarity_score', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);
    return (data ?? []) as DAMSimilarity[];
  }

  // Cosine similarity using pgvector (server-side)
  static async searchByEmbedding(
    tenantId: string,
    embedding: number[],
    limit = 20
  ): Promise<DAMAsset[]> {
    const supabase = await this.db();
    const { data } = await supabase.rpc('dam_similarity_search', {
      query_embedding: embedding,
      match_tenant_id: tenantId,
      match_count: limit,
    });
    return (data ?? []) as DAMAsset[];
  }
}
