-- =============================================================
-- Sprint 13: Enterprise Digital Asset Management
-- DELTA ONLY — no existing tables touched
-- Tenant isolation via tenant_id + organization_id on every table
-- =============================================================

-- Enable pgvector for similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- ---------------------------------------------------------------
-- 1. dam_assets — master asset registry
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.dam_assets (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL,
  organization_id     UUID,
  name                TEXT NOT NULL,
  slug                TEXT NOT NULL,
  description         TEXT,
  asset_type          TEXT NOT NULL CHECK (asset_type IN (
    'image','video','video_360','pdf','size_chart','certificate',
    'brand_asset','banner','hero','logo','icon','social','document',
    'model_3d','ar_asset','other'
  )),
  mime_type           TEXT NOT NULL,
  file_size           BIGINT NOT NULL DEFAULT 0,
  width               INTEGER,
  height              INTEGER,
  duration_seconds    NUMERIC(10,3),
  storage_bucket      TEXT NOT NULL DEFAULT 'dam-assets',
  storage_path        TEXT NOT NULL,
  cdn_url             TEXT,
  original_filename   TEXT NOT NULL,
  checksum_sha256     TEXT,
  status              TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('pending','processing','active','archived','deleted')),
  is_public           BOOLEAN NOT NULL DEFAULT FALSE,
  alt_text            TEXT,
  caption             TEXT,
  credit              TEXT,
  source_url          TEXT,
  focal_point_x       NUMERIC(5,4) DEFAULT 0.5,
  focal_point_y       NUMERIC(5,4) DEFAULT 0.5,
  quality_score       NUMERIC(4,2),
  nsfw_score          NUMERIC(4,2),
  ai_processed        BOOLEAN NOT NULL DEFAULT FALSE,
  ai_processed_at     TIMESTAMPTZ,
  published_at        TIMESTAMPTZ,
  expires_at          TIMESTAMPTZ,
  retention_until     TIMESTAMPTZ,
  created_by          UUID,
  updated_by          UUID,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at          TIMESTAMPTZ,
  UNIQUE (tenant_id, storage_path)
);

CREATE INDEX idx_dam_assets_tenant        ON public.dam_assets (tenant_id);
CREATE INDEX idx_dam_assets_org           ON public.dam_assets (organization_id);
CREATE INDEX idx_dam_assets_type          ON public.dam_assets (asset_type);
CREATE INDEX idx_dam_assets_status        ON public.dam_assets (status);
CREATE INDEX idx_dam_assets_checksum      ON public.dam_assets (checksum_sha256);
CREATE INDEX idx_dam_assets_created       ON public.dam_assets (created_at DESC);

-- ---------------------------------------------------------------
-- 2. dam_asset_versions
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.dam_asset_versions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  organization_id UUID,
  asset_id        UUID NOT NULL REFERENCES public.dam_assets(id) ON DELETE CASCADE,
  version_number  INTEGER NOT NULL,
  storage_path    TEXT NOT NULL,
  file_size       BIGINT NOT NULL DEFAULT 0,
  checksum        TEXT,
  change_note     TEXT,
  is_current      BOOLEAN NOT NULL DEFAULT FALSE,
  approval_status TEXT NOT NULL DEFAULT 'draft' CHECK (approval_status IN ('draft','pending','approved','rejected')),
  approved_by     UUID,
  approved_at     TIMESTAMPTZ,
  created_by      UUID,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (asset_id, version_number)
);

CREATE INDEX idx_dam_versions_asset    ON public.dam_asset_versions (asset_id);
CREATE INDEX idx_dam_versions_tenant   ON public.dam_asset_versions (tenant_id);
CREATE INDEX idx_dam_versions_current  ON public.dam_asset_versions (asset_id, is_current);

-- ---------------------------------------------------------------
-- 3. dam_collections
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.dam_collections (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL,
  organization_id     UUID,
  name                TEXT NOT NULL,
  slug                TEXT NOT NULL,
  description         TEXT,
  collection_type     TEXT NOT NULL DEFAULT 'manual' CHECK (collection_type IN ('manual','smart','album','folder')),
  smart_rules         JSONB,
  cover_asset_id      UUID REFERENCES public.dam_assets(id) ON DELETE SET NULL,
  parent_id           UUID REFERENCES public.dam_collections(id) ON DELETE SET NULL,
  is_public           BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order          INTEGER NOT NULL DEFAULT 0,
  created_by          UUID,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, slug)
);

CREATE INDEX idx_dam_collections_tenant ON public.dam_collections (tenant_id);
CREATE INDEX idx_dam_collections_parent ON public.dam_collections (parent_id);

