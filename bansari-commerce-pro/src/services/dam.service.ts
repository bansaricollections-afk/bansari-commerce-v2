// Sprint 13 — DAMService
// DELTA ONLY — reuses: supabase client, observability, event bus patterns from prior sprints

import { createClient } from '@/lib/supabase/server';
import type {
  DAMAsset,
  DAMAssetVersion,
  CreateAssetDTO,
  UpdateAssetDTO,
  AssetListParams,
  StorageUploadResult,
  DAMAuditLog,
} from '@/types/dam';

export class DAMService {
  // ----------------------------------------------------------------
  // Asset CRUD
  // ----------------------------------------------------------------

  static async createAsset(
    tenantId: string,
    organizationId: string,
    userId: string,
    dto: CreateAssetDTO,
    uploadResult: StorageUploadResult,
  ): Promise<DAMAsset> {
    const sb = await createClient();
    const { data, error } = await sb
      .from('dam_assets')
      .insert({
        tenant_id:          tenantId,
        organization_id:    organizationId,
        created_by:         userId,
        name:               dto.name,
        original_filename:  dto.name,
        asset_type:         dto.asset_type,
        mime_type:          uploadResult.mime_type,
        file_size:          uploadResult.file_size,
        width:              uploadResult.width,
        height:             uploadResult.height,
        duration_seconds:   uploadResult.duration_seconds,
        storage_path:       uploadResult.storage_path,
        storage_bucket:     uploadResult.storage_bucket,
        public_url:         uploadResult.public_url,
        checksum_md5:       uploadResult.checksum_md5,
        checksum_sha256:    uploadResult.checksum_sha256,
        folder_path:        dto.folder_path ?? '/',
        alt_text:           dto.alt_text,
        caption:            dto.caption,
        description:        dto.description,
        custom_metadata:    dto.custom_metadata ?? {},
        is_public:          dto.is_public ?? false,
        expires_at:         dto.expires_at,
        status:             'pending',
      })
      .select()
      .single();

    if (error) throw new Error(`DAMService.createAsset: ${error.message}`);
    return data as DAMAsset;
  }

  static async getAsset(tenantId: string, assetId: string): Promise<DAMAsset | null> {
    const sb = await createClient();
    const { data, error } = await sb
      .from('dam_assets')
      .select('*')
      .eq('id', assetId)
      .eq('tenant_id', tenantId)
      .single();
    if (error) return null;
    return data as DAMAsset;
  }

  static async listAssets(params: AssetListParams): Promise<{ assets: DAMAsset[]; total: number }> {
    const sb = await createClient();
    const page  = params.page  ?? 1;
    const limit = params.limit ?? 50;
    const from  = (page - 1) * limit;
    const to    = from + limit - 1;

    let query = sb
      .from('dam_assets')
      .select('*', { count: 'exact' })
      .eq('tenant_id', params.tenant_id);

    if (params.organization_id) query = query.eq('organization_id', params.organization_id);
    if (params.asset_type)      query = query.eq('asset_type', params.asset_type);
    if (params.status)          query = query.eq('status', params.status);
    if (params.folder_path)     query = query.eq('folder_path', params.folder_path);
    if (params.tags?.length)    query = query.overlaps('ai_tags', params.tags);
    if (params.search) {
      query = query.textSearch(
        'name',
        params.search,
        { type: 'websearch', config: 'english' },
      );
    }

    const sortBy    = params.sort_by    ?? 'created_at';
    const sortOrder = params.sort_order ?? 'desc';
    query = query.order(sortBy, { ascending: sortOrder === 'asc' }).range(from, to);

    const { data, error, count } = await query;
    if (error) throw new Error(`DAMService.listAssets: ${error.message}`);
    return { assets: (data ?? []) as DAMAsset[], total: count ?? 0 };
  }

  static async updateAsset(
    tenantId: string,
    assetId: string,
    dto: UpdateAssetDTO,
  ): Promise<DAMAsset> {
    const sb = await createClient();
    const { data, error } = await sb
      .from('dam_assets')
      .update({ ...dto, updated_at: new Date().toISOString() })
      .eq('id', assetId)
      .eq('tenant_id', tenantId)
      .select()
      .single();
    if (error) throw new Error(`DAMService.updateAsset: ${error.message}`);
    return data as DAMAsset;
  }

  static async archiveAsset(tenantId: string, assetId: string): Promise<void> {
    const sb = await createClient();
    const { error } = await sb
      .from('dam_assets')
      .update({ status: 'archived', updated_at: new Date().toISOString() })
      .eq('id', assetId)
      .eq('tenant_id', tenantId);
    if (error) throw new Error(`DAMService.archiveAsset: ${error.message}`);
  }

