// Sprint 13 — DAMService
// Core asset CRUD, upload orchestration, versioning, approval workflow
import { createClient } from '@/lib/supabase/server';
import type {
  DAMAsset,
  DAMAuditLog,
  ListAssetsQuery,
  UpdateAssetInput,
  UploadAssetInput,
  DAMStats,
} from '@/types/dam';

export class DAMService {
  private static async db() {
    return createClient();
  }

  // ---- Asset CRUD ----

  static async createAsset(
    tenantId: string,
    input: UploadAssetInput,
    storagePath: string,
    mimeType: string,
    fileSize: number,
    checksum: string,
    uploadedBy: string
  ): Promise<DAMAsset> {
    const supabase = await this.db();
    const { data, error } = await supabase
      .from('dam_assets')
      .insert({
        tenant_id: tenantId,
        name: input.name,
        original_filename: input.name,
        asset_type: input.asset_type,
        mime_type: mimeType,
        file_size: fileSize,
        storage_path: storagePath,
        checksum,
        alt_text: input.alt_text ?? null,
        caption: input.caption ?? null,
        description: input.description ?? null,
        folder_id: input.folder_id ?? null,
        status: 'pending',
        version: 1,
        uploaded_by: uploadedBy,
      })
      .select()
      .single();
    if (error) throw new Error(`DAMService.createAsset: ${error.message}`);
    return data as DAMAsset;
  }

  static async getAsset(tenantId: string, assetId: string): Promise<DAMAsset | null> {
    const supabase = await this.db();
    const { data, error } = await supabase
      .from('dam_assets')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('id', assetId)
      .single();
    if (error) return null;
    return data as DAMAsset;
  }

  static async listAssets(
    query: ListAssetsQuery
  ): Promise<{ assets: DAMAsset[]; total: number }> {
    const supabase = await this.db();
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const offset = (page - 1) * limit;

    let q = supabase
      .from('dam_assets')
      .select('*', { count: 'exact' })
      .eq('tenant_id', query.tenant_id)
      .neq('status', 'deleted');

    if (query.folder_id) q = q.eq('folder_id', query.folder_id);
    if (query.asset_type) q = q.eq('asset_type', query.asset_type);
    if (query.status) q = q.eq('status', query.status);
    if (query.search) q = q.textSearch('name', query.search);

    const sortBy = query.sort_by ?? 'created_at';
    const sortOrder = query.sort_order ?? 'desc';
    q = q.order(sortBy, { ascending: sortOrder === 'asc' }).range(offset, offset + limit - 1);

    const { data, error, count } = await q;
    if (error) throw new Error(`DAMService.listAssets: ${error.message}`);
    return { assets: (data ?? []) as DAMAsset[], total: count ?? 0 };
  }

  static async updateAsset(
    tenantId: string,
    assetId: string,
    input: UpdateAssetInput,
    actorId: string
  ): Promise<DAMAsset> {
    const supabase = await this.db();
    const { data, error } = await supabase
      .from('dam_assets')
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq('tenant_id', tenantId)
      .eq('id', assetId)
      .select()
      .single();
    if (error) throw new Error(`DAMService.updateAsset: ${error.message}`);
    await this.auditLog(tenantId, assetId, actorId, 'update', 'dam_asset', assetId, input);
    return data as DAMAsset;
  }

  static async deleteAsset(tenantId: string, assetId: string, actorId: string): Promise<void> {
    const supabase = await this.db();
    const { error } = await supabase
      .from('dam_assets')
      .update({ status: 'deleted', updated_at: new Date().toISOString() })
      .eq('tenant_id', tenantId)
      .eq('id', assetId);
    if (error) throw new Error(`DAMService.deleteAsset: ${error.message}`);
    await this.auditLog(tenantId, assetId, actorId, 'delete', 'dam_asset', assetId, null);
  }

  // ---- Versioning ----

