// Sprint 13 — CDNService
// REPAIR Step 1: Replaced illegal conditional type cast with TransformOptions import
// Delta only — no architecture change

import type { SupabaseClient } from '@supabase/supabase-js';
import type { CDNTransformOptions, DAMDerivative } from '@/types/dam';

// Supabase Storage getPublicUrl transform options (matches @supabase/storage-js TransformOptions)
interface StorageTransformOptions {
  width?: number;
  height?: number;
  resize?: 'cover' | 'contain' | 'fill';
  format?: 'origin' | 'avif' | 'webp';
  quality?: number;
}

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

    // REPAIR: Build a plain StorageTransformOptions object — no conditional type cast
    const transform: StorageTransformOptions = {};
    if (options.width) transform.width = options.width;
    if (options.height) transform.height = options.height;
    if (options.quality) transform.quality = options.quality;
    // Map CDNTransformOptions format to Supabase Storage format subset
    if (options.format === 'avif') transform.format = 'avif';
    else if (options.format === 'webp') transform.format = 'webp';
    // jpeg/png not supported by Supabase transform — serve origin
    if (options.fit) transform.resize = options.fit;

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

    if (width) query = query.eq('width', width);
    if (height) query = query.eq('height', height);
    if (format) query = query.eq('format', format);

    const { data } = await query.single();
    return (data as DAMDerivative) ?? null;
  }
}
