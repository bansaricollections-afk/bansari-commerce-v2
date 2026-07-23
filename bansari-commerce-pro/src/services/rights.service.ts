// Sprint 13 — RightsService
// License management, usage rights, geographic/brand/marketplace restrictions
import { createClient } from '@/lib/supabase/server';
import type { DAMRights } from '@/types/dam';

export class RightsService {
  private static async db() {
    return createClient();
  }

  static async upsertRights(
    tenantId: string,
    assetId: string,
    rights: Omit<DAMRights, 'id' | 'asset_id' | 'tenant_id' | 'created_at' | 'updated_at'>
  ): Promise<DAMRights> {
    const supabase = await this.db();
    const { data, error } = await supabase
      .from('dam_rights')
      .upsert(
        { ...rights, asset_id: assetId, tenant_id: tenantId },
        { onConflict: 'asset_id' }
      )
      .select()
      .single();
    if (error) throw new Error(`RightsService.upsertRights: ${error.message}`);
    return data as DAMRights;
  }

  static async getRights(tenantId: string, assetId: string): Promise<DAMRights | null> {
    const supabase = await this.db();
    const { data } = await supabase
      .from('dam_rights')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('asset_id', assetId)
      .single();
    return (data as DAMRights) ?? null;
  }

  static async listExpiring(
    tenantId: string,
    withinDays = 30
  ): Promise<DAMRights[]> {
    const supabase = await this.db();
    const threshold = new Date();
    threshold.setDate(threshold.getDate() + withinDays);
    const { data } = await supabase
      .from('dam_rights')
      .select('*')
      .eq('tenant_id', tenantId)
      .lte('valid_until', threshold.toISOString())
      .gte('valid_until', new Date().toISOString());
    return (data ?? []) as DAMRights[];
  }

  static async checkUsageAllowed(
    tenantId: string,
    assetId: string,
    context: { geography?: string; brand?: string; marketplace?: string }
  ): Promise<{ allowed: boolean; reason: string | null }> {
    const rights = await this.getRights(tenantId, assetId);
    if (!rights) return { allowed: true, reason: null };

    // Check expiry
    if (rights.valid_until && new Date(rights.valid_until) < new Date()) {
      return { allowed: false, reason: 'Rights have expired' };
    }
    // Geographic restriction
    if (context.geography && rights.geographic_restrictions?.includes(context.geography)) {
      return { allowed: false, reason: `Geographic restriction: ${context.geography}` };
    }
    // Brand restriction
    if (context.brand && rights.brand_restrictions?.includes(context.brand)) {
      return { allowed: false, reason: `Brand restriction: ${context.brand}` };
    }
    // Marketplace restriction
    if (context.marketplace && rights.marketplace_restrictions?.includes(context.marketplace)) {
      return { allowed: false, reason: `Marketplace restriction: ${context.marketplace}` };
    }
    return { allowed: true, reason: null };
  }
}
