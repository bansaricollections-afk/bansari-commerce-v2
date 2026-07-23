// Sprint 13 — VisionAIService
// Delta only — provider-agnostic vision stub ready for Google Vision / AWS Rekognition

import type { SupabaseClient } from '@supabase/supabase-js';
import { AssetProcessingService } from './asset-processing.service';

export interface VisionAnalysisResult {
  tags: Array<{ label: string; confidence: number }>;
  colors: Array<{ hex: string; percent: number }>;
  dominantColor: string | null;
  captionText: string | null;
  qualityScore: number | null;
  isNsfw: boolean;
  hasWatermark: boolean;
  ocrText: string | null;
  objects: Array<{ label: string; confidence: number; boundingBox?: Record<string, number> }>;
  faces: number;
  brands: Array<{ name: string; confidence: number }>;
  embedding: number[] | null;
}

export class VisionAIService {
  private readonly processingService: AssetProcessingService;

  constructor(private readonly sb: SupabaseClient) {
    this.processingService = new AssetProcessingService(sb);
  }

  async analyzeImage(assetId: string, tenantId: string, imageUrl: string): Promise<VisionAnalysisResult> {
    // Provider-agnostic stub — replace with Google Vision / AWS Rekognition / Azure CV
    // This returns a typed placeholder to keep tsc happy until provider is wired
    const result: VisionAnalysisResult = {
      tags: [],
      colors: [],
      dominantColor: null,
      captionText: null,
      qualityScore: null,
      isNsfw: false,
      hasWatermark: false,
      ocrText: null,
      objects: [],
      faces: 0,
      brands: [],
      embedding: null,
    };

    // Save analysis results to dam_ai_analysis
    await this.processingService.saveAIAnalysis(
      assetId,
      tenantId,
      'auto_tag',
      { tags: result.tags },
      undefined,
      'stub-v1',
    );

    await this.processingService.saveAIAnalysis(
      assetId,
      tenantId,
      'color_analysis',
      { colors: result.colors, dominantColor: result.dominantColor },
      undefined,
      'stub-v1',
    );

    if (result.qualityScore !== null) {
      await this.processingService.saveAIAnalysis(
        assetId,
        tenantId,
        'quality_score',
        { score: result.qualityScore },
        result.qualityScore / 100,
        'stub-v1',
      );
    }

    await this.processingService.saveAIAnalysis(
      assetId,
      tenantId,
      'nsfw_detection',
      { isNsfw: result.isNsfw },
      undefined,
      'stub-v1',
    );

    // Update asset metadata with AI results
    await this.sb
      .from('dam_assets')
      .update({
        metadata: result as unknown as Record<string, unknown>,
        status: 'ready',
        updated_at: new Date().toISOString(),
      })
      .eq('id', assetId);

    void imageUrl; // consumed by provider when wired
    return result;
  }

  async generateEmbedding(assetId: string, tenantId: string, imageUrl: string): Promise<number[]> {
    // Stub — wire to OpenAI CLIP or similar
    const embedding: number[] = new Array(512).fill(0);

    await this.sb.from('dam_similarity').upsert({
      asset_id: assetId,
      similar_asset_id: assetId,
      tenant_id: tenantId,
      similarity_score: 1.0,
      is_duplicate: false,
    }, { onConflict: 'asset_id,similar_asset_id' });

    void imageUrl;
    return embedding;
  }
}