-- ---------------------------------------------------------------
-- 4. dam_collection_assets
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.dam_collection_assets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  collection_id   UUID NOT NULL REFERENCES public.dam_collections(id) ON DELETE CASCADE,
  asset_id        UUID NOT NULL REFERENCES public.dam_assets(id) ON DELETE CASCADE,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  added_by        UUID,
  added_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (collection_id, asset_id)
);

CREATE INDEX idx_dam_col_assets_collection ON public.dam_collection_assets (collection_id);
CREATE INDEX idx_dam_col_assets_asset      ON public.dam_collection_assets (asset_id);

-- ---------------------------------------------------------------
-- 5. dam_tags
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.dam_tags (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL,
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL,
  tag_type    TEXT NOT NULL DEFAULT 'manual' CHECK (tag_type IN ('manual','ai','system')),
  color       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, slug)
);

CREATE INDEX idx_dam_tags_tenant ON public.dam_tags (tenant_id);

-- ---------------------------------------------------------------
-- 6. dam_asset_tags
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.dam_asset_tags (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL,
  asset_id    UUID NOT NULL REFERENCES public.dam_assets(id) ON DELETE CASCADE,
  tag_id      UUID NOT NULL REFERENCES public.dam_tags(id) ON DELETE CASCADE,
  confidence  NUMERIC(4,3) DEFAULT 1.0,
  source      TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','ai','ocr','object_detection')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (asset_id, tag_id)
);

CREATE INDEX idx_dam_asset_tags_asset  ON public.dam_asset_tags (asset_id);
CREATE INDEX idx_dam_asset_tags_tag    ON public.dam_asset_tags (tag_id);

-- ---------------------------------------------------------------
-- 7. dam_metadata
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.dam_metadata (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  asset_id        UUID NOT NULL REFERENCES public.dam_assets(id) ON DELETE CASCADE,
  exif_data       JSONB,
  iptc_data       JSONB,
  xmp_data        JSONB,
  color_profile   TEXT,
  dominant_colors JSONB,
  color_palette   JSONB,
  keywords        TEXT[],
  ocr_text        TEXT,
  ocr_language    TEXT,
  custom_fields   JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (asset_id)
);

CREATE INDEX idx_dam_metadata_asset  ON public.dam_metadata (asset_id);
CREATE INDEX idx_dam_metadata_tenant ON public.dam_metadata (tenant_id);
CREATE INDEX idx_dam_metadata_ocr    ON public.dam_metadata USING gin(to_tsvector('english', COALESCE(ocr_text,'')));

-- ---------------------------------------------------------------
-- 8. dam_ai_analysis
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.dam_ai_analysis (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL,
  asset_id              UUID NOT NULL REFERENCES public.dam_assets(id) ON DELETE CASCADE,
  ai_tags               JSONB,
  objects_detected      JSONB,
  faces_detected        JSONB,
  brands_detected       JSONB,
  captions              JSONB,
  quality_score         NUMERIC(4,2),
  nsfw_score            NUMERIC(4,2),
  nsfw_categories       JSONB,
  watermark_detected    BOOLEAN DEFAULT FALSE,
  watermark_confidence  NUMERIC(4,3),
  background_removed    BOOLEAN DEFAULT FALSE,
  dominant_colors       JSONB,
  embedding             vector(1536),
  model_version         TEXT,
  processed_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (asset_id)
);

CREATE INDEX idx_dam_ai_asset   ON public.dam_ai_analysis (asset_id);
CREATE INDEX idx_dam_ai_tenant  ON public.dam_ai_analysis (tenant_id);
CREATE INDEX idx_dam_ai_embed   ON public.dam_ai_analysis USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ---------------------------------------------------------------
-- 9. dam_rights
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.dam_rights (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL,
  organization_id       UUID,
  asset_id              UUID NOT NULL REFERENCES public.dam_assets(id) ON DELETE CASCADE,
  license_type          TEXT NOT NULL DEFAULT 'proprietary' CHECK (license_type IN (
    'proprietary','cc0','cc_by','cc_by_sa','cc_by_nd','cc_by_nc',
    'royalty_free','rights_managed','editorial','custom'
  )),
  copyright_holder      TEXT,
  copyright_year        INTEGER,
  attribution_required  BOOLEAN NOT NULL DEFAULT FALSE,
  attribution_text      TEXT,
  usage_rights          JSONB,
  geographic_restrictions TEXT[],
  brand_restrictions    TEXT[],
  channel_restrictions  TEXT[],
  expires_at            TIMESTAMPTZ,
  notes                 TEXT,
  created_by            UUID,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (asset_id)
);

