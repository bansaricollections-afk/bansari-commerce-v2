// Sprint 13 — SimilarityService
// Perceptual hash + vector embedding duplicate detection
// DELTA ONLY

import { createClient } from '@supabase/supabase-js';
import type { DAMSimilarity } from '@/types/dam';
import { AssetProcessingService } from './asset-processing.service';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const DUPLICATE_THRESHOLD = 0.95; // similarity >= 95% = duplicate

export class SimilarityService {
  static async runDuplicateDetection(
    tenantId: string,
    assetId: string,
    jobId: string,
    perceptualHash?: string,
  ): Promise<DAMSimilarity[]> {
    const start = Date.now();
    try {
      const similarities: DAMSimilarity[] = [];

      if (perceptualHash) {
        // Find assets with same perceptual hash (exact duplicate)
        const { data } = await supabase
          .from('dam_assets')
          .select('id')
          .eq('tenant_id', tenantId)
          .eq('hash_perceptual', perceptualHash)
          .neq('id', assetId)
          .eq('status', 'active')
          .limit(20);

        for (const row of (data ?? []) as { id: string }[]) {
          const sim = await this.recordSimilarity(
            tenantId, assetId, row.id, 1.0, true,
          );
          similarities.push(sim);
        }
      }

      await AssetProcessingService.saveAIAnalysis(
        tenantId, assetId, 'duplicate_detect', 'completed',
        { duplicates_found: similarities.length }, undefined, Date.now() - start,
      );
      await AssetProcessingService.completeJob(jobId, { duplicates_found: similarities.length });
      return similarities;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await AssetProcessingService.failJob(jobId, msg);
      throw err;
    }
  }

  static async recordSimilarity(
    tenantId: string,
    assetId: string,
    similarAssetId: string,
    score: number,
    isDuplicate?: boolean,
  ): Promise<DAMSimilarity> {
    const duplicate = isDuplicate ?? score >= DUPLICATE_THRESHOLD;

    const { data, error } = await supabase
      .from('dam_similarity')
      .upsert(
        {
          tenant_id: tenantId,
          asset_id: assetId,
          similar_asset_id: similarAssetId,
          similarity_score: score,
          is_duplicate: duplicate,
        },
        { onConflict: 'asset_id,similar_asset_id' },
      )
      .select()
      .single();

    if (error) throw new Error(`SimilarityService.recordSimilarity: ${error.message}`);
    return data as DAMSimilarity;
  }

  static async getDuplicates(
    tenantId: string,
    page = 1,
    perPage = 50,
  ): Promise<{ items: DAMSimilarity[]; total: number }> {
    const from = (page - 1) * perPage;

    const { data, error, count } = await supabase
      .from('dam_similarity')
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .eq('is_duplicate', true)
      .order('similarity_score', { ascending: false })
      .range(from, from + perPage - 1);

    if (error) throw new Error(`SimilarityService.getDuplicates: ${error.message}`);
    return { items: (data ?? []) as DAMSimilarity[], total: count ?? 0 };
  }

  static async getSimilarAssets(assetId: string, limit = 12): Promise<DAMSimilarity[]> {
    const { data, error } = await supabase
      .from('dam_similarity')
      .select('*')
      .eq('asset_id', assetId)
      .order('similarity_score', { ascending: false })
      .limit(limit);

    if (error) throw new Error(`SimilarityService.getSimilarAssets: ${error.message}`);
    return (data ?? []) as DAMSimilarity[];
  }

  static async dismissDuplicate(tenantId: string, assetId: string, similarAssetId: string): Promise<void> {
    await supabase
      .from('dam_similarity')
      .update({ is_duplicate: false })
      .eq('tenant_id', tenantId)
      .eq('asset_id', assetId)
      .eq('similar_asset_id', similarAssetId);
  }
}
