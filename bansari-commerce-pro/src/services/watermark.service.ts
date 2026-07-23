// Sprint 13 — WatermarkService
// Delta only

import type { SupabaseClient } from '@supabase/supabase-js';
import { AssetProcessingService } from './asset-processing.service';

export interface WatermarkDetectionResult {
  hasWatermark: boolean;
  confidence: number;
  regions: Array<{ x: number; y: number; width: number; height: number }>;
}

export class WatermarkService {
  private readonly processingService: AssetProcessingService;

  constructor(private readonly sb: SupabaseClient) {
    this.processingService = new AssetProcessingService(sb);
  }

  async detectWatermark(assetId: string, tenantId: string, _imageUrl: string): Promise<WatermarkDetectionResult> {
    // Stub — wire to CV provider
    const result: WatermarkDetectionResult = {
      hasWatermark: false,
      confidence: 0,
      regions: [],
    };

    await this.processingService.saveAIAnalysis(
      assetId,
      tenantId,
      'watermark_detection',
      result as unknown as Record<string, unknown>,
      result.confidence,
      'stub-v1',
    );

    return result;
  }

  async applyWatermark(
    assetId: string,
    tenantId: string,
    watermarkText: string,
    position: 'center' | 'bottom-right' | 'bottom-left' = 'bottom-right',
  ): Promise<void> {
    // Enqueue watermark processing job
    await this.processingService.enqueueProcessing(assetId, tenantId, ['watermark_detection'], 3);

    void watermarkText;
    void position;
  }
}
