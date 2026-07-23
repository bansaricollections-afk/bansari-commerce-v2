// Sprint 13 — Enterprise DAM Type System
// DELTA ONLY — no existing types modified

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

export type AssetStatus = 'pending' | 'processing' | 'active' | 'archived' | 'rejected' | 'expired';
export type ProcessingStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'skipped';
export type RightsLicenseType = 'royalty_free' | 'rights_managed' | 'creative_commons' | 'proprietary' | 'public_domain';
export type CollectionType = 'manual' | 'smart' | 'album';
export type DerivativeType = 'thumbnail' | 'webp' | 'avif' | 'responsive' | 'watermarked' | 'bg_removed' | 'super_resolution';

export interface DAMAsset {
  id: string;
  tenant_id: string;
  organization_id: string;
  created_by: string;
  name: string;
  original_filename: string;
  asset_type: AssetType;
  mime_type: string;
  file_size: number;
  width: number | null;
  height: number | null;
  duration_seconds: number | null;
  storage_path: string;
  storage_bucket: string;
  public_url: string | null;
  cdn_url: string | null;
  folder_path: string;
  status: AssetStatus;
  version: number;
  checksum_md5: string;
  checksum_sha256: string;
  is_public: boolean;
  alt_text: string | null;
  caption: string | null;
  description: string | null;
  custom_metadata: Record<string, unknown>;
  pim_product_ids: string[];
  storefront_ids: string[];
  campaign_ids: string[];
  quality_score: number | null;
  dominant_colors: string[];
  color_palette: string[];
  has_watermark: boolean;
  is_nsfw: boolean;
  ocr_text: string | null;
  ai_tags: string[];
  ai_caption: string | null;
  embedding_vector: number[] | null;
  duplicate_of: string | null;
  expires_at: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DAMAssetVersion {
  id: string;
  asset_id: string;
  tenant_id: string;
  organization_id: string;
  version_number: number;
  storage_path: string;
  file_size: number;
  checksum_md5: string;
  change_note: string | null;
  created_by: string;
  approved_by: string | null;
  approved_at: string | null;
  approval_status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

export interface DAMCollection {
  id: string;
  tenant_id: string;
  organization_id: string;
  name: string;
  slug: string;
  description: string | null;
  collection_type: CollectionType;
  smart_rules: SmartCollectionRule[] | null;
  cover_asset_id: string | null;
  is_public: boolean;
  sort_order: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface SmartCollectionRule {
  field: string;
  operator: 'equals' | 'contains' | 'starts_with' | 'greater_than' | 'less_than' | 'in';
  value: string | number | string[];
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
  organization_id: string;
  name: string;
  slug: string;
  color: string | null;
  is_ai_generated: boolean;
  usage_count: number;
  created_at: string;
}

export interface DAMAssetTag {
  asset_id: string;
  tag_id: string;
  confidence: number | null;
  is_ai_generated: boolean;
  created_at: string;
}

export interface DAMAIAnalysis {
  id: string;
  asset_id: string;
  tenant_id: string;
  analysis_type: 'auto_tag' | 'object_detection' | 'face_detection' | 'brand_detection' | 'ocr' | 'nsfw' | 'color' | 'caption' | 'similarity' | 'watermark' | 'quality';
  provider: string;
  result: Record<string, unknown>;
  confidence: number | null;
  processing_time_ms: number | null;
  model_version: string | null;
  created_at: string;
}

export interface DAMRights {
  id: string;
  asset_id: string;
  tenant_id: string;
  organization_id: string;
  license_type: RightsLicenseType;
  copyright_holder: string | null;
  copyright_year: number | null;
  attribution_required: boolean;
  attribution_text: string | null;
  usage_rights: string[];
  restricted_uses: string[];
  geographic_restrictions: string[];
  brand_restrictions: string[];
  marketplace_restrictions: string[];
  license_url: string | null;
  valid_from: string | null;
  expires_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface DAMProcessingJob {
  id: string;
  asset_id: string;
  tenant_id: string;
  job_type: 'background_removal' | 'auto_crop' | 'enhance' | 'compress' | 'super_resolution' | 'webp_convert' | 'avif_convert' | 'thumbnail' | 'color_analysis' | 'ai_tagging' | 'caption' | 'embedding' | 'watermark_detect' | 'nsfw_detect' | 'ocr' | 'duplicate_check' | 'virus_scan';
  status: ProcessingStatus;
  priority: number;
  attempts: number;
  max_attempts: number;
  params: Record<string, unknown>;
  result: Record<string, unknown> | null;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface DAMDerivative {
  id: string;
  asset_id: string;
  tenant_id: string;
  derivative_type: DerivativeType;
  storage_path: string;
  cdn_url: string | null;
  width: number | null;
  height: number | null;
  file_size: number;
  mime_type: string;
  quality: number | null;
  transform_params: Record<string, unknown>;
  cache_control: string;
  is_valid: boolean;
  created_at: string;
  expires_at: string | null;
}

export interface DAMSimilarity {
  asset_id: string;
  similar_asset_id: string;
  tenant_id: string;
  similarity_score: number;
  is_duplicate: boolean;
  computed_at: string;
}

export interface DAMUsage {
  id: string;
  asset_id: string;
  tenant_id: string;
  organization_id: string;
  usage_context: 'product' | 'storefront' | 'cms' | 'campaign' | 'marketplace' | 'email' | 'social' | 'api';
  entity_type: string;
  entity_id: string;
  used_by: string;
  used_at: string;
}

export interface DAMDownloadLog {
  id: string;
  asset_id: string;
  tenant_id: string;
  downloaded_by: string | null;
  ip_address: string | null;
  user_agent: string | null;
  download_type: 'original' | 'derivative' | 'cdn';
  derivative_type: string | null;
  bytes_transferred: number;
  created_at: string;
}

export interface DAMAuditLog {
  id: string;
  asset_id: string | null;
  tenant_id: string;
  actor_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}

// DTO types
export interface CreateAssetDTO {
  name: string;
  asset_type: AssetType;
  folder_path?: string;
  alt_text?: string;
  caption?: string;
  description?: string;
  custom_metadata?: Record<string, unknown>;
  is_public?: boolean;
  expires_at?: string;
  tags?: string[];
}

export interface UpdateAssetDTO {
  name?: string;
  alt_text?: string;
  caption?: string;
  description?: string;
  folder_path?: string;
  custom_metadata?: Record<string, unknown>;
  is_public?: boolean;
  expires_at?: string;
  status?: AssetStatus;
}

export interface AssetListParams {
  tenant_id: string;
  organization_id?: string;
  asset_type?: AssetType;
  status?: AssetStatus;
  folder_path?: string;
  tags?: string[];
  search?: string;
  page?: number;
  limit?: number;
  sort_by?: 'created_at' | 'updated_at' | 'name' | 'file_size' | 'quality_score';
  sort_order?: 'asc' | 'desc';
}

export interface CDNTransformParams {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'avif' | 'jpeg' | 'png';
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
  blur?: number;
  sharpen?: boolean;
  watermark?: boolean;
}

export interface SignedUrlOptions {
  expiresIn?: number; // seconds
  transform?: CDNTransformParams;
  download?: boolean;
}

export interface AIProcessingResult {
  tags: Array<{ label: string; confidence: number }>;
  objects: Array<{ label: string; confidence: number; bbox?: number[] }>;
  faces: number;
  brands: string[];
  ocr_text: string | null;
  caption: string | null;
  dominant_colors: string[];
  color_palette: string[];
  quality_score: number;
  has_watermark: boolean;
  is_nsfw: boolean;
  embedding: number[];
}

export interface DuplicateCheckResult {
  is_duplicate: boolean;
  duplicate_of: string | null;
  similarity_score: number;
  similar_assets: Array<{ asset_id: string; score: number }>;
}

export interface StorageUploadResult {
  storage_path: string;
  storage_bucket: string;
  public_url: string | null;
  file_size: number;
  checksum_md5: string;
  checksum_sha256: string;
  mime_type: string;
  width: number | null;
  height: number | null;
  duration_seconds: number | null;
}