  static async createVersion(
    tenantId: string,
    assetId: string,
    storagePath: string,
    fileSize: number,
    checksum: string,
    changeNotes: string | null,
    createdBy: string
  ): Promise<void> {
    const supabase = await this.db();
    const asset = await this.getAsset(tenantId, assetId);
    if (!asset) throw new Error('Asset not found');
    await supabase.from('dam_asset_versions').insert({
      asset_id: assetId,
      tenant_id: tenantId,
      version_number: asset.version,
      storage_path: asset.storage_path,
      file_size: asset.file_size,
      checksum: asset.checksum,
      change_notes: changeNotes,
      created_by: createdBy,
    });
    await supabase
      .from('dam_assets')
      .update({
        storage_path: storagePath,
        file_size: fileSize,
        checksum,
        version: asset.version + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', assetId)
      .eq('tenant_id', tenantId);
    await this.auditLog(tenantId, assetId, createdBy, 'version_create', 'dam_asset', assetId, { version: asset.version + 1 });
  }

  // ---- Approval Workflow ----

  static async approveAsset(tenantId: string, assetId: string, approvedBy: string): Promise<void> {
    const supabase = await this.db();
    const { error } = await supabase
      .from('dam_assets')
      .update({ approved_by: approvedBy, approved_at: new Date().toISOString(), status: 'active' })
      .eq('tenant_id', tenantId)
      .eq('id', assetId);
    if (error) throw new Error(`DAMService.approveAsset: ${error.message}`);
    await this.auditLog(tenantId, assetId, approvedBy, 'approve', 'dam_asset', assetId, null);
  }

  static async publishAsset(tenantId: string, assetId: string, actorId: string): Promise<void> {
    const supabase = await this.db();
    const { error } = await supabase
      .from('dam_assets')
      .update({ published_at: new Date().toISOString(), status: 'active' })
      .eq('tenant_id', tenantId)
      .eq('id', assetId);
    if (error) throw new Error(`DAMService.publishAsset: ${error.message}`);
    await this.auditLog(tenantId, assetId, actorId, 'publish', 'dam_asset', assetId, null);
  }

  // ---- Stats ----

  static async getStats(tenantId: string): Promise<DAMStats> {
    const supabase = await this.db();
    const { data: assets } = await supabase
      .from('dam_assets')
      .select('asset_type, file_size, status')
      .eq('tenant_id', tenantId)
      .neq('status', 'deleted');

    const rows = (assets ?? []) as Array<{ asset_type: string; file_size: number; status: string }>;
    const total = rows.length;
    const totalSize = rows.reduce((acc, r) => acc + (r.file_size ?? 0), 0);
    const byType: Record<string, number> = {};
    for (const r of rows) byType[r.asset_type] = (byType[r.asset_type] ?? 0) + 1;
    const expired = rows.filter(r => r.status === 'expired').length;

    const { count: queueDepth } = await supabase
      .from('dam_processing_jobs')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('status', 'queued');

    const { count: duplicates } = await supabase
      .from('dam_similarity')
      .select('*', { count: 'exact', head: true })
      .eq('is_duplicate', true);

    return {
      total_assets: total,
      total_size_bytes: totalSize,
      assets_by_type: byType,
      storage_used_percent: 0,
      processing_queue_depth: queueDepth ?? 0,
      duplicate_count: duplicates ?? 0,
      expired_count: expired,
      cdn_hit_ratio: 0,
    };
  }

  // ---- Audit ----

  static async auditLog(
    tenantId: string,
    assetId: string | null,
    actorId: string,
    action: DAMAuditLog['action'],
    entityType: string,
    entityId: string,
    changes: Record<string, unknown> | null
  ): Promise<void> {
    const supabase = await this.db();
    await supabase.from('dam_audit').insert({
      tenant_id: tenantId,
      asset_id: assetId,
      actor_id: actorId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      changes,
    });
  }

  // ---- Duplicate check by checksum ----

  static async findDuplicateByChecksum(
    tenantId: string,
    checksum: string
  ): Promise<DAMAsset | null> {
    const supabase = await this.db();
    const { data } = await supabase
      .from('dam_assets')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('checksum', checksum)
      .neq('status', 'deleted')
      .limit(1)
      .single();
    return (data as DAMAsset) ?? null;
  }
}
