// Sprint 13 — DAMService
// Enterprise Digital Asset Management — core CRUD & orchestration
// DELTA ONLY — reuses existing supabase client pattern

import { createClient } from '@supabase/supabase-js';
import type {
  DAMAsset,
  DAMAssetVersion,
  DAMTag,
  DAMAuditLog,
  UploadAssetRequest,
  AssetListParams,
  DAMStorageStats,
  DAMAssetType,
  DAMAssetStatus,
} from '@/types/dam';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export class DAMService {
  // ── Asset CRUD ─────────────────────────────────────────────

  static async createAsset(
    tenantId: string,
    uploadedBy: string,
    req: UploadAssetRequest,
    storagePath: string,
    mimeType: string,
    fileSize: number,
    organizationId?: string,
  ): Promise<DAMAsset> {
    const { data, error } = await supabase
      .from('dam_assets')
      .insert({
        tenant_id: tenantId,
        organization_id: organizationId ?? null,
        name: req.name,
        original_filename: req.name,
        asset_type: req.asset_type,
        mime_type: mimeType,
        file_size: fileSize,
        storage_path: storagePath,
        storage_bucket: 'dam-assets',
        folder_path: req.folder_path ?? '/',
        alt_text: req.alt_text ?? null,
        caption: req.caption ?? null,
        description: req.description ?? null,
        uploaded_by: uploadedBy,
        status: 'pending' as DAMAssetStatus,
      })
      .select()
      .single();

    if (error) throw new Error(`DAMService.createAsset: ${error.message}`);

    await this.writeAudit(tenantId, 'asset.created', uploadedBy, null, null, { id: data.id, name: data.name });
    return data as DAMAsset;
  }

  static async getAsset(tenantId: string, assetId: string): Promise<DAMAsset | null> {
    const { data, error } = await supabase
      .from('dam_assets')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('id', assetId)
      .single();

    if (error) return null;
    return data as DAMAsset;
  }

  static async listAssets(params: AssetListParams): Promise<{ assets: DAMAsset[]; total: number }> {
    const page = params.page ?? 1;
    const perPage = Math.min(params.per_page ?? 50, 100);
    const from = (page - 1) * perPage;

    let query = supabase
      .from('dam_assets')
      .select('*', { count: 'exact' })
      .eq('tenant_id', params.tenant_id)
      .range(from, from + perPage - 1)
      .order(params.order_by ?? 'created_at', { ascending: params.order === 'asc' });

    if (params.asset_type) query = query.eq('asset_type', params.asset_type);
    if (params.status) query = query.eq('status', params.status);
    if (params.folder_path) query = query.eq('folder_path', params.folder_path);
    if (params.search) query = query.ilike('name', `%${params.search}%`);

    const { data, error, count } = await query;
    if (error) throw new Error(`DAMService.listAssets: ${error.message}`);

    return { assets: (data ?? []) as DAMAsset[], total: count ?? 0 };
  }

  static async updateAsset(
    tenantId: string,
    assetId: string,
    actorId: string,
    updates: Partial<Pick<DAMAsset, 'name' | 'alt_text' | 'caption' | 'description' | 'folder_path' | 'status' | 'cdn_url' | 'public_url' | 'quality_score' | 'ai_processed'>>,
  ): Promise<DAMAsset> {
    const old = await this.getAsset(tenantId, assetId);

    const { data, error } = await supabase
      .from('dam_assets')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('tenant_id', tenantId)
      .eq('id', assetId)
      .select()
      .single();

    if (error) throw new Error(`DAMService.updateAsset: ${error.message}`);

    await this.writeAudit(tenantId, 'asset.updated', actorId, null, old, data);
    return data as DAMAsset;
  }

  static async deleteAsset(tenantId: string, assetId: string, actorId: string): Promise<void> {
    const asset = await this.getAsset(tenantId, assetId);
    if (!asset) return;

    // Soft-delete: archive
    await this.updateAsset(tenantId, assetId, actorId, { status: 'archived' });
    await this.writeAudit(tenantId, 'asset.archived', actorId, assetId, null, null);
  }

  static async hardDeleteAsset(tenantId: string, assetId: string, actorId: string): Promise<void> {
    const { error } = await supabase
      .from('dam_assets')
      .delete()
      .eq('tenant_id', tenantId)
      .eq('id', assetId);

    if (error) throw new Error(`DAMService.hardDeleteAsset: ${error.message}`);
    await this.writeAudit(tenantId, 'asset.deleted', actorId, assetId, null, null);
  }

  // ── Versions ────────────────────────────────────────────────

  static async createVersion(
    tenantId: string,
    assetId: string,
    createdBy: string,
    storagePath: string,
    fileSize: number,
    changeNote?: string,
  ): Promise<DAMAssetVersion> {
    // Unset current flag on existing versions
    await supabase
      .from('dam_asset_versions')
      .update({ is_current: false })
      .eq('asset_id', assetId);

    const { data: latest } = await supabase
      .from('dam_asset_versions')
      .select('version_number')
      .eq('asset_id', assetId)
      .order('version_number', { ascending: false })
      .limit(1)
      .single();

    const nextVersion = ((latest as { version_number: number } | null)?.version_number ?? 0) + 1;

    const { data, error } = await supabase
      .from('dam_asset_versions')
      .insert({
        asset_id: assetId,
        tenant_id: tenantId,
        version_number: nextVersion,
        storage_path: storagePath,
        file_size: fileSize,
        change_note: changeNote ?? null,
        is_current: true,
        created_by: createdBy,
      })
      .select()
      .single();

    if (error) throw new Error(`DAMService.createVersion: ${error.message}`);
    return data as DAMAssetVersion;
  }

  static async listVersions(tenantId: string, assetId: string): Promise<DAMAssetVersion[]> {
    const { data, error } = await supabase
      .from('dam_asset_versions')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('asset_id', assetId)
      .order('version_number', { ascending: false });

    if (error) throw new Error(`DAMService.listVersions: ${error.message}`);
    return (data ?? []) as DAMAssetVersion[];
  }

  static async restoreVersion(
    tenantId: string,
    assetId: string,
    versionId: string,
    actorId: string,
  ): Promise<DAMAssetVersion> {
    await supabase
      .from('dam_asset_versions')
      .update({ is_current: false })
      .eq('asset_id', assetId);

    const { data, error } = await supabase
      .from('dam_asset_versions')
      .update({ is_current: true })
      .eq('id', versionId)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error) throw new Error(`DAMService.restoreVersion: ${error.message}`);
    await this.writeAudit(tenantId, 'asset.version_restored', actorId, assetId, null, { version_id: versionId });
    return data as DAMAssetVersion;
  }

  // ── Tags ────────────────────────────────────────────────────

  static async upsertTag(
    tenantId: string,
    name: string,
    isAiGenerated = false,
    color?: string,
  ): Promise<DAMTag> {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    const { data, error } = await supabase
      .from('dam_tags')
      .upsert({ tenant_id: tenantId, name, slug, color: color ?? null, is_ai_generated: isAiGenerated }, { onConflict: 'tenant_id,slug' })
      .select()
      .single();

    if (error) throw new Error(`DAMService.upsertTag: ${error.message}`);
    return data as DAMTag;
  }

  static async addTagToAsset(tenantId: string, assetId: string, tagId: string, addedBy: string): Promise<void> {
    const { error } = await supabase
      .from('dam_asset_tags')
      .upsert({ asset_id: assetId, tag_id: tagId, tenant_id: tenantId, added_by: addedBy }, { onConflict: 'asset_id,tag_id' });

    if (error) throw new Error(`DAMService.addTagToAsset: ${error.message}`);

    // Increment usage_count
    await supabase.rpc('increment_dam_tag_usage', { p_tag_id: tagId }).throwOnError();
  }

  static async removeTagFromAsset(tenantId: string, assetId: string, tagId: string): Promise<void> {
    await supabase
      .from('dam_asset_tags')
      .delete()
      .eq('tenant_id', tenantId)
      .eq('asset_id', assetId)
      .eq('tag_id', tagId);
  }

  static async listTags(tenantId: string, search?: string): Promise<DAMTag[]> {
    let query = supabase
      .from('dam_tags')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('usage_count', { ascending: false })
      .limit(200);

    if (search) query = query.ilike('name', `%${search}%`);

    const { data, error } = await query;
    if (error) throw new Error(`DAMService.listTags: ${error.message}`);
    return (data ?? []) as DAMTag[];
  }

  // ── Storage Stats ───────────────────────────────────────────

  static async getStorageStats(tenantId: string): Promise<DAMStorageStats> {
    const { data, error } = await supabase
      .from('dam_assets')
      .select('asset_type, file_size, status')
      .eq('tenant_id', tenantId)
      .neq('status', 'archived');

    if (error) throw new Error(`DAMService.getStorageStats: ${error.message}`);

    const rows = (data ?? []) as { asset_type: DAMAssetType; file_size: number; status: string }[];
    const byType = {} as DAMStorageStats['by_type'];
    let totalSize = 0;

    for (const row of rows) {
      const t = row.asset_type;
      if (!byType[t]) byType[t] = { count: 0, size: 0 };
      byType[t].count += 1;
      byType[t].size += row.file_size;
      totalSize += row.file_size;
    }

    const { count: dupCount } = await supabase
      .from('dam_similarity')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('is_duplicate', true);

    const { count: pendingCount } = await supabase
      .from('dam_processing_jobs')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .in('status', ['queued', 'running']);

    return {
      tenant_id: tenantId,
      total_assets: rows.length,
      total_size_bytes: totalSize,
      by_type: byType,
      duplicates_count: dupCount ?? 0,
      pending_processing: pendingCount ?? 0,
      cdn_hit_ratio: 0, // populated by CDNService metrics
    };
  }

  // ── Audit ───────────────────────────────────────────────────

  static async writeAudit(
    tenantId: string,
    action: string,
    actorId: string,
    assetId: string | null,
    oldValue: Record<string, unknown> | null,
    newValue: Record<string, unknown> | null,
    actorEmail?: string,
  ): Promise<void> {
    await supabase.from('dam_audit').insert({
      tenant_id: tenantId,
      asset_id: assetId,
      action,
      actor_id: actorId,
      actor_email: actorEmail ?? null,
      old_value: oldValue,
      new_value: newValue,
    });
  }

  static async listAuditLogs(
    tenantId: string,
    assetId?: string,
    limit = 50,
  ): Promise<DAMAuditLog[]> {
    let query = supabase
      .from('dam_audit')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (assetId) query = query.eq('asset_id', assetId);

    const { data, error } = await query;
    if (error) throw new Error(`DAMService.listAuditLogs: ${error.message}`);
    return (data ?? []) as DAMAuditLog[];
  }

  // ── Folder Management ───────────────────────────────────────

  static async listFolders(tenantId: string): Promise<string[]> {
    const { data, error } = await supabase
      .from('dam_assets')
      .select('folder_path')
      .eq('tenant_id', tenantId)
      .neq('status', 'archived');

    if (error) throw new Error(`DAMService.listFolders: ${error.message}`);

    const folders = new Set<string>();
    for (const row of (data ?? []) as { folder_path: string }[]) {
      const parts = row.folder_path.split('/').filter(Boolean);
      let path = '/';
      folders.add(path);
      for (const part of parts) {
        path = `${path}${part}/`;
        folders.add(path);
      }
    }
    return Array.from(folders).sort();
  }

  static async moveAssetsToFolder(
    tenantId: string,
    assetIds: string[],
    targetFolder: string,
    actorId: string,
  ): Promise<void> {
    const { error } = await supabase
      .from('dam_assets')
      .update({ folder_path: targetFolder, updated_at: new Date().toISOString() })
      .eq('tenant_id', tenantId)
      .in('id', assetIds);

    if (error) throw new Error(`DAMService.moveAssetsToFolder: ${error.message}`);
    await this.writeAudit(tenantId, 'asset.moved', actorId, null, null, { asset_ids: assetIds, target_folder: targetFolder });
  }
}
