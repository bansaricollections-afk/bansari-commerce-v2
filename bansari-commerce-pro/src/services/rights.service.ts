// Sprint 13 — RightsService
// DELTA ONLY — new service, no existing code modified

import { createClient } from '@/lib/supabase/server';
import type { DAMRights } from '@/types/dam';

export class RightsService {
  static async upsertRights(
    tenantId: string,
    organizationId: string,
    assetId: string,
    userId: string,
    rights: Omit<DAMRights, 'id' | 'asset_id' | 'tenant_id' | 'organization_id' | 'created_by' | 'created_at' | 'updated_at'>,
  ): Promise<DAMRights> {
    const sb = await createClient();
    const { data, error } = await sb
      .from('dam_rights')
      .upsert(
        {
          ...rights,
          asset_id:        assetId,
          tenant_id:       tenantId,
          organization_id: organizationId,
          created_by:      userId,
          updated_at:      new Date().toISOString(),
        },
        { onConflict: 'asset_id' },
      )
      .select()
      .single();
    if (error) throw new Error(`RightsService.upsertRights: ${error.message}`);
    return data as DAMRights;
  }

  static async getRights(tenantId: string, assetId: string): Promise<DAMRights | null> {
    const sb = await createClient();
    const { data } = await sb
      .from('dam_rights')
      .select('*')
      .eq('asset_id', assetId)
      .eq('tenant_id', tenantId)
      .single();
    return data as DAMRights | null;
  }

  static async checkRightsExpiry(tenantId: string): Promise<DAMRights[]> {
    const sb = await createClient();
    const soon = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days
    const { data, error } = await sb
      .from('dam_rights')
      .select('*')
      .eq('tenant_id', tenantId)
      .not('expires_at', 'is', null)
      .lte('expires_at', soon)
      .order('expires_at', { ascending: true });
    if (error) throw new Error(`RightsService.checkRightsExpiry: ${error.message}`);
    return (data ?? []) as DAMRights[];
  }

  static async enforceGeographicRestriction(
    tenantId: string,
    assetId: string,
    countryCode: string,
  ): Promise<boolean> {
    const rights = await RightsService.getRights(tenantId, assetId);
    if (!rights) return true; // no rights record = unrestricted
    if (!rights.geographic_restrictions?.length) return true;
    return !rights.geographic_restrictions.includes(countryCode);
  }

  static async enforceMarketplaceRestriction(
    tenantId: string,
    assetId: string,
    marketplaceId: string,
  ): Promise<boolean> {
    const rights = await RightsService.getRights(tenantId, assetId);
    if (!rights) return true;
    if (!rights.marketplace_restrictions?.length) return true;
    return !rights.marketplace_restrictions.includes(marketplaceId);
  }

  static async listExpiringRights(
    tenantId: string,
    withinDays = 30,
  ): Promise<DAMRights[]> {
    const sb = await createClient();
    const deadline = new Date(Date.now() + withinDays * 86400_000).toISOString();
    const { data, error } = await sb
      .from('dam_rights')
      .select('*, dam_assets(name, asset_type)')
      .eq('tenant_id', tenantId)
      .not('expires_at', 'is', null)
      .lte('expires_at', deadline);
    if (error) throw new Error(`RightsService.listExpiringRights: ${error.message}`);
    return (data ?? []) as DAMRights[];
  }
}