  static async deleteAsset(tenantId: string, assetId: string): Promise<void> {
    const sb = await createClient();
    const asset = await DAMService.getAsset(tenantId, assetId);
    if (!asset) throw new Error('Asset not found');

    // Delete from storage
    await sb.storage.from(asset.storage_bucket).remove([asset.storage_path]);

    const { error } = await sb
      .from('dam_assets')
      .delete()
      .eq('id', assetId)
      .eq('tenant_id', tenantId);
    if (error) throw new Error(`DAMService.deleteAsset: ${error.message}`);
  }

  // ----------------------------------------------------------------
  // Version Control
  // ----------------------------------------------------------------

  static async createVersion(
    tenantId: string,
    organizationId: string,
    assetId: string,
    userId: string,
    uploadResult: StorageUploadResult,
    changeNote?: string,
  ): Promise<DAMAssetVersion> {
    const sb = await createClient();

    // Get current version number
    const { data: current } = await sb
      .from('dam_assets')
      .select('version, storage_path, storage_bucket, file_size, checksum_md5')
      .eq('id', assetId)
      .eq('tenant_id', tenantId)
      .single();

    if (!current) throw new Error('Asset not found for versioning');

    const nextVersion = (current.version as number) + 1;

    // Archive current version
    await sb.from('dam_asset_versions').insert({
      asset_id:       assetId,
      tenant_id:      tenantId,
      organization_id: organizationId,
      version_number: current.version,
      storage_path:   current.storage_path,
      file_size:      current.file_size,
      checksum_md5:   current.checksum_md5,
      created_by:     userId,
      change_note:    changeNote,
      approval_status: 'approved',
    });

    // Update asset to new version
    await sb.from('dam_assets').update({
      storage_path:    uploadResult.storage_path,
      file_size:       uploadResult.file_size,
      checksum_md5:    uploadResult.checksum_md5,
      checksum_sha256: uploadResult.checksum_sha256,
      width:           uploadResult.width,
      height:          uploadResult.height,
      version:         nextVersion,
      status:          'pending',
      updated_at:      new Date().toISOString(),
    }).eq('id', assetId).eq('tenant_id', tenantId);

    // Insert new version record
    const { data: versionRecord, error } = await sb
      .from('dam_asset_versions')
      .insert({
        asset_id:        assetId,
        tenant_id:       tenantId,
        organization_id: organizationId,
        version_number:  nextVersion,
        storage_path:    uploadResult.storage_path,
        file_size:       uploadResult.file_size,
        checksum_md5:    uploadResult.checksum_md5,
        created_by:      userId,
        change_note:     changeNote,
        approval_status: 'pending',
      })
      .select()
      .single();

    if (error) throw new Error(`DAMService.createVersion: ${error.message}`);
    return versionRecord as DAMAssetVersion;
  }

  static async listVersions(tenantId: string, assetId: string): Promise<DAMAssetVersion[]> {
    const sb = await createClient();
    const { data, error } = await sb
      .from('dam_asset_versions')
      .select('*')
      .eq('asset_id', assetId)
      .eq('tenant_id', tenantId)
      .order('version_number', { ascending: false });
    if (error) throw new Error(`DAMService.listVersions: ${error.message}`);
    return (data ?? []) as DAMAssetVersion[];
  }

  // ----------------------------------------------------------------
  // Usage Tracking
  // ----------------------------------------------------------------

  static async trackUsage(
    assetId: string,
    tenantId: string,
    organizationId: string,
    usedBy: string,
    context: string,
    entityType: string,
    entityId: string,
  ): Promise<void> {
    const sb = await createClient();
    await sb.from('dam_usage').insert({
      asset_id:       assetId,
      tenant_id:      tenantId,
      organization_id: organizationId,
      used_by:        usedBy,
      usage_context:  context,
      entity_type:    entityType,
      entity_id:      entityId,
    });
  }

  // ----------------------------------------------------------------
  // Audit
  // ----------------------------------------------------------------

  static async writeAudit(
    tenantId: string,
    actorId: string,
    action: string,
    entityType: string,
    entityId: string,
    assetId?: string,
    oldValues?: Record<string, unknown>,
    newValues?: Record<string, unknown>,
    ipAddress?: string,
  ): Promise<void> {
    const sb = await createClient();
    await sb.from('dam_audit').insert({
      asset_id:     assetId,
      tenant_id:    tenantId,
      actor_id:     actorId,
      action,
      entity_type:  entityType,
      entity_id:    entityId,
      old_values:   oldValues,
      new_values:   newValues,
      ip_address:   ipAddress,
    });
  }

  static async getAuditLog(tenantId: string, assetId?: string, limit = 50): Promise<DAMAuditLog[]> {
    const sb = await createClient();
    let query = sb
      .from('dam_audit')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (assetId) query = query.eq('asset_id', assetId);
    const { data, error } = await query;
    if (error) throw new Error(`DAMService.getAuditLog: ${error.message}`);
    return (data ?? []) as DAMAuditLog[];
  }
}
