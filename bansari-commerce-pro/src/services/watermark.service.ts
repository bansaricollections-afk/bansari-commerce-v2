// Sprint 13 — WatermarkService
// Watermark detection and application
// DELTA ONLY

import { createClient } from '@supabase/supabase-js';
import { AssetProcessingService } from './asset-processing.service';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export class WatermarkService {
  static async runWatermarkDetection(
    tenantId: string,
    assetId: string,
    jobId: string,
    _imageUrl: string,
  ): Promise<{ has_watermark: boolean; confidence: number }> {
    const start = Date.now();
    try {
      // Stub — replace with CV model
      const result = { has_watermark: false, confidence: 0.02 };
      await AssetProcessingService.saveAIAnalysis(
        tenantId, assetId, 'watermark_detect', 'completed',
        result, undefined, Date.now() - start,
      );
      await AssetProcessingService.completeJob(jobId, result);
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await AssetProcessingService.failJob(jobId, msg);
      throw err;
    }
  }

  static async applyWatermark(
    tenantId: string,
    assetId: string,
    storagePath: string,
    watermarkText: string,
    position: 'center' | 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' = 'bottom-right',
  ): Promise<string> {
    // Stub: In production, use sharp + composite watermark overlay
    // Returns the storage path of the watermarked derivative
    const derivativePath = storagePath.replace(/\.([^.]+)$/, '_watermarked.$1');

    await supabase.from('dam_derivatives').insert({
      asset_id: assetId,
      tenant_id: tenantId,
      derivative_type: 'watermarked',
      storage_path: derivativePath,
      format: 'jpeg',
      file_size: 0,
      transform_params: { watermark_text: watermarkText, position },
    });

    await AssetProcessingService.saveAIAnalysis(
      tenantId, assetId, 'watermark_detect', 'completed',
      { applied: true, text: watermarkText, position }, undefined, 0,
    );

    return derivativePath;
  }
}
