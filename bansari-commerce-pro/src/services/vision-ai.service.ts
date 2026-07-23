// Sprint 13 — VisionAIService
// AI Vision processing: tagging, captioning, object detection, NSFW, quality
// Wraps external AI provider (Google Vision / OpenAI / configurable)
// DELTA ONLY

import { createClient } from '@supabase/supabase-js';
import type { DAMMetadata, AITag, DetectedObject, ColorSwatch } from '@/types/dam';
import { AssetProcessingService } from './asset-processing.service';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export class VisionAIService {
  // ── Metadata Upsert ──────────────────────────────────────────

  static async upsertMetadata(
    tenantId: string,
    assetId: string,
    patch: Partial<Omit<DAMMetadata, 'id' | 'tenant_id' | 'asset_id' | 'created_at' | 'updated_at'>>,
  ): Promise<DAMMetadata> {
    const { data, error } = await supabase
      .from('dam_metadata')
      .upsert(
        { tenant_id: tenantId, asset_id: assetId, ...patch },
        { onConflict: 'asset_id' },
      )
      .select()
      .single();

    if (error) throw new Error(`VisionAIService.upsertMetadata: ${error.message}`);
    return data as DAMMetadata;
  }

  static async getMetadata(tenantId: string, assetId: string): Promise<DAMMetadata | null> {
    const { data } = await supabase
      .from('dam_metadata')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('asset_id', assetId)
      .single();
    return (data as DAMMetadata | null) ?? null;
  }

  // ── Auto Tagging (stub — replace with actual AI provider call) ───────

  static async runAutoTag(
    tenantId: string,
    assetId: string,
    jobId: string,
    imageUrl: string,
  ): Promise<AITag[]> {
    const start = Date.now();
    try {
      // ⚠️ Replace stub with: Google Vision labelDetect / AWS Rekognition / OpenAI vision
      const aiTags: AITag[] = [
        { tag: 'apparel', confidence: 0.97, source: 'vision_ai' },
        { tag: 'fashion', confidence: 0.92, source: 'vision_ai' },
        { tag: 'product', confidence: 0.88, source: 'vision_ai' },
      ];

      // Persist to dam_metadata
      const existing = await this.getMetadata(tenantId, assetId);
      const merged = [...(existing?.ai_tags ?? []), ...aiTags].reduce(
        (acc: AITag[], tag) => {
          if (!acc.find((t) => t.tag === tag.tag)) acc.push(tag);
          return acc;
        },
        [],
      );

      await this.upsertMetadata(tenantId, assetId, { ai_tags: merged });
      await AssetProcessingService.saveAIAnalysis(
        tenantId, assetId, 'auto_tag', 'completed',
        { tags: aiTags }, undefined, Date.now() - start,
      );
      await AssetProcessingService.completeJob(jobId, { tags: aiTags });
      return aiTags;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await AssetProcessingService.failJob(jobId, msg);
      throw err;
    }
  }

  // ── Object Detection ─────────────────────────────────────────

  static async runObjectDetection(
    tenantId: string,
    assetId: string,
    jobId: string,
    _imageUrl: string,
  ): Promise<DetectedObject[]> {
    const start = Date.now();
    try {
      // Stub — replace with provider call
      const objects: DetectedObject[] = [];
      await this.upsertMetadata(tenantId, assetId, { detected_objects: objects });
      await AssetProcessingService.saveAIAnalysis(
        tenantId, assetId, 'object_detect', 'completed',
        { objects }, undefined, Date.now() - start,
      );
      await AssetProcessingService.completeJob(jobId, { objects });
      return objects;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await AssetProcessingService.failJob(jobId, msg);
      throw err;
    }
  }

  // ── Color Analysis ──────────────────────────────────────────

  static async runColorAnalysis(
    tenantId: string,
    assetId: string,
    jobId: string,
    _imageUrl: string,
  ): Promise<{ dominant: string[]; palette: ColorSwatch[] }> {
    const start = Date.now();
    try {
      // Stub — replace with sharp color extraction or provider
      const dominant: string[] = [];
      const palette: ColorSwatch[] = [];
      await this.upsertMetadata(tenantId, assetId, { dominant_colors: dominant, color_palette: palette });
      await AssetProcessingService.saveAIAnalysis(
        tenantId, assetId, 'color_analysis', 'completed',
        { dominant, palette }, undefined, Date.now() - start,
      );
      await AssetProcessingService.completeJob(jobId, { dominant, palette });
      return { dominant, palette };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await AssetProcessingService.failJob(jobId, msg);
      throw err;
    }
  }

  // ── NSFW Detection ──────────────────────────────────────────

  static async runNSFWDetect(
    tenantId: string,
    assetId: string,
    jobId: string,
    _imageUrl: string,
  ): Promise<{ safe: boolean; score: number }> {
    const start = Date.now();
    try {
      // Stub — replace with provider
      const result = { safe: true, score: 0.01 };
      await AssetProcessingService.saveAIAnalysis(
        tenantId, assetId, 'nsfw_detect', 'completed',
        result, undefined, Date.now() - start,
      );
      await AssetProcessingService.completeJob(jobId, result);
      if (!result.safe) {
        // Auto-reject asset
        await supabase
          .from('dam_assets')
          .update({ status: 'rejected' })
          .eq('id', assetId);
      }
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await AssetProcessingService.failJob(jobId, msg);
      throw err;
    }
  }

  // ── Caption Generation ───────────────────────────────────────

  static async runCaptionGeneration(
    tenantId: string,
    assetId: string,
    jobId: string,
    _imageUrl: string,
  ): Promise<string> {
    const start = Date.now();
    try {
      // Stub — replace with OpenAI GPT-4o vision or similar
      const caption = '';
      if (caption) {
        await supabase
          .from('dam_assets')
          .update({ caption })
          .eq('id', assetId);
      }
      await AssetProcessingService.saveAIAnalysis(
        tenantId, assetId, 'caption', 'completed',
        { caption }, undefined, Date.now() - start,
      );
      await AssetProcessingService.completeJob(jobId, { caption });
      return caption;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await AssetProcessingService.failJob(jobId, msg);
      throw err;
    }
  }

  // ── OCR ───────────────────────────────────────────────────

  static async runOCR(
    tenantId: string,
    assetId: string,
    jobId: string,
    _imageUrl: string,
  ): Promise<string> {
    const start = Date.now();
    try {
      // Stub — replace with Google Vision OCR / Tesseract
      const text = '';
      await this.upsertMetadata(tenantId, assetId, { ocr_text: text });
      await AssetProcessingService.saveAIAnalysis(
        tenantId, assetId, 'ocr', 'completed',
        { text }, undefined, Date.now() - start,
      );
      await AssetProcessingService.completeJob(jobId, { text });
      return text;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await AssetProcessingService.failJob(jobId, msg);
      throw err;
    }
  }

  // ── Quality Score ────────────────────────────────────────────

  static async runQualityScore(
    tenantId: string,
    assetId: string,
    jobId: string,
    _imageUrl: string,
  ): Promise<number> {
    const start = Date.now();
    try {
      // Stub: compute 0–100 quality score (blur, exposure, sharpness)
      const score = 80;
      await supabase
        .from('dam_assets')
        .update({ quality_score: score })
        .eq('id', assetId);
      await AssetProcessingService.saveAIAnalysis(
        tenantId, assetId, 'quality_score', 'completed',
        { score }, undefined, Date.now() - start,
      );
      await AssetProcessingService.completeJob(jobId, { score });
      return score;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await AssetProcessingService.failJob(jobId, msg);
      throw err;
    }
  }
}
