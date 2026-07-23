-- ============================================================
-- Sprint 13: Enterprise Digital Asset Management
-- DELTA ONLY — no existing tables modified
-- Reuses: tenant_id/organization_id pattern from Sprint 11
-- ============================================================

-- Enable pgvector for similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================
-- TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS dam_assets (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL,
  organization_id     UUID NOT NULL,
  created_by          UUID NOT NULL,
  name                TEXT NOT NULL,
  original_filename   TEXT NOT NULL,
  asset_type          TEXT NOT NULL CHECK (asset_type IN ('image','video','360_image','pdf','size_chart','certificate','brand_asset','marketing_banner','hero_image','logo','icon','social_media','document','3d_model','ar_asset')),
  mime_type           TEXT NOT NULL,
  file_size           BIGINT NOT NULL DEFAULT 0,
  width               INTEGER,
  height              INTEGER,
  duration_seconds    NUMERIC(10,3),
  storage_path        TEXT NOT NULL,
  storage_bucket      TEXT NOT NULL DEFAULT 'dam-assets',
  public_url          TEXT,
  cdn_url             TEXT,
  folder_path         TEXT NOT NULL DEFAULT '/',
  status              TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','active','archived','rejected','expired')),
  version             INTEGER NOT NULL DEFAULT 1,
  checksum_md5        TEXT NOT NULL,
  checksum_sha256     TEXT NOT NULL,
  is_public           BOOLEAN NOT NULL DEFAULT false,
  alt_text            TEXT,
  caption             TEXT,
  description         TEXT,
  custom_metadata     JSONB NOT NULL DEFAULT '{}',
  pim_product_ids     UUID[] NOT NULL DEFAULT '{}',
  storefront_ids      UUID[] NOT NULL DEFAULT '{}',
  campaign_ids        UUID[] NOT NULL DEFAULT '{}',
  quality_score       NUMERIC(4,2),
  dominant_colors     TEXT[] NOT NULL DEFAULT '{}',
  color_palette       TEXT[] NOT NULL DEFAULT '{}',
  has_watermark       BOOLEAN NOT NULL DEFAULT false,
  is_nsfw             BOOLEAN NOT NULL DEFAULT false,
  ocr_text            TEXT,
  ai_tags             TEXT[] NOT NULL DEFAULT '{}',
  ai_caption          TEXT,
  embedding_vector    vector(1536),
  duplicate_of        UUID REFERENCES dam_assets(id) ON DELETE SET NULL,
  expires_at          TIMESTAMPTZ,
  published_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dam_asset_versions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id          UUID NOT NULL REFERENCES dam_assets(id) ON DELETE CASCADE,
  tenant_id         UUID NOT NULL,
  organization_id   UUID NOT NULL,
  version_number    INTEGER NOT NULL,
  storage_path      TEXT NOT NULL,
  file_size         BIGINT NOT NULL,
  checksum_md5      TEXT NOT NULL,
  change_note       TEXT,
  created_by        UUID NOT NULL,
  approved_by       UUID,
  approved_at       TIMESTAMPTZ,
  approval_status   TEXT NOT NULL DEFAULT 'pending' CHECK (approval_status IN ('pending','approved','rejected')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (asset_id, version_number)
);

CREATE TABLE IF NOT EXISTS dam_collections (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL,
  organization_id   UUID NOT NULL,
  name              TEXT NOT NULL,
  slug              TEXT NOT NULL,
  description       TEXT,
  collection_type   TEXT NOT NULL DEFAULT 'manual' CHECK (collection_type IN ('manual','smart','album')),
  smart_rules       JSONB,
  cover_asset_id    UUID REFERENCES dam_assets(id) ON DELETE SET NULL,
  is_public         BOOLEAN NOT NULL DEFAULT false,
  sort_order        INTEGER NOT NULL DEFAULT 0,
  created_by        UUID NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, slug)
);

CREATE TABLE IF NOT EXISTS dam_collection_assets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id   UUID NOT NULL REFERENCES dam_collections(id) ON DELETE CASCADE,
  asset_id        UUID NOT NULL REFERENCES dam_assets(id) ON DELETE CASCADE,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  added_by        UUID NOT NULL,
  added_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (collection_id, asset_id)
);

CREATE TABLE IF NOT EXISTS dam_tags (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL,
  organization_id   UUID NOT NULL,
  name              TEXT NOT NULL,
  slug              TEXT NOT NULL,
  color             TEXT,
  is_ai_generated   BOOLEAN NOT NULL DEFAULT false,
  usage_count       INTEGER NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, slug)
);

