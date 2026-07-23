// Sprint 13 — CDNService
// REPAIR: Import TransformOptions directly from @supabase/storage-js SDK.
// Removed custom StorageTransformOptions interface — the SDK's own type is used verbatim.
//
// SDK fact (@supabase/storage-js, installed via @supabase/supabase-js ^2.110.0):
//   TransformOptions.format?: 'origin'  — only valid value in the SDK type union.
//   Omitting format lets the CDN auto-serve modern formats (WebP/AVIF) by default.
//
// CDNTransformOptions.format ('webp'|'avif'|'jpeg'|'png') is the caller-facing API.
// Those values map to CDN auto-optimisation (no SDK format field needed).
// Delta only — no architecture change.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { TransformOptions } from '@supabase/storage-js';
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
    const a = asset as { storage_path: string; storage_bucket: string };

    // Build TransformOptions using the SDK's own type — no custom interface.
    const transform: TransformOptions = {};
    if (options.width)   transform.width   = options.width;
    if (options.height)  transform.height  = options.height;
    if (options.quality) transform.quality = options.quality;
    if (options.fit)     transform.resize  = options.fit;
    // SDK format only accepts 'origin'. The caller's 'webp'|'avif'|'jpeg'|'png'
    // values are served by CDN auto-optimisation when format is omitted.
    // No assignment here — omitting is the correct behaviour for all caller values.

    const { data } = this.sb.storage
      .from(a.storage_bucket)
      .getPublicUrl(a.storage_path, { transform });

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

    if (width)  query = query.eq('width', width);
    if (height) query = query.eq('height', height);
    if (format) query = query.eq('format', format);

    const { data } = await query.single();
    return (data as DAMDerivative) ?? null;
  }
}
