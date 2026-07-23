// Sprint 13 — CDNService
// Delta only — uses Supabase Storage transform API

import type { SupabaseClient } from '@supabase/supabase-js';
import type { CDNTransformOptions, DAMDerivative } from '@/types/dam';

export class CDNService {
  constructor(private readonly sb: SupabaseClient) {}

  async getTransformedUrl(assetId: string, options: CDNTransformOptions): Promise<string> {
    const { data: asset } = await this.sb
      .from('dam_assets')
      .select('storage_path, storage_bucket')
      .eq('id', assetId)
      .single();

    if (!asset) throw new Error('Asset not found');

    const transformOptions: Record<string, unknown> = {};
    if (options.width) transformOptions.width = options.width;
    if (options.height) transformOptions.height = options.height;
    if (options.format) transformOptions.format = options.format;
    if (options.quality) transformOptions.quality = options.quality;

    const { data } = await this.sb.storage
      .from((asset as { storage_path: string; storage_bucket: string }).storage_bucket)
      .getPublicUrl((asset as { storage_path: string; storage_bucket: string }).storage_path, {
        transform: transformOptions as Parameters<ReturnType<typeof this.sb.storage.from>['getPublicUrl']>[1] extends undefined ? never : NonNullable<Parameters<ReturnType<typeof this.sb.storage.from>['getPublicUrl']>[1]>['transform'],
      });

    return data.publicUrl;
  }

  async getSignedUrl(assetId: string, expiresIn = 3600): Promise<string> {
    const { data: asset } = await this.sb
      .from('dam_assets')
      .select('storage_path, storage_bucket')
      .eq('id', assetId)
      .single();

    if (!asset) throw new Error('Asset not found');
    const a = asset as { storage_path: string; storage_bucket: string };

    const { data, error } = await this.sb.storage
      .from(a.storage_bucket)
      .createSignedUrl(a.storage_path, expiresIn);

    if (error) throw new Error(`Signed URL failed: ${error.message}`);
    return data.signedUrl;
  }

  async invalidateCache(assetId: string): Promise<void> {
    // Mark derivatives as stale — CDN edge invalidation is handled at infrastructure level
    await this.sb
      .from('dam_derivatives')
      .delete()
      .eq('asset_id', assetId);
  }

  async saveDerivative(input: Omit<DAMDerivative, 'id' | 'created_at'>): Promise<DAMDerivative> {
    const { data, error } = await this.sb
      .from('dam_derivatives')
      .insert(input)
      .select()
      .single();

    if (error) throw new Error(`Save derivative failed: ${error.message}`);
    return data as DAMDerivative;
  }

  async getCachedDerivative(
    assetId: string,
    derivativeType: string,
    width?: number,
    height?: number,
    format?: string,
  ): Promise<DAMDerivative | null> {
    let query = this.sb
      .from('dam_derivatives')
      .select('*')
      .eq('asset_id', assetId)
      .eq('derivative_type', derivativeType);

    if (width) query = query.eq('width', width);
    if (height) query = query.eq('height', height);
    if (format) query = query.eq('format', format);

    const { data } = await query.single();
    return data as DAMDerivative | null;
  }
}
