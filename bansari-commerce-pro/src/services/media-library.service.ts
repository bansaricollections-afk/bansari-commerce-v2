// Sprint 13 — MediaLibraryService
// High-level orchestration: upload, search, usage tracking
// Reuses DAMService, CDNService, AssetProcessingService, RightsService
// DELTA ONLY

import { createClient } from '@supabase/supabase-js';
import { DAMService } from './dam.service';
import { CDNService } from './cdn.service';
import { AssetProcessingService } from './asset-processing.service';
import { RightsService } from './rights.service';
import type { DAMAsset, UploadAssetRequest, AssetListParams, DAMUsage } from '@/types/dam';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const DAM_BUCKET = 'dam-assets';

export class MediaLibraryService {
  /**
   * Full upload pipeline:
   * 1. Upload file to Supabase Storage
   * 2. Create dam_assets record
   * 3. Set public URL
   * 4. Enqueue default AI processing jobs
   * 5. Optionally set default rights
   */
  static async uploadAsset(
    tenantId: string,
    uploadedBy: string,
    file: Buffer,
    fileName: string,
    mimeType: string,
    req: UploadAssetRequest,
    organizationId?: string,
  ): Promise<DAMAsset> {
    // 1. Storage path: tenants/{tenantId}/{folder}/{timestamp}_{filename}
    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const folder = (req.folder_path ?? '/').replace(/^\//, '');
    const storagePath = `tenants/${tenantId}/${folder ? folder + '/' : ''}${Date.now()}_${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from(DAM_BUCKET)
      .upload(storagePath, file, { contentType: mimeType, upsert: false });

    if (uploadError) throw new Error(`MediaLibraryService.uploadAsset storage: ${uploadError.message}`);

    // 2. Create record
    const asset = await DAMService.createAsset(
      tenantId, uploadedBy, req, storagePath, mimeType, file.length, organizationId,
    );

    // 3. Set public URL
    const publicUrl = CDNService.getPublicUrl(storagePath, DAM_BUCKET);
    const updated = await DAMService.updateAsset(tenantId, asset.id, uploadedBy, {
      public_url: publicUrl,
      status: 'active',
    });

    // 4. Enqueue processing
    if (req.auto_process !== false) {
      await AssetProcessingService.enqueueDefaultJobs(tenantId, asset.id, mimeType);
    }

    // 5. Default rights
    await RightsService.setRights(tenantId, asset.id, {
      rights_type: 'proprietary',
      license_name: null,
      license_url: null,
      copyright_holder: null,
      attribution_required: false,
      attribution_text: null,
      expires_at: null,
      geographic_restrictions: [],
      channel_restrictions: [],
      brand_restrictions: [],
      marketplace_allowed: true,
      storefront_allowed: true,
      notes: null,
    });

    return updated;
  }

  static async searchAssets(
    tenantId: string,
    query: string,
    params: Omit<AssetListParams, 'tenant_id' | 'search'> = {},
  ): Promise<{ assets: DAMAsset[]; total: number }> {
    return DAMService.listAssets({ ...params, tenant_id: tenantId, search: query });
  }

  static async getAssetWithSignedUrl(
    tenantId: string,
    assetId: string,
    downloadedBy: string,
    ttl = 3600,
  ): Promise<{ asset: DAMAsset; signedUrl: string } | null> {
    const asset = await DAMService.getAsset(tenantId, assetId);
    if (!asset) return null;

    const signedUrl = await CDNService.createSignedUrl(
      asset.storage_path,
      asset.storage_bucket,
      { expires_in: ttl },
    );

    await CDNService.logDownload(tenantId, assetId, downloadedBy);
    return { asset, signedUrl };
  }

  static async bulkTagAssets(
    tenantId: string,
    assetIds: string[],
    tagName: string,
    actorId: string,
  ): Promise<void> {
    const tag = await DAMService.upsertTag(tenantId, tagName, false);
    await Promise.all(
      assetIds.map((id) => DAMService.addTagToAsset(tenantId, id, tag.id, actorId)),
    );
  }

  static async getUsageReport(tenantId: string, assetId: string): Promise<DAMUsage[]> {
    const { data, error } = await supabase
      .from('dam_usage')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('asset_id', assetId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`MediaLibraryService.getUsageReport: ${error.message}`);
    return (data ?? []) as DAMUsage[];
  }
}
