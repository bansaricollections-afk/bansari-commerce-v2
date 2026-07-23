// Sprint 13 — VisionAIService
// AI analysis: tags, objects, faces, OCR, captions, color, NSFW, quality
import { createClient } from '@/lib/supabase/server';
import type { DAMAIAnalysis, AITag, ColorPaletteEntry, DetectedObject } from '@/types/dam';

export class VisionAIService {
  private static async db() {
    return createClient();
  }

  static async saveAnalysis(
    tenantId: string,
    assetId: string,
    analysis: Omit<DAMAIAnalysis, 'id' | 'asset_id' | 'tenant_id' | 'created_at'>
  ): Promise<DAMAIAnalysis> {
    const supabase = await this.db();
    const { data, error } = await supabase
      .from('dam_ai_analysis')
      .upsert(
        { ...analysis, asset_id: assetId, tenant_id: tenantId },
        { onConflict: 'asset_id' }
      )
      .select()
      .single();
    if (error) throw new Error(`VisionAIService.saveAnalysis: ${error.message}`);
    return data as DAMAIAnalysis;
  }

  static async getAnalysis(tenantId: string, assetId: string): Promise<DAMAIAnalysis | null> {
    const supabase = await this.db();
    const { data } = await supabase
      .from('dam_ai_analysis')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('asset_id', assetId)
      .single();
    return (data as DAMAIAnalysis) ?? null;
  }

  // Persist AI-generated tags to dam_tags + dam_asset_tags
  static async persistAITags(
    tenantId: string,
    assetId: string,
    aiTags: AITag[]
  ): Promise<void> {
    const supabase = await this.db();
    for (const tag of aiTags) {
      const slug = tag.label.toLowerCase().replace(/\s+/g, '-');
      const { data: existing } = await supabase
        .from('dam_tags')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('slug', slug)
        .single();
      let tagId: string;
      if (existing) {
        tagId = (existing as { id: string }).id;
      } else {
        const { data: newTag } = await supabase
          .from('dam_tags')
          .insert({ tenant_id: tenantId, name: tag.label, slug, is_ai_generated: true })
          .select('id')
          .single();
        tagId = (newTag as { id: string }).id;
      }
      await supabase
        .from('dam_asset_tags')
        .upsert({ asset_id: assetId, tag_id: tagId, confidence: tag.confidence, source: 'ai' }, { onConflict: 'asset_id,tag_id' });
    }
  }

  // Mock analysis builder — replace with OpenAI Vision / Google Vision in production
  static buildMockAnalysis(
    dominantColors: string[]
  ): Omit<DAMAIAnalysis, 'id' | 'asset_id' | 'tenant_id' | 'created_at'> {
    return {
      dominant_colors: dominantColors,
      color_palette: dominantColors.map((hex, i) => ({
        hex,
        rgb: { r: 0, g: 0, b: 0 },
        percentage: Math.round(100 / dominantColors.length),
        name: null,
      } as ColorPaletteEntry)),
      ai_tags: [],
      objects_detected: [] as DetectedObject[],
      faces_detected: 0,
      ocr_text: null,
      caption: null,
      quality_score: null,
      nsfw_score: null,
      watermark_detected: null,
      brand_detected: null,
      embedding: null,
      analysis_model: 'mock-v1',
      analyzed_at: new Date().toISOString(),
    };
  }
}
