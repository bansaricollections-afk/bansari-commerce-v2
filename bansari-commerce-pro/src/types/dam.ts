// Sprint 13 — Enterprise Digital Asset Management Types
// DELTA ONLY — no existing types modified

export type DAMAssetType =
  | 'image'
  | 'video'
  | 'image_360'
  | 'pdf'
  | 'size_chart'
  | 'certificate'
  | 'brand_asset'
  | 'banner'
  | 'hero'
  | 'logo'
  | 'icon'
  | 'social'
  | 'document'
  | 'model_3d'
  | 'ar_asset';

export type DAMAssetStatus = 'pending' | 'processing' | 'active' | 'rejected' | 'expired' | 'archived';
export type DAMProcessingStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
export type DAMRightsType = 'royalty_free' | 'rights_managed' | 'editorial' | 'creative_commons' | 'proprietary';
export type DAMJobType =
  | 'auto_tag'
  | 'background_removal'
  | 'auto_crop'
  | 'enhance'
  | 'compress'
  | 'super_resolution'
  | 'webp_convert'
  | 'avif_convert'
  | 'thumbnail'
  | 'color_analysis'
  | 'caption'
  | 'visual_embedding'
  | 'quality_score'
  | 'watermark_detect'
  | 'nsfw_detect'
  | 'ocr'
  | 'object_detect'
  | 'face_detect'
  | 'brand_detect'
  | 'duplicate_detect';

export interface DAMAsset {
  id: string;
  tenant_id: string;
  organization_id: string | null;
  name: string;
  original_filename: string;
  asset_type: DAMAssetType;
  mime_type: string;
  file_size: number;
  width: number | null;
  height: number | null;
  duration: number | null;
  storage_path: string;
  storage_bucket: string;
  public_url: string | null;
  cdn_url: string | null;
  status: DAMAssetStatus;
  alt_text: string | null;
  caption: string | null;
  description: string | null;
  folder_path: string;
  hash_md5: string | null;
  hash_perceptual: string | null;
  quality_score: number | null;
  ai_processed: boolean;
  uploaded_by: string;
  created_at: string;
  updated_at: string;
  expires_at: string | null;
}

export interface DAMAssetVersion {
  id: string;
  asset_id: string;
  tenant_id: string;
  version_number: number;
  storage_path: string;
  file_size: number;
  change_note: string | null;
  created_by: string;
  created_at: string;
  is_current: boolean;
}

