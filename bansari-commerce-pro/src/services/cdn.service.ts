// Sprint 13 — CDNService
// Signed URLs, image transformations, cache invalidation
// DELTA ONLY

import { createClient } from '@supabase/supabase-js';
import type { CDNTransformOptions, SignedURLOptions, DAMDerivative } from '@/types/dam';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const CDN_BASE = process.env.DAM_CDN_BASE_URL ?? '';
const SIGNED_URL_TTL = 3600; // 1 hour default

export class CDNService {
  // ── Signed URLs ────────────────────────────────────────────

  static async createSignedUrl(
    storagePath: string,
    bucket: string,
    options: SignedURLOptions = {},
  ): Promise<string> {
    const expiresIn = options.expires_in ?? SIGNED_URL_TTL;

    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(storagePath, expiresIn, {
        download: options.download ?? false,
        transform: options.transform
          ? {
              width: options.transform.width,
              height: options.transform.height,
              quality: options.transform.quality,
              format: options.transform.format,
              resize: options.transform.fit as 'cover' | 'contain' | 'fill' | undefined,
            }
          : undefined,
      });

    if (error) throw new Error(`CDNService.createSignedUrl: ${error.message}`);
    return data.signedUrl;
  }

  static async createSignedUrls(
    paths: Array<{ path: string; bucket: string }>,
    expiresIn = SIGNED_URL_TTL,
  ): Promise<Map<string, string>> {
    const result = new Map<string, string>();

    await Promise.all(
      paths.map(async ({ path, bucket }) => {
        const url = await this.createSignedUrl(path, bucket, { expires_in: expiresIn });
        result.set(path, url);
      }),
    );

    return result;
  }

  // ── Transform URL Builder ──────────────────────────────────────

  static buildTransformUrl(publicUrl: string, opts: CDNTransformOptions): string {
    if (!CDN_BASE) return publicUrl;

    const params = new URLSearchParams();
    if (opts.width) params.set('w', String(opts.width));
    if (opts.height) params.set('h', String(opts.height));
    if (opts.quality) params.set('q', String(opts.quality));
    if (opts.format) params.set('fm', opts.format);
    if (opts.fit) params.set('fit', opts.fit);
    if (opts.blur) params.set('blur', String(opts.blur));
    if (opts.grayscale) params.set('bw', '1');

    return `${CDN_BASE}/${encodeURIComponent(publicUrl)}?${params.toString()}`;
  }

  static buildResponsiveSrcSet(
    publicUrl: string,
    widths: number[] = [320, 640, 768, 1024, 1280, 1920],
    format: 'webp' | 'avif' = 'webp',
  ): string {
    return widths
      .map((w) => `${this.buildTransformUrl(publicUrl, { width: w, format, quality: 80 })} ${w}w`)
      .join(', ');
  }

  // ── Derivatives (cached resized versions) ────────────────────────

  static async saveDerivative(
    tenantId: string,
    assetId: string,
    derivative: Omit<DAMDerivative, 'id' | 'tenant_id' | 'asset_id' | 'created_at'>,
  ): Promise<DAMDerivative> {
    const { data, error } = await supabase
      .from('dam_derivatives')
      .insert({ ...derivative, tenant_id: tenantId, asset_id: assetId })
      .select()
      .single();

    if (error) throw new Error(`CDNService.saveDerivative: ${error.message}`);
    return data as DAMDerivative;
  }

  static async getDerivative(
    assetId: string,
    derivativeType: DAMDerivative['derivative_type'],
    width?: number,
    height?: number,
  ): Promise<DAMDerivative | null> {
    let query = supabase
      .from('dam_derivatives')
      .select('*')
      .eq('asset_id', assetId)
      .eq('derivative_type', derivativeType);

    if (width) query = query.eq('width', width);
    if (height) query = query.eq('height', height);

    const { data } = await query.limit(1).single();
    return (data as DAMDerivative | null) ?? null;
  }

  static async listDerivatives(assetId: string): Promise<DAMDerivative[]> {
    const { data, error } = await supabase
      .from('dam_derivatives')
      .select('*')
      .eq('asset_id', assetId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`CDNService.listDerivatives: ${error.message}`);
    return (data ?? []) as DAMDerivative[];
  }

  static async invalidateDerivatives(assetId: string): Promise<void> {
    await supabase
      .from('dam_derivatives')
      .delete()
      .eq('asset_id', assetId);
  }

  // ── Public URL ──────────────────────────────────────────────

  static getPublicUrl(storagePath: string, bucket: string): string {
    const { data } = supabase.storage.from(bucket).getPublicUrl(storagePath);
    return data.publicUrl;
  }

  // ── Download Logging ─────────────────────────────────────────

  static async logDownload(
    tenantId: string,
    assetId: string,
    downloadedBy: string,
    derivativeType?: string,
    ip?: string,
    userAgent?: string,
  ): Promise<void> {
    await supabase.from('dam_download_logs').insert({
      asset_id: assetId,
      tenant_id: tenantId,
      downloaded_by: downloadedBy,
      ip_address: ip ?? null,
      user_agent: userAgent ?? null,
      derivative_type: derivativeType ?? null,
    });
  }
}
