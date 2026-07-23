// Sprint 13 — Enterprise Digital Asset Management Types
// DELTA ONLY — zero modifications to existing types

export type AssetType =
  | 'image'
  | 'video'
  | '360_image'
  | 'pdf'
  | 'size_chart'
  | 'certificate'
  | 'brand_asset'
  | 'marketing_banner'
  | 'hero_image'
  | 'logo'
  | 'icon'
  | 'social_media'
  | 'document'
  | '3d_model'
  | 'ar_asset';

export type AssetStatus =
  | 'pending'
  | 'processing'
  | 'active'
  | 'archived'
  | 'deleted'
  | 'expired'
  | 'rejected';

export type ProcessingStatus =
  | 'queued'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'skipped';

export type LicenseType =
  | 'royalty_free'
  | 'rights_managed'
  | 'creative_commons'
  | 'proprietary'
  | 'public_domain'
  | 'editorial';

export interface DAMAsset {
  id: string;
  tenant_id: string;
  organization_id: string | null;
  folder_id: string | null;
  name: string;
  original_filename: string;
  asset_type: AssetType;
  mime_type: string;
  file_size: number;
  width: number | null;
  height: number | null;
  duration: number | null;
  storage_path: string;
  public_url: string | null;
  cdn_url: string | null;
  thumbnail_url: string | null;
  status: AssetStatus;
  version: number;
  checksum: string;
  alt_text: string | null;
  caption: string | null;
  description: string | null;
  uploaded_by: string;
  approved_by: string | null;
  approved_at: string | null;
  published_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DAMAssetVersion {
  id: string;
  asset_id: string;
  tenant_id: string;
  version_number: number;
  storage_path: string;
  file_size: number;
  checksum: string;
  change_notes: string | null;
  created_by: string;
  created_at: string;
}

export interface DAMFolder {
  id: string;
  tenant_id: string;
  organization_id: string | null;
  parent_id: string | null;
  name: string;
  path: string;
  description: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface DAMCollection {
  id: string;
  tenant_id: string;
  organization_id: string | null;
  name: string;
  description: string | null;
  is_smart: boolean;
  smart_rules: SmartCollectionRule[] | null;
  cover_asset_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface SmartCollectionRule {
  field: string;
  operator: 'equals' | 'contains' | 'starts_with' | 'in' | 'gt' | 'lt';
  value: string | string[] | number;
}

export interface DAMCollectionAsset {
  id: string;
  collection_id: string;
  asset_id: string;
  sort_order: number;
  added_by: string;
  added_at: string;
}

export interface DAMTag {
  id: string;
  tenant_id: string;
  name: string;
  slug: string;
  color: string | null;
  is_ai_generated: boolean;
  created_at: string;
}

export interface DAMAssetTag {
  asset_id: string;
  tag_id: string;
  confidence: number | null;
  source: 'manual' | 'ai' | 'import';
  created_at: string;
}

export interface DAMMetadata {
  id: string;
  asset_id: string;
  tenant_id: string;
  key: string;
  value: string;
  data_type: 'string' | 'number' | 'boolean' | 'json' | 'date';
  created_at: string;
  updated_at: string;
}

export interface DAMAIAnalysis {
  id: string;
  asset_id: string;
  tenant_id: string;
  dominant_colors: string[] | null;
  color_palette: ColorPaletteEntry[] | null;
  ai_tags: AITag[] | null;
  objects_detected: DetectedObject[] | null;
  faces_detected: number | null;
  ocr_text: string | null;
  caption: string | null;
  quality_score: number | null;
  nsfw_score: number | null;
  watermark_detected: boolean | null;
  brand_detected: string[] | null;
  embedding: number[] | null;
  analysis_model: string | null;
  analyzed_at: string;
  created_at: string;
}

export interface ColorPaletteEntry {
  hex: string;
  rgb: { r: number; g: number; b: number };
  percentage: number;
  name: string | null;
}

export interface AITag {
  label: string;
  confidence: number;
  category: string | null;
}

export interface DetectedObject {
  label: string;
  confidence: number;
  bounding_box: { x: number; y: number; width: number; height: number } | null;
}

export interface DAMRights {
  id: string;
  asset_id: string;
  tenant_id: string;
  license_type: LicenseType;
  copyright_holder: string | null;
  copyright_year: number | null;
  attribution_required: boolean;
  attribution_text: string | null;
  usage_rights: string[] | null;
  geographic_restrictions: string[] | null;
  brand_restrictions: string[] | null;
  marketplace_restrictions: string[] | null;
  valid_from: string | null;
  valid_until: string | null;
  license_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface DAMUsage {
  id: string;
  asset_id: string;
  tenant_id: string;
  context_type: 'product' | 'category' | 'cms' | 'banner' | 'email' | 'social' | 'other';
  context_id: string | null;
  context_name: string | null;
  used_by: string;
  used_at: string;
}

export interface DAMProcessingJob {
  id: string;
  asset_id: string;
  tenant_id: string;
  job_type:
    | 'thumbnail'
    | 'webp_convert'
    | 'avif_convert'
    | 'background_removal'
    | 'ai_analysis'
    | 'ocr'
    | 'compression'
    | 'super_resolution'
    | 'watermark_detection'
    | 'nsfw_detection'
    | 'similarity_embedding'
    | 'duplicate_detection'
    | 'virus_scan';
  status: ProcessingStatus;
  priority: number;
  attempts: number;
  max_attempts: number;
  result: Record<string, unknown> | null;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DAMDerivative {
  id: string;
  asset_id: string;
  tenant_id: string;
  derivative_type: 'thumbnail' | 'webp' | 'avif' | 'resized' | 'cropped' | 'bg_removed' | 'watermarked';
  width: number | null;
  height: number | null;
  format: string;
  file_size: number;
  storage_path: string;
  cdn_url: string | null;
  transform_params: Record<string, unknown> | null;
  created_at: string;
}

export interface DAMSimilarity {
  asset_id: string;
  similar_asset_id: string;
  similarity_score: number;
  is_duplicate: boolean;
  created_at: string;
}

export interface DAMDownloadLog {
  id: string;
  asset_id: string;
  tenant_id: string;
  downloaded_by: string | null;
  ip_address: string | null;
  user_agent: string | null;
  derivative_type: string | null;
  downloaded_at: string;
}

export interface DAMAuditLog {
  id: string;
  asset_id: string | null;
  tenant_id: string;
  actor_id: string;
  action:
    | 'upload'
    | 'update'
    | 'delete'
    | 'restore'
    | 'download'
    | 'approve'
    | 'reject'
    | 'publish'
    | 'unpublish'
    | 'rights_update'
    | 'version_create'
    | 'version_restore';
  entity_type: string;
  entity_id: string;
  changes: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

// ---- Request / Response DTOs ----

export interface UploadAssetInput {
  name: string;
  asset_type: AssetType;
  folder_id?: string;
  alt_text?: string;
  caption?: string;
  description?: string;
  tags?: string[];
  metadata?: Record<string, string>;
}

export interface UpdateAssetInput {
  name?: string;
  alt_text?: string;
  caption?: string;
  description?: string;
  folder_id?: string;
  status?: AssetStatus;
  expires_at?: string;
}

export interface ListAssetsQuery {
  tenant_id: string;
  folder_id?: string;
  asset_type?: AssetType;
  status?: AssetStatus;
  tag_ids?: string[];
  collection_id?: string;
  search?: string;
  page?: number;
  limit?: number;
  sort_by?: 'created_at' | 'name' | 'file_size' | 'updated_at';
  sort_order?: 'asc' | 'desc';
}

export interface AssetTransformOptions {
  width?: number;
  height?: number;
  format?: 'webp' | 'avif' | 'jpeg' | 'png';
  quality?: number;
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
  crop?: { x: number; y: number; width: number; height: number };
}

export interface CDNSignedUrlOptions {
  expires_in_seconds?: number;
  transform?: AssetTransformOptions;
  download?: boolean;
}

export interface DAMStats {
  total_assets: number;
  total_size_bytes: number;
  assets_by_type: Record<string, number>;
  storage_used_percent: number;
  processing_queue_depth: number;
  duplicate_count: number;
  expired_count: number;
  cdn_hit_ratio: number;
}
