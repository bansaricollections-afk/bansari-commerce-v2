// Sprint 13 — MediaLibraryService
// Delta only

import type { SupabaseClient } from '@supabase/supabase-js';
import type { DAMAsset, DAMFolder } from '@/types/dam';

export class MediaLibraryService {
  constructor(private readonly sb: SupabaseClient) {}

  async browse(input: {
    tenantId: string;
    folderId?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ folders: DAMFolder[]; assets: DAMAsset[]; total: number }> {
    const { tenantId, folderId, search, page = 1, limit = 24 } = input;
    const offset = (page - 1) * limit;

    // Get sub-folders
    let folderQuery = this.sb
      .from('dam_folders')
      .select('*')
      .eq('tenant_id', tenantId);

    if (folderId) {
      folderQuery = folderQuery.eq('parent_id', folderId);
    } else {
      folderQuery = folderQuery.is('parent_id', null);
    }

    const { data: folders } = await folderQuery.order('name');

    // Get assets in folder
    let assetQuery = this.sb
      .from('dam_assets')
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (folderId) {
      assetQuery = assetQuery.eq('folder_id', folderId);
    } else {
      assetQuery = assetQuery.is('folder_id', null);
    }

    if (search) assetQuery = assetQuery.ilike('title', `%${search}%`);

    const { data: assets, count } = await assetQuery;

    return {
      folders: (folders ?? []) as DAMFolder[],
      assets: (assets ?? []) as DAMAsset[],
      total: count ?? 0,
    };
  }

  async createFolder(input: {
    tenantId: string;
    organizationId?: string;
    parentId?: string;
    name: string;
    description?: string;
    createdBy: string;
  }): Promise<DAMFolder> {
    const parentPath = input.parentId
      ? await this.getFolderPath(input.parentId)
      : '';

    const path = parentPath ? `${parentPath}/${input.name}` : input.name;

    const { data, error } = await this.sb
      .from('dam_folders')
      .insert({
        tenant_id: input.tenantId,
        organization_id: input.organizationId ?? null,
        parent_id: input.parentId ?? null,
        name: input.name,
        path,
        description: input.description ?? null,
        created_by: input.createdBy,
      })
      .select()
      .single();

    if (error) throw new Error(`Create folder failed: ${error.message}`);
    return data as DAMFolder;
  }

  async moveAsset(assetId: string, targetFolderId: string | null): Promise<void> {
    const { error } = await this.sb
      .from('dam_assets')
      .update({ folder_id: targetFolderId, updated_at: new Date().toISOString() })
      .eq('id', assetId);

    if (error) throw new Error(`Move asset failed: ${error.message}`);
  }

  async deleteFolder(folderId: string): Promise<void> {
    // Move child assets to root first
    await this.sb
      .from('dam_assets')
      .update({ folder_id: null })
      .eq('folder_id', folderId);

    const { error } = await this.sb.from('dam_folders').delete().eq('id', folderId);
    if (error) throw new Error(`Delete folder failed: ${error.message}`);
  }

  private async getFolderPath(folderId: string): Promise<string> {
    const { data } = await this.sb
      .from('dam_folders')
      .select('path')
      .eq('id', folderId)
      .single();
    return (data as { path: string } | null)?.path ?? '';
  }
}