export interface DAMCollection {
  id: string;
  tenant_id: string;
  organization_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  cover_asset_id: string | null;
  is_smart: boolean;
  smart_rules: SmartCollectionRule[] | null;
  asset_count: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface SmartCollectionRule {
  field: string;
  operator: 'equals' | 'contains' | 'starts_with' | 'gt' | 'lt' | 'in';
  value: string | number | string[];
}

export interface DAMTag {
  id: string;
  tenant_id: string;
  name: string;
  slug: string;
  color: string | null;
  is_ai_generated: boolean;
  usage_count: number;
  created_at: string;
}

export interface DAMMetadata {
  id: string;
  asset_id: string;
  tenant_id: string;
  dominant_colors: string[];
  color_palette: ColorSwatch[];
  keywords: string[];
  ocr_text: string | null;
  detected_objects: DetectedObject[];
  detected_faces: number;
  detected_brands: string[];
  ai_tags: AITag[];
  exif_data: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface ColorSwatch {
  hex: string;
  rgb: [number, number, number];
  percentage: number;
  name: string | null;
}

export interface DetectedObject {
  label: string;
  confidence: number;
  bounding_box: { x: number; y: number; width: number; height: number } | null;
}

export interface AITag {
  tag: string;
  confidence: number;
  source: 'vision_ai' | 'manual' | 'imported';
}

export interface DAMAIAnalysis {
  id: string;
  asset_id: string;
  tenant_id: string;
  job_type: DAMJobType;
  status: DAMProcessingStatus;
  result: Record<string, unknown> | null;
  error: string | null;
  processing_ms: number | null;
  model_version: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface DAMRights {
  id: string;
  asset_id: string;
  tenant_id: string;
  rights_type: DAMRightsType;
  license_name: string | null;
  license_url: string | null;
  copyright_holder: string | null;
  attribution_required: boolean;
  attribution_text: string | null;
  expires_at: string | null;
  geographic_restrictions: string[];
  channel_restrictions: string[];
  brand_restrictions: string[];
  marketplace_allowed: boolean;
  storefront_allowed: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface DAMUsage {
  id: string;
  asset_id: string;
  tenant_id: string;
  context_type: 'product' | 'category' | 'cms' | 'banner' | 'email' | 'storefront' | 'marketplace' | 'vendor';
  context_id: string;
  field_name: string | null;
  used_by: string;
  created_at: string;
}

export interface DAMProcessingJob {
  id: string;
  asset_id: string;
  tenant_id: string;
  job_type: DAMJobType;
  status: DAMProcessingStatus;
  priority: number;
  options: Record<string, unknown>;
  result: Record<string, unknown> | null;
  error: string | null;
  attempts: number;
  max_attempts: number;
  scheduled_at: string;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface DAMDerivative {
  id: string;
  asset_id: string;
  tenant_id: string;
  derivative_type: 'thumbnail' | 'webp' | 'avif' | 'resized' | 'cropped' | 'bg_removed' | 'watermarked';
  width: number | null;
  height: number | null;
  file_size: number;
  storage_path: string;
  cdn_url: string | null;
  format: string;
  quality: number | null;
  transform_params: Record<string, unknown>;
  created_at: string;
}

export interface DAMSimilarity {
  id: string;
  asset_id: string;
  similar_asset_id: string;
  tenant_id: string;
  similarity_score: number;
  is_duplicate: boolean;
  created_at: string;
}

export interface DAMDownloadLog {
  id: string;
  asset_id: string;
  tenant_id: string;
  downloaded_by: string;
  ip_address: string | null;
  user_agent: string | null;
  derivative_type: string | null;
  created_at: string;
}

export interface DAMAuditLog {
  id: string;
  asset_id: string | null;
  tenant_id: string;
  action: string;
  actor_id: string;
  actor_email: string | null;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}

// API Request/Response types
export interface UploadAssetRequest {
  name: string;
  asset_type: DAMAssetType;
  folder_path?: string;
  alt_text?: string;
  caption?: string;
  description?: string;
  collection_ids?: string[];
  tag_ids?: string[];
  auto_process?: boolean;
}

export interface AssetListParams {
  tenant_id: string;
  asset_type?: DAMAssetType;
  status?: DAMAssetStatus;
  folder_path?: string;
  collection_id?: string;
  tag_ids?: string[];
  search?: string;
  page?: number;
  per_page?: number;
  order_by?: 'created_at' | 'name' | 'file_size' | 'quality_score';
  order?: 'asc' | 'desc';
}

export interface CDNTransformOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'avif' | 'jpeg' | 'png';
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
  blur?: number;
  sharpen?: boolean;
  grayscale?: boolean;
  watermark?: boolean;
}

export interface SignedURLOptions {
  expires_in?: number; // seconds, default 3600
  transform?: CDNTransformOptions;
  download?: boolean;
}

export interface ProcessingQueueItem {
  job: DAMProcessingJob;
  asset: Pick<DAMAsset, 'id' | 'name' | 'asset_type' | 'storage_path' | 'mime_type'>;
}

export interface DAMStorageStats {
  tenant_id: string;
  total_assets: number;
  total_size_bytes: number;
  by_type: Record<DAMAssetType, { count: number; size: number }>;
  duplicates_count: number;
  pending_processing: number;
  cdn_hit_ratio: number;
}