CREATE TABLE IF NOT EXISTS dam_asset_tags (
  asset_id          UUID NOT NULL REFERENCES dam_assets(id) ON DELETE CASCADE,
  tag_id            UUID NOT NULL REFERENCES dam_tags(id) ON DELETE CASCADE,
  confidence        NUMERIC(4,3),
  is_ai_generated   BOOLEAN NOT NULL DEFAULT false,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (asset_id, tag_id)
);

CREATE TABLE IF NOT EXISTS dam_ai_analysis (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id            UUID NOT NULL REFERENCES dam_assets(id) ON DELETE CASCADE,
  tenant_id           UUID NOT NULL,
  analysis_type       TEXT NOT NULL CHECK (analysis_type IN ('auto_tag','object_detection','face_detection','brand_detection','ocr','nsfw','color','caption','similarity','watermark','quality')),
  provider            TEXT NOT NULL DEFAULT 'openai',
  result              JSONB NOT NULL DEFAULT '{}',
  confidence          NUMERIC(4,3),
  processing_time_ms  INTEGER,
  model_version       TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dam_rights (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id                  UUID NOT NULL REFERENCES dam_assets(id) ON DELETE CASCADE,
  tenant_id                 UUID NOT NULL,
  organization_id           UUID NOT NULL,
  license_type              TEXT NOT NULL DEFAULT 'proprietary' CHECK (license_type IN ('royalty_free','rights_managed','creative_commons','proprietary','public_domain')),
  copyright_holder          TEXT,
  copyright_year            SMALLINT,
  attribution_required      BOOLEAN NOT NULL DEFAULT false,
  attribution_text          TEXT,
  usage_rights              TEXT[] NOT NULL DEFAULT '{}',
  restricted_uses           TEXT[] NOT NULL DEFAULT '{}',
  geographic_restrictions   TEXT[] NOT NULL DEFAULT '{}',
  brand_restrictions        TEXT[] NOT NULL DEFAULT '{}',
  marketplace_restrictions  TEXT[] NOT NULL DEFAULT '{}',
  license_url               TEXT,
  valid_from                TIMESTAMPTZ,
  expires_at                TIMESTAMPTZ,
  created_by                UUID NOT NULL,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (asset_id)
);

CREATE TABLE IF NOT EXISTS dam_processing_jobs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id        UUID NOT NULL REFERENCES dam_assets(id) ON DELETE CASCADE,
  tenant_id       UUID NOT NULL,
  job_type        TEXT NOT NULL CHECK (job_type IN ('background_removal','auto_crop','enhance','compress','super_resolution','webp_convert','avif_convert','thumbnail','color_analysis','ai_tagging','caption','embedding','watermark_detect','nsfw_detect','ocr','duplicate_check','virus_scan')),
  status          TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','processing','completed','failed','skipped')),
  priority        SMALLINT NOT NULL DEFAULT 5,
  attempts        SMALLINT NOT NULL DEFAULT 0,
  max_attempts    SMALLINT NOT NULL DEFAULT 3,
  params          JSONB NOT NULL DEFAULT '{}',
  result          JSONB,
  error_message   TEXT,
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dam_derivatives (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id          UUID NOT NULL REFERENCES dam_assets(id) ON DELETE CASCADE,
  tenant_id         UUID NOT NULL,
  derivative_type   TEXT NOT NULL CHECK (derivative_type IN ('thumbnail','webp','avif','responsive','watermarked','bg_removed','super_resolution')),
  storage_path      TEXT NOT NULL,
  cdn_url           TEXT,
  width             INTEGER,
  height            INTEGER,
  file_size         BIGINT NOT NULL,
  mime_type         TEXT NOT NULL,
  quality           SMALLINT,
  transform_params  JSONB NOT NULL DEFAULT '{}',
  cache_control     TEXT NOT NULL DEFAULT 'public, max-age=31536000, immutable',
  is_valid          BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at        TIMESTAMPTZ,
  UNIQUE (asset_id, derivative_type, width, height, quality)
);

CREATE TABLE IF NOT EXISTS dam_similarity (
  asset_id          UUID NOT NULL REFERENCES dam_assets(id) ON DELETE CASCADE,
  similar_asset_id  UUID NOT NULL REFERENCES dam_assets(id) ON DELETE CASCADE,
  tenant_id         UUID NOT NULL,
  similarity_score  NUMERIC(5,4) NOT NULL,
  is_duplicate      BOOLEAN NOT NULL DEFAULT false,
  computed_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (asset_id, similar_asset_id)
);

CREATE TABLE IF NOT EXISTS dam_usage (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id          UUID NOT NULL REFERENCES dam_assets(id) ON DELETE CASCADE,
  tenant_id         UUID NOT NULL,
  organization_id   UUID NOT NULL,
  usage_context     TEXT NOT NULL CHECK (usage_context IN ('product','storefront','cms','campaign','marketplace','email','social','api')),
  entity_type       TEXT NOT NULL,
  entity_id         UUID NOT NULL,
  used_by           UUID NOT NULL,
  used_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dam_download_logs (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id            UUID NOT NULL REFERENCES dam_assets(id) ON DELETE CASCADE,
  tenant_id           UUID NOT NULL,
  downloaded_by       UUID,
  ip_address          INET,
  user_agent          TEXT,
  download_type       TEXT NOT NULL CHECK (download_type IN ('original','derivative','cdn')),
  derivative_type     TEXT,
  bytes_transferred   BIGINT NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dam_audit (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id      UUID REFERENCES dam_assets(id) ON DELETE SET NULL,
  tenant_id     UUID NOT NULL,
  actor_id      UUID NOT NULL,
  action        TEXT NOT NULL,
  entity_type   TEXT NOT NULL,
  entity_id     UUID NOT NULL,
  old_values    JSONB,
  new_values    JSONB,
  ip_address    INET,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_dam_assets_tenant        ON dam_assets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_dam_assets_org           ON dam_assets(organization_id);
CREATE INDEX IF NOT EXISTS idx_dam_assets_type          ON dam_assets(asset_type);
CREATE INDEX IF NOT EXISTS idx_dam_assets_status        ON dam_assets(status);
CREATE INDEX IF NOT EXISTS idx_dam_assets_folder        ON dam_assets(folder_path);
CREATE INDEX IF NOT EXISTS idx_dam_assets_created       ON dam_assets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dam_assets_expires       ON dam_assets(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_dam_assets_pim           ON dam_assets USING GIN(pim_product_ids);
CREATE INDEX IF NOT EXISTS idx_dam_assets_ai_tags       ON dam_assets USING GIN(ai_tags);
CREATE INDEX IF NOT EXISTS idx_dam_assets_duplicate     ON dam_assets(duplicate_of) WHERE duplicate_of IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_dam_assets_embedding     ON dam_assets USING ivfflat (embedding_vector vector_cosine_ops) WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_dam_proc_jobs_status     ON dam_processing_jobs(status, priority DESC, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_dam_proc_jobs_asset      ON dam_processing_jobs(asset_id);
CREATE INDEX IF NOT EXISTS idx_dam_proc_jobs_tenant     ON dam_processing_jobs(tenant_id);

CREATE INDEX IF NOT EXISTS idx_dam_derivatives_asset    ON dam_derivatives(asset_id, derivative_type);
CREATE INDEX IF NOT EXISTS idx_dam_similarity_score     ON dam_similarity(tenant_id, similarity_score DESC);
CREATE INDEX IF NOT EXISTS idx_dam_usage_asset          ON dam_usage(asset_id);
CREATE INDEX IF NOT EXISTS idx_dam_audit_tenant         ON dam_audit(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dam_tags_tenant          ON dam_tags(tenant_id, slug);
CREATE INDEX IF NOT EXISTS idx_dam_collections_tenant   ON dam_collections(tenant_id, slug);

-- Full-text search on assets
CREATE INDEX IF NOT EXISTS idx_dam_assets_fts ON dam_assets
  USING GIN(to_tsvector('english', COALESCE(name,'') || ' ' || COALESCE(description,'') || ' ' || COALESCE(ocr_text,'') || ' ' || COALESCE(ai_caption,'')));

-- ============================================================
-- UPDATED_AT TRIGGERS
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
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_dam_rights_updated_at') THEN
    CREATE TRIGGER trg_dam_rights_updated_at BEFORE UPDATE ON dam_rights FOR EACH ROW EXECUTE FUNCTION dam_set_updated_at();
  END IF;
END $$;

-- Tag usage counter
CREATE OR REPLACE FUNCTION dam_update_tag_usage_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE dam_tags SET usage_count = usage_count + 1 WHERE id = NEW.tag_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE dam_tags SET usage_count = GREATEST(0, usage_count - 1) WHERE id = OLD.tag_id;
  END IF;
  RETURN NULL;
END;
$$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_dam_asset_tags_count') THEN
    CREATE TRIGGER trg_dam_asset_tags_count AFTER INSERT OR DELETE ON dam_asset_tags FOR EACH ROW EXECUTE FUNCTION dam_update_tag_usage_count();
  END IF;
END $$;

-- ============================================================
-- ROW LEVEL SECURITY
-- Reuses Sprint 11 tenant isolation pattern
-- ============================================================

ALTER TABLE dam_assets          ENABLE ROW LEVEL SECURITY;
ALTER TABLE dam_asset_versions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE dam_collections     ENABLE ROW LEVEL SECURITY;
ALTER TABLE dam_collection_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE dam_tags            ENABLE ROW LEVEL SECURITY;
ALTER TABLE dam_asset_tags      ENABLE ROW LEVEL SECURITY;
ALTER TABLE dam_ai_analysis     ENABLE ROW LEVEL SECURITY;
ALTER TABLE dam_rights          ENABLE ROW LEVEL SECURITY;
ALTER TABLE dam_processing_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE dam_derivatives     ENABLE ROW LEVEL SECURITY;
ALTER TABLE dam_similarity      ENABLE ROW LEVEL SECURITY;
ALTER TABLE dam_usage           ENABLE ROW LEVEL SECURITY;
ALTER TABLE dam_download_logs   ENABLE ROW LEVEL SECURITY;
ALTER TABLE dam_audit           ENABLE ROW LEVEL SECURITY;

-- Helper: extract tenant from JWT (reuses Sprint 11 pattern)
CREATE OR REPLACE FUNCTION dam_current_tenant_id() RETURNS UUID LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('request.jwt.claims', true)::json->>'tenant_id', '')::UUID;
$$;

CREATE OR REPLACE FUNCTION dam_current_org_id() RETURNS UUID LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('request.jwt.claims', true)::json->>'organization_id', '')::UUID;
$$;

CREATE OR REPLACE FUNCTION dam_current_user_id() RETURNS UUID LANGUAGE sql STABLE AS $$
  SELECT auth.uid();
$$;

CREATE OR REPLACE FUNCTION dam_is_service_role() RETURNS BOOLEAN LANGUAGE sql STABLE AS $$
  SELECT current_setting('request.jwt.claims', true)::json->>'role' = 'service_role';
$$;

-- dam_assets RLS
DROP POLICY IF EXISTS dam_assets_tenant_isolation ON dam_assets;
CREATE POLICY dam_assets_tenant_isolation ON dam_assets
  USING (dam_is_service_role() OR tenant_id = dam_current_tenant_id())
  WITH CHECK (dam_is_service_role() OR tenant_id = dam_current_tenant_id());

DROP POLICY IF EXISTS dam_assets_public_read ON dam_assets;
CREATE POLICY dam_assets_public_read ON dam_assets FOR SELECT
  USING (is_public = true OR dam_is_service_role() OR tenant_id = dam_current_tenant_id());

-- Apply tenant isolation to all other DAM tables
DO $$ DECLARE t TEXT; BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'dam_asset_versions','dam_collections','dam_tags','dam_ai_analysis',
    'dam_rights','dam_processing_jobs','dam_derivatives','dam_similarity',
    'dam_usage','dam_download_logs','dam_audit'
  ]) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I_tenant_isolation ON %I', t, t);
    EXECUTE format('
      CREATE POLICY %I_tenant_isolation ON %I
      USING (dam_is_service_role() OR tenant_id = dam_current_tenant_id())
      WITH CHECK (dam_is_service_role() OR tenant_id = dam_current_tenant_id())
    ', t, t);
  END LOOP;
END $$;

-- dam_collection_assets: join table, inherit from collections
DROP POLICY IF EXISTS dam_collection_assets_tenant ON dam_collection_assets;
CREATE POLICY dam_collection_assets_tenant ON dam_collection_assets
  USING (dam_is_service_role() OR EXISTS (
    SELECT 1 FROM dam_collections c WHERE c.id = collection_id AND (c.tenant_id = dam_current_tenant_id() OR c.is_public)
  ))
  WITH CHECK (dam_is_service_role() OR EXISTS (
    SELECT 1 FROM dam_collections c WHERE c.id = collection_id AND c.tenant_id = dam_current_tenant_id()
  ));

-- dam_asset_tags: inherit from assets
DROP POLICY IF EXISTS dam_asset_tags_tenant ON dam_asset_tags;
CREATE POLICY dam_asset_tags_tenant ON dam_asset_tags
  USING (dam_is_service_role() OR EXISTS (
    SELECT 1 FROM dam_assets a WHERE a.id = asset_id AND (a.tenant_id = dam_current_tenant_id() OR a.is_public)
  ))
  WITH CHECK (dam_is_service_role() OR EXISTS (
    SELECT 1 FROM dam_assets a WHERE a.id = asset_id AND a.tenant_id = dam_current_tenant_id()
  ));

-- ============================================================
-- STORAGE BUCKETS (execute via Supabase client at boot)
-- ============================================================
-- INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
-- VALUES
--   ('dam-assets',      'dam-assets',      false, 524288000, NULL),  -- 500MB, all types
--   ('dam-derivatives', 'dam-derivatives', true,  52428800,  ARRAY['image/webp','image/avif','image/jpeg','image/png']),
--   ('dam-uploads',     'dam-uploads',     false, 524288000, NULL)
-- ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- GRANTS
-- ============================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO service_role;
