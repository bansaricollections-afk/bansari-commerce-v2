// Sprint 13 — DAMService
// Delta only — reuses existing supabase client pattern from product-v2.service.ts

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  DAMAsset,
  UploadAssetInput,
  ListAssetsInput,
} from '@/types/dam';

export class DAMService {
  constructor(private readonly sb: SupabaseClient) {}

  async uploadAsset(input: UploadAssetInput): Promise<DAMAsset> {
    const { file, tenantId, organizationId, folderId, assetType, altText, title, uploadedBy } = input;

    const ext = file.name.split('.').pop() ?? 'bin';
    const safeFilename = `${tenantId}/${Date.now()}-${crypto.randomUUID()}.${ext}`;

    const { error: storageError } = await this.sb.storage
      .from('dam-assets')
      .upload(safeFilename, file, { contentType: file.type, upsert: false });

    if (storageError) throw new Error(`Storage upload failed: ${storageError.message}`);

    const { data: urlData } = this.sb.storage.from('dam-assets').getPublicUrl(safeFilename);

    const { data, error } = await this.sb
      .from('dam_assets')
      .insert({
        tenant_id: tenantId,
        organization_id: organizationId ?? null,
        folder_id: folderId ?? null,
        asset_type: assetType,
        title: title ?? null,
        alt_text: altText ?? null,
        filename: safeFilename,
        original_filename: file.name,
        mime_type: file.type,
        file_size: file.size,
        storage_path: safeFilename,
        storage_bucket: 'dam-assets',
        public_url: urlData.publicUrl,
        status: 'pending',
        is_public: false,
        uploaded_by: uploadedBy,
        version: 1,
        metadata: {},
      })
      .select()
      .single();

    if (error) throw new Error(`DB insert failed: ${error.message}`);
    return data as DAMAsset;
  }

  async listAssets(input: ListAssetsInput): Promise<{ data: DAMAsset[]; total: number }> {
    const { tenantId, folderId, collectionId, assetType, tags, search, status, page = 1, limit = 24 } = input;
    const offset = (page - 1) * limit;

    let query = this.sb
      .from('dam_assets')
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (folderId) query = query.eq('folder_id', folderId);
    if (assetType) query = query.eq('asset_type', assetType);
    if (status) query = query.eq('status', status);
    if (search) query = query.ilike('title', `%${search}%`);

    if (collectionId) {
      const { data: caRows } = await this.sb
        .from('dam_collection_assets')
        .select('asset_id')
        .eq('collection_id', collectionId);
      const ids = (caRows ?? []).map((r: { asset_id: string }) => r.asset_id);
      if (!ids.length) return { data: [], total: 0 };
      query = query.in('id', ids);
    }

    if (tags?.length) {
      const { data: tagRows } = await this.sb
        .from('dam_tags')
        .select('id')
        .eq('tenant_id', tenantId)
        .in('slug', tags);
      const tagIds = (tagRows ?? []).map((r: { id: string }) => r.id);
      if (tagIds.length) {
        const { data: atRows } = await this.sb
          .from('dam_asset_tags')
          .select('asset_id')
          .in('tag_id', tagIds);
        const assetIds = (atRows ?? []).map((r: { asset_id: string }) => r.asset_id);
        if (!assetIds.length) return { data: [], total: 0 };
        query = query.in('id', assetIds);
      }
    }

    const { data, error, count } = await query;
    if (error) throw new Error(`List assets failed: ${error.message}`);

    return { data: (data ?? []) as DAMAsset[], total: count ?? 0 };
  }

  async getAsset(id: string): Promise<DAMAsset | null> {
    const { data, error } = await this.sb
      .from('dam_assets')
      .select('*')
      .eq('id', id)
      .single();
    if (error) return null;
    return data as DAMAsset;
  }

  async updateAsset(id: string, updates: Partial<DAMAsset>): Promise<DAMAsset> {
    const allowed = {
      title: updates.title,
      alt_text: updates.alt_text,
      description: updates.description,
      folder_id: updates.folder_id,
      asset_type: updates.asset_type,
      status: updates.status,
      is_public: updates.is_public,
      expires_at: updates.expires_at,
      metadata: updates.metadata,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await this.sb
      .from('dam_assets')
      .update(allowed)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Update asset failed: ${error.message}`);
    return data as DAMAsset;
  }

  async deleteAsset(id: string): Promise<void> {
    const asset = await this.getAsset(id);
    if (!asset) throw new Error('Asset not found');

    // Delete from storage
    await this.sb.storage.from(asset.storage_bucket).remove([asset.storage_path]);

    const { error } = await this.sb.from('dam_assets').delete().eq('id', id);
    if (error) throw new Error(`Delete asset failed: ${error.message}`);
  }

  async createAsset(input: Partial<DAMAsset> & { uploadedBy: string; tenantId: string }): Promise<DAMAsset> {
    const { data, error } = await this.sb
      .from('dam_assets')
      .insert({
        ...input,
        tenant_id: input.tenantId,
        uploaded_by: input.uploadedBy,
        status: input.status ?? 'pending',
        version: 1,
        metadata: input.metadata ?? {},
      })
      .select()
      .single();
    if (error) throw new Error(`Create asset failed: ${error.message}`);
    return data as DAMAsset;
  }

  async logUsage(assetId: string, tenantId: string, contextType: string, contextId: string, usedBy: string): Promise<void> {
    await this.sb.from('dam_usage').insert({
      asset_id: assetId,
      tenant_id: tenantId,
      context_type: contextType,
      context_id: contextId,
      used_by: usedBy,
    });
  }

  async auditLog(tenantId: string, action: string, actorId: string, details: Record<string, unknown>, assetId?: string): Promise<void> {
    await this.sb.from('dam_audit').insert({
      asset_id: assetId ?? null,
      tenant_id: tenantId,
      action,
      actor_id: actorId,
      details,
    });
  }
}
