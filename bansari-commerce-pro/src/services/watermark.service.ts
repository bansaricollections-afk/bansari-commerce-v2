// Sprint 13 — WatermarkService
// Watermark detection recording and status management
import { createClient } from '@/lib/supabase/server';

export class WatermarkService {
  private static async db() {
    return createClient();
  }

  static async recordWatermarkResult(
    tenantId: string,
    assetId: string,
    detected: boolean
  ): Promise<void> {
    const supabase = await this.db();
    await supabase
      .from('dam_ai_analysis')
      .upsert(
        { asset_id: assetId, tenant_id: tenantId, watermark_detected: detected, analyzed_at: new Date().toISOString() },
        { onConflict: 'asset_id' }
      );
  }

  static async listWatermarked(tenantId: string): Promise<string[]> {
    const supabase = await this.db();
    const { data } = await supabase
      .from('dam_ai_analysis')
      .select('asset_id')
      .eq('tenant_id', tenantId)
      .eq('watermark_detected', true);
    return ((data ?? []) as Array<{ asset_id: string }>).map(r => r.asset_id);
  }
}
