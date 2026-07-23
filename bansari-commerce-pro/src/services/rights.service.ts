// Sprint 13 — RightsService
// Delta only

import type { SupabaseClient } from '@supabase/supabase-js';
import type { DAMRights } from '@/types/dam';

export class RightsService {
  constructor(private readonly sb: SupabaseClient) {}

  async listRights(input: {
    tenantId: string;
    assetId?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: DAMRights[]; total: number }> {
    const { tenantId, assetId, page = 1, limit = 20 } = input;
    const offset = (page - 1) * limit;

    let query = this.sb
      .from('dam_rights')
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (assetId) query = query.eq('asset_id', assetId);

    const { data, error, count } = await query;
    if (error) throw new Error(`List rights failed: ${error.message}`);

    return { data: (data ?? []) as DAMRights[], total: count ?? 0 };
  }

  async getRights(assetId: string): Promise<DAMRights | null> {
    const { data, error } = await this.sb
      .from('dam_rights')
      .select('*')
      .eq('asset_id', assetId)
      .single();
    if (error) return null;
    return data as DAMRights;
  }

  async createRights(input: Partial<DAMRights> & { createdBy: string; assetId: string; tenantId: string }): Promise<DAMRights> {
    const { data, error } = await this.sb
      .from('dam_rights')
      .insert({
        asset_id: input.assetId,
        tenant_id: input.tenantId,
        license_type: input.license_type ?? 'proprietary',
        copyright_holder: input.copyright_holder ?? null,
        copyright_year: input.copyright_year ?? null,
        attribution_required: input.attribution_required ?? false,
        attribution_text: input.attribution_text ?? null,
        usage_rights: input.usage_rights ?? [],
        restricted_usage: input.restricted_usage ?? [],
        geographic_restrictions: input.geographic_restrictions ?? [],
        brand_restrictions: input.brand_restrictions ?? [],
        marketplace_restrictions: input.marketplace_restrictions ?? [],
        expires_at: input.expires_at ?? null,
        created_by: input.createdBy,
      })
      .select()
      .single();

    if (error) throw new Error(`Create rights failed: ${error.message}`);
    return data as DAMRights;
  }

  async updateRights(id: string, updates: Partial<DAMRights>): Promise<DAMRights> {
    const { data, error } = await this.sb
      .from('dam_rights')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Update rights failed: ${error.message}`);
    return data as DAMRights;
  }

  async checkExpiredRights(): Promise<DAMRights[]> {
    const { data, error } = await this.sb
      .from('dam_rights')
      .select('*')
      .lt('expires_at', new Date().toISOString())
      .not('expires_at', 'is', null);

    if (error) throw new Error(`Check expired rights failed: ${error.message}`);
    return (data ?? []) as DAMRights[];
  }
}
