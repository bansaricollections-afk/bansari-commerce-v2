-- ============================================================
-- Sprint 13: Enterprise Digital Asset Management
-- DELTA ONLY — no existing tables modified
-- ============================================================

-- Enable pgvector for similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================
-- dam_assets
-- ============================================================
CREATE TABLE IF NOT EXISTS dam_assets (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  organization_id    UUID REFERENCES organizations(id) ON DELETE SET NULL,
  name               TEXT NOT NULL,
  original_filename  TEXT NOT NULL,
  asset_type         TEXT NOT NULL CHECK (asset_type IN ('image','video','image_360','pdf','size_chart','certificate','brand_asset','banner','hero','logo','icon','social','document','model_3d','ar_asset')),
  mime_type          TEXT NOT NULL,
  file_size          BIGINT NOT NULL DEFAULT 0,
  width              INTEGER,
  height             INTEGER,
  duration           NUMERIC,
  storage_path       TEXT NOT NULL,
  storage_bucket     TEXT NOT NULL DEFAULT 'dam-assets',
  public_url         TEXT,
  cdn_url            TEXT,
  status             TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','active','rejected','expired','archived')),
  alt_text           TEXT,
  caption            TEXT,
  description        TEXT,
  folder_path        TEXT NOT NULL DEFAULT '/',
  hash_md5           TEXT,
  hash_perceptual    TEXT,
  quality_score      NUMERIC(4,2),
  ai_processed       BOOLEAN NOT NULL DEFAULT FALSE,
  uploaded_by        UUID NOT NULL,
  expires_at         TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dam_assets_tenant      ON dam_assets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_dam_assets_type        ON dam_assets(tenant_id, asset_type);
CREATE INDEX IF NOT EXISTS idx_dam_assets_status      ON dam_assets(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_dam_assets_folder      ON dam_assets(tenant_id, folder_path);
CREATE INDEX IF NOT EXISTS idx_dam_assets_hash_md5    ON dam_assets(tenant_id, hash_md5) WHERE hash_md5 IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_dam_assets_name_search ON dam_assets USING gin(to_tsvector('english', name));

-- ============================================================
-- dam_asset_versions
-- ============================================================
CREATE TABLE IF NOT EXISTS dam_asset_versions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id       UUID NOT NULL REFERENCES dam_assets(id) ON DELETE CASCADE,
  tenant_id      UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL DEFAULT 1,
  storage_path   TEXT NOT NULL,
  file_size      BIGINT NOT NULL DEFAULT 0,
  change_note    TEXT,
  is_current     BOOLEAN NOT NULL DEFAULT FALSE,
  created_by     UUID NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(asset_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_dam_versions_asset ON dam_asset_versions(asset_id);

-- ============================================================
-- dam_collections
-- ============================================================
CREATE TABLE IF NOT EXISTS dam_collections (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  name            TEXT NOT NULL,
  slug            TEXT NOT NULL,
  description     TEXT,
  cover_asset_id  UUID REFERENCES dam_assets(id) ON DELETE SET NULL,
  is_smart        BOOLEAN NOT NULL DEFAULT FALSE,
  smart_rules     JSONB,
  asset_count     INTEGER NOT NULL DEFAULT 0,
  created_by      UUID NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_dam_collections_tenant ON dam_collections(tenant_id);

-- ============================================================
-- dam_collection_assets
-- ============================================================
CREATE TABLE IF NOT EXISTS dam_collection_assets (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID NOT NULL REFERENCES dam_collections(id) ON DELETE CASCADE,
  asset_id      UUID NOT NULL REFERENCES dam_assets(id) ON DELETE CASCADE,
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  added_by      UUID NOT NULL,
  added_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(collection_id, asset_id)
);

CREATE INDEX IF NOT EXISTS idx_dam_col_assets_collection ON dam_collection_assets(collection_id);
CREATE INDEX IF NOT EXISTS idx_dam_col_assets_asset      ON dam_collection_assets(asset_id);

-- ============================================================
-- dam_tags
-- ============================================================
CREATE TABLE IF NOT EXISTS dam_tags (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  slug             TEXT NOT NULL,
  color            TEXT,
  is_ai_generated  BOOLEAN NOT NULL DEFAULT FALSE,
  usage_count      INTEGER NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_dam_tags_tenant ON dam_tags(tenant_id);

-- ============================================================
-- dam_asset_tags
-- ============================================================
CREATE TABLE IF NOT EXISTS dam_asset_tags (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id   UUID NOT NULL REFERENCES dam_assets(id) ON DELETE CASCADE,
  tag_id     UUID NOT NULL REFERENCES dam_tags(id) ON DELETE CASCADE,
  tenant_id  UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  added_by   UUID NOT NULL,
  added_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(asset_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_dam_asset_tags_asset ON dam_asset_tags(asset_id);
CREATE INDEX IF NOT EXISTS idx_dam_asset_tags_tag   ON dam_asset_tags(tag_id);

-- ============================================================
-- dam_metadata
-- ============================================================
CREATE TABLE IF NOT EXISTS dam_metadata (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id          UUID NOT NULL REFERENCES dam_assets(id) ON DELETE CASCADE UNIQUE,
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  dominant_colors   TEXT[] NOT NULL DEFAULT '{}',
  color_palette     JSONB NOT NULL DEFAULT '[]',
  keywords          TEXT[] NOT NULL DEFAULT '{}',
  ocr_text          TEXT,
  detected_objects  JSONB NOT NULL DEFAULT '[]',
  detected_faces    INTEGER NOT NULL DEFAULT 0,
  detected_brands   TEXT[] NOT NULL DEFAULT '{}',
  ai_tags           JSONB NOT NULL DEFAULT '[]',
  exif_data         JSONB,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dam_metadata_asset  ON dam_metadata(asset_id);
CREATE INDEX IF NOT EXISTS idx_dam_metadata_tenant ON dam_metadata(tenant_id);

-- ============================================================
-- dam_ai_analysis
-- ============================================================
CREATE TABLE IF NOT EXISTS dam_ai_analysis (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id       UUID NOT NULL REFERENCES dam_assets(id) ON DELETE CASCADE,
  tenant_id      UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  job_type       TEXT NOT NULL,
  status         TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','completed','failed','cancelled')),
  result         JSONB,
  error          TEXT,
  processing_ms  INTEGER,
  model_version  TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at   TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_dam_ai_asset  ON dam_ai_analysis(asset_id);
CREATE INDEX IF NOT EXISTS idx_dam_ai_status ON dam_ai_analysis(tenant_id, status);

-- ============================================================
-- dam_rights
-- ============================================================
CREATE TABLE IF NOT EXISTS dam_rights (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id                UUID NOT NULL REFERENCES dam_assets(id) ON DELETE CASCADE UNIQUE,
  tenant_id               UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  rights_type             TEXT NOT NULL DEFAULT 'proprietary',
  license_name            TEXT,
  license_url             TEXT,
  copyright_holder        TEXT,
  attribution_required    BOOLEAN NOT NULL DEFAULT FALSE,
  attribution_text        TEXT,
  expires_at              TIMESTAMPTZ,
  geographic_restrictions TEXT[] NOT NULL DEFAULT '{}',
  channel_restrictions    TEXT[] NOT NULL DEFAULT '{}',
  brand_restrictions      TEXT[] NOT NULL DEFAULT '{}',
  marketplace_allowed     BOOLEAN NOT NULL DEFAULT TRUE,
  storefront_allowed      BOOLEAN NOT NULL DEFAULT TRUE,
  notes                   TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dam_rights_asset  ON dam_rights(asset_id);
CREATE INDEX IF NOT EXISTS idx_dam_rights_tenant ON dam_rights(tenant_id);

-- ============================================================
-- dam_usage
-- ============================================================
CREATE TABLE IF NOT EXISTS dam_usage (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id     UUID NOT NULL REFERENCES dam_assets(id) ON DELETE CASCADE,
  tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  context_type TEXT NOT NULL CHECK (context_type IN ('product','category','cms','banner','email','storefront','marketplace','vendor')),
  context_id   UUID NOT NULL,
  field_name   TEXT,
  used_by      UUID NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dam_usage_asset   ON dam_usage(asset_id);
CREATE INDEX IF NOT EXISTS idx_dam_usage_context ON dam_usage(tenant_id, context_type, context_id);

-- ============================================================
-- dam_processing_jobs
-- ============================================================
CREATE TABLE IF NOT EXISTS dam_processing_jobs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id     UUID NOT NULL REFERENCES dam_assets(id) ON DELETE CASCADE,
  tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  job_type     TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','completed','failed','cancelled')),
  priority     INTEGER NOT NULL DEFAULT 5,
  options      JSONB NOT NULL DEFAULT '{}',
  result       JSONB,
  error        TEXT,
  attempts     INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  scheduled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at   TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dam_jobs_asset  ON dam_processing_jobs(asset_id);
CREATE INDEX IF NOT EXISTS idx_dam_jobs_queue  ON dam_processing_jobs(tenant_id, status, priority, scheduled_at);

-- ============================================================
-- dam_derivatives
-- ============================================================
CREATE TABLE IF NOT EXISTS dam_derivatives (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id         UUID NOT NULL REFERENCES dam_assets(id) ON DELETE CASCADE,
  tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  derivative_type  TEXT NOT NULL CHECK (derivative_type IN ('thumbnail','webp','avif','resized','cropped','bg_removed','watermarked')),
  width            INTEGER,
  height           INTEGER,
  file_size        BIGINT NOT NULL DEFAULT 0,
  storage_path     TEXT NOT NULL,
  cdn_url          TEXT,
  format           TEXT NOT NULL,
  quality          INTEGER,
  transform_params JSONB NOT NULL DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dam_derivatives_asset ON dam_derivatives(asset_id);
CREATE INDEX IF NOT EXISTS idx_dam_derivatives_type  ON dam_derivatives(asset_id, derivative_type);

-- ============================================================
-- dam_similarity
-- ============================================================
CREATE TABLE IF NOT EXISTS dam_similarity (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id         UUID NOT NULL REFERENCES dam_assets(id) ON DELETE CASCADE,
  similar_asset_id UUID NOT NULL REFERENCES dam_assets(id) ON DELETE CASCADE,
  tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  similarity_score NUMERIC(5,4) NOT NULL,
  is_duplicate     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(asset_id, similar_asset_id)
);

CREATE INDEX IF NOT EXISTS idx_dam_similarity_asset ON dam_similarity(asset_id);
CREATE INDEX IF NOT EXISTS idx_dam_similarity_dupes ON dam_similarity(tenant_id, is_duplicate);

-- ============================================================
-- dam_download_logs
-- ============================================================
CREATE TABLE IF NOT EXISTS dam_download_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id        UUID NOT NULL REFERENCES dam_assets(id) ON DELETE CASCADE,
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  downloaded_by   UUID NOT NULL,
  ip_address      INET,
  user_agent      TEXT,
  derivative_type TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dam_downloads_asset  ON dam_download_logs(asset_id);
CREATE INDEX IF NOT EXISTS idx_dam_downloads_tenant ON dam_download_logs(tenant_id, created_at);

-- ============================================================
-- dam_audit
-- ============================================================
CREATE TABLE IF NOT EXISTS dam_audit (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id    UUID REFERENCES dam_assets(id) ON DELETE SET NULL,
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  action      TEXT NOT NULL,
  actor_id    UUID NOT NULL,
  actor_email TEXT,
  old_value   JSONB,
  new_value   JSONB,
  ip_address  INET,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dam_audit_tenant ON dam_audit(tenant_id, created_at);
CREATE INDEX IF NOT EXISTS idx_dam_audit_asset  ON dam_audit(asset_id) WHERE asset_id IS NOT NULL;

-- ============================================================
-- Updated_at triggers for DAM tables
-- ============================================================
CREATE OR REPLACE FUNCTION dam_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_dam_assets_updated_at') THEN
    CREATE TRIGGER trg_dam_assets_updated_at BEFORE UPDATE ON dam_assets FOR EACH ROW EXECUTE FUNCTION dam_set_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_dam_collections_updated_at') THEN
    CREATE TRIGGER trg_dam_collections_updated_at BEFORE UPDATE ON dam_collections FOR EACH ROW EXECUTE FUNCTION dam_set_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_dam_metadata_updated_at') THEN
    CREATE TRIGGER trg_dam_metadata_updated_at BEFORE UPDATE ON dam_metadata FOR EACH ROW EXECUTE FUNCTION dam_set_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_dam_rights_updated_at') THEN
    CREATE TRIGGER trg_dam_rights_updated_at BEFORE UPDATE ON dam_rights FOR EACH ROW EXECUTE FUNCTION dam_set_updated_at();
  END IF;
END $$;

-- ============================================================
-- RLS — reuse Sprint 11 tenant isolation pattern
-- ============================================================
ALTER TABLE dam_assets           ENABLE ROW LEVEL SECURITY;
ALTER TABLE dam_asset_versions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE dam_collections      ENABLE ROW LEVEL SECURITY;
ALTER TABLE dam_collection_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE dam_tags             ENABLE ROW LEVEL SECURITY;
ALTER TABLE dam_asset_tags       ENABLE ROW LEVEL SECURITY;
ALTER TABLE dam_metadata         ENABLE ROW LEVEL SECURITY;
ALTER TABLE dam_ai_analysis      ENABLE ROW LEVEL SECURITY;
ALTER TABLE dam_rights           ENABLE ROW LEVEL SECURITY;
ALTER TABLE dam_usage            ENABLE ROW LEVEL SECURITY;
ALTER TABLE dam_processing_jobs  ENABLE ROW LEVEL SECURITY;
ALTER TABLE dam_derivatives      ENABLE ROW LEVEL SECURITY;
ALTER TABLE dam_similarity       ENABLE ROW LEVEL SECURITY;
ALTER TABLE dam_download_logs    ENABLE ROW LEVEL SECURITY;
ALTER TABLE dam_audit            ENABLE ROW LEVEL SECURITY;

-- Assets: tenant isolation
CREATE POLICY dam_assets_tenant_isolation ON dam_assets
  USING (tenant_id = (current_setting('app.tenant_id', TRUE))::UUID);

CREATE POLICY dam_asset_versions_tenant_isolation ON dam_asset_versions
  USING (tenant_id = (current_setting('app.tenant_id', TRUE))::UUID);

CREATE POLICY dam_collections_tenant_isolation ON dam_collections
  USING (tenant_id = (current_setting('app.tenant_id', TRUE))::UUID);

CREATE POLICY dam_collection_assets_tenant_isolation ON dam_collection_assets
  USING (tenant_id = (current_setting('app.tenant_id', TRUE))::UUID);

CREATE POLICY dam_tags_tenant_isolation ON dam_tags
  USING (tenant_id = (current_setting('app.tenant_id', TRUE))::UUID);

CREATE POLICY dam_asset_tags_tenant_isolation ON dam_asset_tags
  USING (tenant_id = (current_setting('app.tenant_id', TRUE))::UUID);

CREATE POLICY dam_metadata_tenant_isolation ON dam_metadata
  USING (tenant_id = (current_setting('app.tenant_id', TRUE))::UUID);

CREATE POLICY dam_ai_analysis_tenant_isolation ON dam_ai_analysis
  USING (tenant_id = (current_setting('app.tenant_id', TRUE))::UUID);

CREATE POLICY dam_rights_tenant_isolation ON dam_rights
  USING (tenant_id = (current_setting('app.tenant_id', TRUE))::UUID);

CREATE POLICY dam_usage_tenant_isolation ON dam_usage
  USING (tenant_id = (current_setting('app.tenant_id', TRUE))::UUID);

CREATE POLICY dam_processing_jobs_tenant_isolation ON dam_processing_jobs
  USING (tenant_id = (current_setting('app.tenant_id', TRUE))::UUID);

CREATE POLICY dam_derivatives_tenant_isolation ON dam_derivatives
  USING (tenant_id = (current_setting('app.tenant_id', TRUE))::UUID);

CREATE POLICY dam_similarity_tenant_isolation ON dam_similarity
  USING (tenant_id = (current_setting('app.tenant_id', TRUE))::UUID);

CREATE POLICY dam_download_logs_tenant_isolation ON dam_download_logs
  USING (tenant_id = (current_setting('app.tenant_id', TRUE))::UUID);

CREATE POLICY dam_audit_tenant_isolation ON dam_audit
  USING (tenant_id = (current_setting('app.tenant_id', TRUE))::UUID);
