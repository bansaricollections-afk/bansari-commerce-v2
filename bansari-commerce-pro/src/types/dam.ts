// Sprint 13 — Enterprise DAM Types
// Delta only — no existing types modified

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

export type DAMAssetStatus = 'pending' | 'processing' | 'ready' | 'failed' | 'archived' | 'expired';

export type DAMProcessingOperation =
  | 'auto_tag'
  | 'background_removal'
  | 'auto_crop'
  | 'enhancement'
  | 'compression'
  | 'super_resolution'
  | 'webp_convert'
  | 'avif_convert'
  | 'thumbnail'
  | 'color_analysis'
  | 'caption_generation'
  | 'visual_search_embedding'
  | 'quality_score'
  | 'watermark_detection'
  | 'nsfw_detection'
  | 'ocr'
  | 'object_detection'
  | 'face_detection'
  | 'brand_detection'
  | 'duplicate_detection';

export type DAMProcessingStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'skipped';

export type DAMLicenseType =
  | 'royalty_free'
  | 'rights_managed'
  | 'creative_commons'
  | 'proprietary'
  | 'public_domain';

export interface DAMAsset {
  id: string;
  tenant_id: string;
  organization_id: string | null;
  folder_id: string | null;
  asset_type: DAMAssetType;
  title: string | null;
  alt_text: string | null;
  description: string | null;
  filename: string;
  original_filename: string;
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
  is_public: boolean;
  uploaded_by: string;
  approved_by: string | null;
  approved_at: string | null;
  published_at: string | null;
  expires_at: string | null;
  version: number;
  hash_md5: string | null;
  hash_perceptual: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface DAMAssetVersion {
  id: string;
  asset_id: string;
  tenant_id: string;
  version: number;
  storage_path: string;
  file_size: number;
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
  smart_rules: Record<string, unknown> | null;
  cover_asset_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
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
  id: string;
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
  namespace: string | null;
  created_at: string;
  updated_at: string;
}

export interface DAMAIAnalysis {
  id: string;
  asset_id: string;
  tenant_id: string;
  operation: DAMProcessingOperation;
  status: DAMProcessingStatus;
  result: Record<string, unknown> | null;
  confidence: number | null;
  model_version: string | null;
  processed_at: string | null;
  error_message: string | null;
  created_at: string;
}

export interface DAMRights {
  id: string;
  asset_id: string;
  tenant_id: string;
  license_type: DAMLicenseType;
  copyright_holder: string | null;
  copyright_year: number | null;
  attribution_required: boolean;
  attribution_text: string | null;
  usage_rights: string[];
  restricted_usage: string[];
  geographic_restrictions: string[];
  brand_restrictions: string[];
  marketplace_restrictions: string[];
  expires_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface DAMUsage {
  id: string;
  asset_id: string;
  tenant_id: string;
  context_type: string;
  context_id: string;
  used_by: string;
  used_at: string;
}

export interface DAMProcessingJob {
  id: string;
  asset_id: string;
  tenant_id: string;
  operation: DAMProcessingOperation;
  status: DAMProcessingStatus;
  priority: number;
  attempts: number;
  max_attempts: number;
  payload: Record<string, unknown>;
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
  derivative_type: string;
  width: number | null;
  height: number | null;
  format: string;
  quality: number | null;
  storage_path: string;
  cdn_url: string | null;
  file_size: number;
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
  details: Record<string, unknown>;
  ip_address: string | null;
  created_at: string;
}

// Service input types
export interface UploadAssetInput {
  file: File;
  tenantId: string;
  organizationId?: string;
  folderId?: string;
  assetType: string;
  altText?: string;
  title?: string;
  uploadedBy: string;
}

export interface ListAssetsInput {
  tenantId: string;
  folderId?: string;
  collectionId?: string;
  assetType?: string;
  tags?: string[];
  search?: string;
  status?: DAMAssetStatus;
  page?: number;
  limit?: number;
}

export interface CDNTransformOptions {
  width?: number;
  height?: number;
  format?: 'webp' | 'avif' | 'jpeg' | 'png';
  quality?: number;
  fit?: 'cover' | 'contain' | 'fill';
}
