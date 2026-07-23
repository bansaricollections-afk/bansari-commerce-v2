// Sprint 13 — RightsService
// Digital rights management for DAM assets
// DELTA ONLY

import { createClient } from '@supabase/supabase-js';
import type { DAMRights } from '@/types/dam';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export class RightsService {
  static async setRights(
    tenantId: string,
    assetId: string,
    rights: Omit<DAMRights, 'id' | 'tenant_id' | 'asset_id' | 'created_at' | 'updated_at'>,
  ): Promise<DAMRights> {
    const { data, error } = await supabase
      .from('dam_rights')
      .upsert(
        { ...rights, tenant_id: tenantId, asset_id: assetId },
        { onConflict: 'asset_id' },
      )
      .select()
      .single();

    if (error) throw new Error(`RightsService.setRights: ${error.message}`);
    return data as DAMRights;
  }

  static async getRights(tenantId: string, assetId: string): Promise<DAMRights | null> {
    const { data, error } = await supabase
      .from('dam_rights')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('asset_id', assetId)
      .single();

    if (error) return null;
    return data as DAMRights;
  }

  static async checkUsagePermission(
    tenantId: string,
    assetId: string,
    context: 'marketplace' | 'storefront',
    geoCode?: string,
  ): Promise<{ allowed: boolean; reason: string | null }> {
    const rights = await this.getRights(tenantId, assetId);

    if (!rights) return { allowed: true, reason: null };

    // Check expiry
    if (rights.expires_at && new Date(rights.expires_at) < new Date()) {
      return { allowed: false, reason: 'Rights have expired' };
    }

    // Check context
    if (context === 'marketplace' && !rights.marketplace_allowed) {
      return { allowed: false, reason: 'Marketplace usage not permitted' };
    }
    if (context === 'storefront' && !rights.storefront_allowed) {
      return { allowed: false, reason: 'Storefront usage not permitted' };
    }

    // Check geo restrictions
    if (geoCode && rights.geographic_restrictions.length > 0) {
      if (rights.geographic_restrictions.includes(geoCode)) {
        return { allowed: false, reason: `Usage restricted in region: ${geoCode}` };
      }
    }

    return { allowed: true, reason: null };
  }

  static async getExpiringRights(
    tenantId: string,
    withinDays = 30,
  ): Promise<Array<DAMRights & { asset_name: string }>> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + withinDays);

    const { data, error } = await supabase
      .from('dam_rights')
      .select('*, dam_assets!inner(name)')
      .eq('tenant_id', tenantId)
      .not('expires_at', 'is', null)
      .lt('expires_at', cutoff.toISOString())
      .gt('expires_at', new Date().toISOString())
      .order('expires_at', { ascending: true });

    if (error) throw new Error(`RightsService.getExpiringRights: ${error.message}`);
    return (data ?? []) as unknown as Array<DAMRights & { asset_name: string }>;
  }

  static async recordUsage(
    tenantId: string,
    assetId: string,
    contextType: 'product' | 'category' | 'cms' | 'banner' | 'email' | 'storefront' | 'marketplace' | 'vendor',
    contextId: string,
    usedBy: string,
    fieldName?: string,
  ): Promise<void> {
    await supabase.from('dam_usage').insert({
      asset_id: assetId,
      tenant_id: tenantId,
      context_type: contextType,
      context_id: contextId,
      field_name: fieldName ?? null,
      used_by: usedBy,
    });
  }

  static async getAssetUsage(tenantId: string, assetId: string): Promise<number> {
    const { count } = await supabase
      .from('dam_usage')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('asset_id', assetId);

    return count ?? 0;
  }
}
