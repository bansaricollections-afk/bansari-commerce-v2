// Sprint 13 — CDNService
// DELTA ONLY — new service, no existing code modified

import { createClient } from '@/lib/supabase/server';
import type { CDNTransformParams, SignedUrlOptions, DAMDerivative } from '@/types/dam';

const CDN_BASE_URL = process.env.NEXT_PUBLIC_CDN_URL ?? '';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const STORAGE_URL  = `${SUPABASE_URL}/storage/v1`;

export class CDNService {
  // ----------------------------------------------------------------
  // Signed URL generation (Supabase Storage)
  // ----------------------------------------------------------------

  static async createSignedUrl(
    bucket: string,
    path: string,
    options: SignedUrlOptions = {},
  ): Promise<string> {
    const sb = await createClient();
    const expiresIn = options.expiresIn ?? 3600;
    const { data, error } = await sb.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn, {
        download: options.download,
        transform: options.transform
          ? {
              width:   options.transform.width,
              height:  options.transform.height,
              quality: options.transform.quality,
              format:  options.transform.format as 'origin' | undefined,
              resize:  options.transform.fit as 'cover' | 'contain' | 'fill' | undefined,
            }
          : undefined,
      });
    if (error) throw new Error(`CDNService.createSignedUrl: ${error.message}`);
    return data.signedUrl;
  }

  static async createPublicUrl(bucket: string, path: string): Promise<string> {
    const sb = await createClient();
    const { data } = sb.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  }

  // ----------------------------------------------------------------
  // Transform URL builder (Supabase Image Transformation)
  // ----------------------------------------------------------------

  static buildTransformUrl(storagePath: string, params: CDNTransformParams): string {
    const qs = new URLSearchParams();
    if (params.width)   qs.set('width',   String(params.width));
    if (params.height)  qs.set('height',  String(params.height));
    if (params.quality) qs.set('quality', String(params.quality));
    if (params.format)  qs.set('format',  params.format);
    if (params.fit)     qs.set('resize',  params.fit);
    return `${STORAGE_URL}/render/image/public/${storagePath}?${qs.toString()}`;
  }

  // ----------------------------------------------------------------
  // CDN URL resolution (edge-cached public URL)
  // ----------------------------------------------------------------

  static getCDNUrl(storagePath: string, transform?: CDNTransformParams): string {
    const base = CDN_BASE_URL
      ? `${CDN_BASE_URL}/${storagePath}`
      : `${STORAGE_URL}/object/public/${storagePath}`;
    if (!transform) return base;
    const qs = new URLSearchParams();
    if (transform.width)   qs.set('w', String(transform.width));
    if (transform.height)  qs.set('h', String(transform.height));
    if (transform.quality) qs.set('q', String(transform.quality));
    if (transform.format)  qs.set('f', transform.format);
    return `${base}?${qs.toString()}`;
  }

  // ----------------------------------------------------------------
  // Responsive image srcSet builder
  // ----------------------------------------------------------------

  static buildSrcSet(
    storagePath: string,
    widths: number[] = [320, 640, 960, 1280, 1920],
    format: 'webp' | 'avif' | 'jpeg' = 'webp',
  ): string {
    return widths
      .map((w) => `${CDNService.getCDNUrl(storagePath, { width: w, format })} ${w}w`)
      .join(', ');
  }

  // ----------------------------------------------------------------
  // Derivatives management
  // ----------------------------------------------------------------

  static async getDerivative(
    tenantId: string,
    assetId: string,
    derivativeType: string,
    width?: number,
    height?: number,
  ): Promise<DAMDerivative | null> {
    const sb = await createClient();
    let query = sb
      .from('dam_derivatives')
      .select('*')
      .eq('asset_id', assetId)
      .eq('tenant_id', tenantId)
      .eq('derivative_type', derivativeType)
      .eq('is_valid', true);
    if (width)  query = query.eq('width', width);
    if (height) query = query.eq('height', height);
    const { data } = await query.single();
    return data as DAMDerivative | null;
  }

  static async upsertDerivative(
    tenantId: string,
    assetId: string,
    derivative: Omit<DAMDerivative, 'id' | 'created_at'>,
  ): Promise<DAMDerivative> {
    const sb = await createClient();
    const { data, error } = await sb
      .from('dam_derivatives')
      .upsert({ ...derivative, tenant_id: tenantId, asset_id: assetId }, {
        onConflict: 'asset_id,derivative_type,width,height,quality',
      })
      .select()
      .single();
    if (error) throw new Error(`CDNService.upsertDerivative: ${error.message}`);
    return data as DAMDerivative;
  }

  static async invalidateDerivatives(tenantId: string, assetId: string): Promise<void> {
    const sb = await createClient();
    await sb
      .from('dam_derivatives')
      .update({ is_valid: false })
      .eq('asset_id', assetId)
      .eq('tenant_id', tenantId);
  }

  // ----------------------------------------------------------------
  // Download logging
  // ----------------------------------------------------------------

  static async logDownload(
    assetId: string,
    tenantId: string,
    downloadedBy: string | null,
    downloadType: 'original' | 'derivative' | 'cdn',
    bytesTransferred: number,
    ipAddress?: string,
    userAgent?: string,
    derivativeType?: string,
  ): Promise<void> {
    const sb = await createClient();
    await sb.from('dam_download_logs').insert({
      asset_id:           assetId,
      tenant_id:          tenantId,
      downloaded_by:      downloadedBy,
      ip_address:         ipAddress,
      user_agent:         userAgent,
      download_type:      downloadType,
      derivative_type:    derivativeType,
      bytes_transferred:  bytesTransferred,
    });
  }

  // ----------------------------------------------------------------
  // CDN metrics helpers
  // ----------------------------------------------------------------

  static async getCDNMetrics(tenantId: string, since: string): Promise<{
    totalDownloads: number;
    totalBytesTransferred: number;
    cdnHits: number;
    hitRatio: number;
  }> {
    const sb = await createClient();
    const { data } = await sb
      .from('dam_download_logs')
      .select('download_type, bytes_transferred')
      .eq('tenant_id', tenantId)
      .gte('created_at', since);

    const rows = data ?? [];
    const total       = rows.length;
    const cdnHits     = rows.filter((r) => r.download_type === 'cdn').length;
    const totalBytes  = rows.reduce((s, r) => s + (r.bytes_transferred ?? 0), 0);
    return {
      totalDownloads:       total,
      totalBytesTransferred: totalBytes,
      cdnHits,
      hitRatio:             total > 0 ? cdnHits / total : 0,
    };
  }
}
