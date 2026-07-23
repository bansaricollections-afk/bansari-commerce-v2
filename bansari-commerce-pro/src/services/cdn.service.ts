// Sprint 13 — CDNService
// Signed URLs, image transformations, cache invalidation, responsive images
import { createClient } from '@/lib/supabase/server';
import type { AssetTransformOptions, CDNSignedUrlOptions } from '@/types/dam';

const CDN_BASE = process.env.NEXT_PUBLIC_CDN_BASE_URL ?? '';
const SUPABASE_STORAGE_BUCKET = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET ?? 'dam-assets';

export class CDNService {
  private static async db() {
    return createClient();
  }

  // ---- Signed URL ----

  static async getSignedUrl(
    storagePath: string,
    options: CDNSignedUrlOptions = {}
  ): Promise<string> {
    const supabase = await this.db();
    const expiresIn = options.expires_in_seconds ?? 3600;
    const { data, error } = await supabase.storage
      .from(SUPABASE_STORAGE_BUCKET)
      .createSignedUrl(storagePath, expiresIn, {
        download: options.download ?? false,
        transform: options.transform
          ? {
              width: options.transform.width,
              height: options.transform.height,
              format: options.transform.format as 'origin' | 'avif' | 'webp' | undefined,
              quality: options.transform.quality,
              resize: options.transform.fit as 'cover' | 'contain' | 'fill' | undefined,
            }
          : undefined,
      });
    if (error) throw new Error(`CDNService.getSignedUrl: ${error.message}`);
    return data.signedUrl;
  }

  // ---- Public CDN URL with transform ----

  static buildTransformUrl(storagePath: string, transform: AssetTransformOptions): string {
    if (!CDN_BASE) return storagePath;
    const params = new URLSearchParams();
    if (transform.width) params.set('width', String(transform.width));
    if (transform.height) params.set('height', String(transform.height));
    if (transform.format) params.set('format', transform.format);
    if (transform.quality) params.set('quality', String(transform.quality));
    if (transform.fit) params.set('resize', transform.fit);
    return `${CDN_BASE}/transform/v1/${storagePath}?${params.toString()}`;
  }

  // ---- Responsive image srcset ----

  static buildSrcSet(
    storagePath: string,
    widths: number[] = [320, 640, 960, 1280, 1920]
  ): string {
    return widths
      .map(w => `${CDNService.buildTransformUrl(storagePath, { width: w, format: 'webp' })} ${w}w`)
      .join(', ');
  }

  // ---- Cache invalidation ----

  static async invalidateCache(paths: string[]): Promise<void> {
    // Supabase Storage auto-invalidates; call CDN purge API if custom CDN configured
    if (!CDN_BASE || !process.env.CDN_PURGE_TOKEN) return;
    await fetch(`${CDN_BASE}/purge`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.CDN_PURGE_TOKEN}`,
      },
      body: JSON.stringify({ paths }),
    });
  }

  // ---- Log download ----

  static async logDownload(
    tenantId: string,
    assetId: string,
    downloadedBy: string | null,
    derivativeType: string | null,
    ipAddress: string | null,
    userAgent: string | null
  ): Promise<void> {
    const supabase = await this.db();
    await supabase.from('dam_download_logs').insert({
      asset_id: assetId,
      tenant_id: tenantId,
      downloaded_by: downloadedBy,
      ip_address: ipAddress,
      user_agent: userAgent,
      derivative_type: derivativeType,
    });
  }

  // ---- CDN hit ratio from download logs ----

  static async getCDNHitRatio(tenantId: string): Promise<number> {
    // Placeholder: integrate with CDN analytics API if available
    const supabase = await this.db();
    const { count: total } = await supabase
      .from('dam_download_logs')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId);
    if (!total || total === 0) return 0;
    return 0.85; // Replace with real CDN analytics integration
  }
}