CREATE INDEX idx_dam_rights_asset   ON public.dam_rights (asset_id);
CREATE INDEX idx_dam_rights_tenant  ON public.dam_rights (tenant_id);
CREATE INDEX idx_dam_rights_expires ON public.dam_rights (expires_at) WHERE expires_at IS NOT NULL;

-- ---------------------------------------------------------------
-- 10. dam_usage
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.dam_usage (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  asset_id        UUID NOT NULL REFERENCES public.dam_assets(id) ON DELETE CASCADE,
  entity_type     TEXT NOT NULL CHECK (entity_type IN ('product','collection','cms_page','banner','email','storefront','marketplace','campaign')),
  entity_id       UUID NOT NULL,
  usage_context   TEXT,
  attached_by     UUID,
  attached_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  detached_at     TIMESTAMPTZ
);

CREATE INDEX idx_dam_usage_asset      ON public.dam_usage (asset_id);
CREATE INDEX idx_dam_usage_entity     ON public.dam_usage (entity_type, entity_id);
CREATE INDEX idx_dam_usage_tenant     ON public.dam_usage (tenant_id);

-- ---------------------------------------------------------------
-- 11. dam_processing_jobs
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.dam_processing_jobs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  asset_id        UUID NOT NULL REFERENCES public.dam_assets(id) ON DELETE CASCADE,
  job_type        TEXT NOT NULL CHECK (job_type IN (
    'thumbnail','webp','avif','background_removal','auto_crop',
    'super_resolution','compress','ocr','ai_tag','embed','watermark_check',
    'nsfw_check','caption','color_analysis','virus_scan','duplicate_check'
  )),
  status          TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','completed','failed','cancelled')),
  priority        INTEGER NOT NULL DEFAULT 5,
  payload         JSONB,
  result          JSONB,
  error_message   TEXT,
  attempts        INTEGER NOT NULL DEFAULT 0,
  max_attempts    INTEGER NOT NULL DEFAULT 3,
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_dam_jobs_asset   ON public.dam_processing_jobs (asset_id);
CREATE INDEX idx_dam_jobs_status  ON public.dam_processing_jobs (status, priority DESC);
CREATE INDEX idx_dam_jobs_tenant  ON public.dam_processing_jobs (tenant_id);

-- ---------------------------------------------------------------
-- 12. dam_derivatives
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.dam_derivatives (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  asset_id        UUID NOT NULL REFERENCES public.dam_assets(id) ON DELETE CASCADE,
  derivative_type TEXT NOT NULL CHECK (derivative_type IN ('thumbnail','webp','avif','resized','cropped','bg_removed','watermarked','custom')),
  width           INTEGER,
  height          INTEGER,
  format          TEXT,
  quality         INTEGER,
  storage_path    TEXT NOT NULL,
  cdn_url         TEXT,
  file_size       BIGINT,
  transform_params JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (asset_id, derivative_type, width, height, format)
);

CREATE INDEX idx_dam_derivatives_asset  ON public.dam_derivatives (asset_id);
CREATE INDEX idx_dam_derivatives_tenant ON public.dam_derivatives (tenant_id);

-- ---------------------------------------------------------------
-- 13. dam_download_logs
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.dam_download_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL,
  asset_id    UUID NOT NULL REFERENCES public.dam_assets(id) ON DELETE CASCADE,
  user_id     UUID,
  ip_address  INET,
  user_agent  TEXT,
  download_type TEXT NOT NULL DEFAULT 'original' CHECK (download_type IN ('original','derivative','cdn')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_dam_downloads_asset  ON public.dam_download_logs (asset_id);
CREATE INDEX idx_dam_downloads_tenant ON public.dam_download_logs (tenant_id);
CREATE INDEX idx_dam_downloads_time   ON public.dam_download_logs (created_at DESC);

-- ---------------------------------------------------------------
-- 14. dam_audit
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.dam_audit (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL,
  asset_id    UUID REFERENCES public.dam_assets(id) ON DELETE SET NULL,
  user_id     UUID,
  action      TEXT NOT NULL,
  entity_type TEXT NOT NULL DEFAULT 'asset',
  entity_id   UUID,
  old_data    JSONB,
  new_data    JSONB,
  ip_address  INET,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_dam_audit_tenant    ON public.dam_audit (tenant_id);
CREATE INDEX idx_dam_audit_asset     ON public.dam_audit (asset_id);
CREATE INDEX idx_dam_au