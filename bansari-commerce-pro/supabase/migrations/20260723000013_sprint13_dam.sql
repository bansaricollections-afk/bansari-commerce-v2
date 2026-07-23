-- ============================================================
-- Sprint 13 — Enterprise Digital Asset Management
-- DELTA ONLY — reuses tenant isolation from Sprint 11
-- ============================================================

-- Enable pgvector for similarity embeddings
create extension if not exists vector with schema extensions;

-- ============================================================
-- FOLDERS
-- ============================================================
create table if not exists dam_folders (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  organization_id uuid references organizations(id) on delete set null,
  parent_id uuid references dam_folders(id) on delete cascade,
  name text not null,
  path text not null,
  description text,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists dam_folders_tenant_idx on dam_folders(tenant_id);
create index if not exists dam_folders_parent_idx on dam_folders(parent_id);
create unique index if not exists dam_folders_tenant_path_idx on dam_folders(tenant_id, path);

-- ============================================================
-- ASSETS
-- ============================================================
create table if not exists dam_assets (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  organization_id uuid references organizations(id) on delete set null,
  folder_id uuid references dam_folders(id) on delete set null,
  name text not null,
  original_filename text not null,
  asset_type text not null,
  mime_type text not null,
  file_size bigint not null default 0,
  width integer,
  height integer,
  duration numeric,
  storage_path text not null,
  public_url text,
  cdn_url text,
  thumbnail_url text,
  status text not null default 'pending',
  version integer not null default 1,
  checksum text not null,
  alt_text text,
  caption text,
  description text,
  uploaded_by uuid not null references auth.users(id),
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  published_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists dam_assets_tenant_idx on dam_assets(tenant_id);
create index if not exists dam_assets_folder_idx on dam_assets(folder_id);
create index if not exists dam_assets_type_idx on dam_assets(asset_type);
create index if not exists dam_assets_status_idx on dam_assets(status);
create index if not exists dam_assets_checksum_idx on dam_assets(tenant_id, checksum);
create index if not exists dam_assets_name_search_idx on dam_assets using gin(to_tsvector('english', name));

-- ============================================================
-- ASSET VERSIONS
-- ============================================================
create table if not exists dam_asset_versions (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references dam_assets(id) on delete cascade,
  tenant_id uuid not null references tenants(id) on delete cascade,
  version_number integer not null,
  storage_path text not null,
  file_size bigint not null,
  checksum text not null,
  change_notes text,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);
create index if not exists dam_asset_versions_asset_idx on dam_asset_versions(asset_id);
create unique index if not exists dam_asset_versions_unique_idx on dam_asset_versions(asset_id, version_number);

-- ============================================================
-- COLLECTIONS
-- ============================================================
create table if not exists dam_collections (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  organization_id uuid references organizations(id) on delete set null,
  name text not null,
  description text,
  is_smart boolean not null default false,
  smart_rules jsonb,
  cover_asset_id uuid references dam_assets(id) on delete set null,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists dam_collections_tenant_idx on dam_collections(tenant_id);

create table if not exists dam_collection_assets (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid not null references dam_collections(id) on delete cascade,
  asset_id uuid not null references dam_assets(id) on delete cascade,
  sort_order integer not null default 0,
  added_by uuid not null references auth.users(id),
  added_at timestamptz not null default now(),
  unique(collection_id, asset_id)
);
create index if not exists dam_collection_assets_coll_idx on dam_collection_assets(collection_id);
create index if not exists dam_collection_assets_asset_idx on dam_collection_assets(asset_id);

-- ============================================================
-- TAGS
-- ============================================================
create table if not exists dam_tags (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null,
  slug text not null,
  color text,
  is_ai_generated boolean not null default false,
  created_at timestamptz not null default now(),
  unique(tenant_id, slug)
);
create index if not exists dam_tags_tenant_idx on dam_tags(tenant_id);

create table if not exists dam_asset_tags (
  asset_id uuid not null references dam_assets(id) on delete cascade,
  tag_id uuid not null references dam_tags(id) on delete cascade,
  confidence numeric,
  source text not null default 'manual',
  created_at timestamptz not null default now(),
  primary key (asset_id, tag_id)
);
create index if not exists dam_asset_tags_tag_idx on dam_asset_tags(tag_id);

-- ============================================================
-- METADATA
-- ============================================================
create table if not exists dam_metadata (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references dam_assets(id) on delete cascade,
  tenant_id uuid not null references tenants(id) on delete cascade,
  key text not null,
  value text not null,
  data_type text not null default 'string',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(asset_id, key)
);
create index if not exists dam_metadata_asset_idx on dam_metadata(asset_id);
create index if not exists dam_metadata_tenant_idx on dam_metadata(tenant_id);

-- ============================================================
-- AI ANALYSIS
-- ============================================================
create table if not exists dam_ai_analysis (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references dam_assets(id) on delete cascade,
  tenant_id uuid not null references tenants(id) on delete cascade,
  dominant_colors text[],
  color_palette jsonb,
  ai_tags jsonb,
  objects_detected jsonb,
  faces_detected integer,
  ocr_text text,
  caption text,
  quality_score numeric,
  nsfw_score numeric,
  watermark_detected boolean,
  brand_detected text[],
  embedding extensions.vector(1536),
  analysis_model text,
  analyzed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists dam_ai_analysis_asset_idx on dam_ai_analysis(asset_id);
create index if not exists dam_ai_analysis_tenant_idx on dam_ai_analysis(tenant_id);
create index if not exists dam_ai_analysis_embedding_idx on dam_ai_analysis
  using ivfflat (embedding extensions.vector_cosine_ops) with (lists = 100);

-- ============================================================
-- RIGHTS
-- ============================================================
create table if not exists dam_rights (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references dam_assets(id) on delete cascade,
  tenant_id uuid not null references tenants(id) on delete cascade,
  license_type text not null default 'proprietary',
  copyright_holder text,
  copyright_year integer,
  attribution_required boolean not null default false,
  attribution_text text,
  usage_rights text[],
  geographic_restrictions text[],
  brand_restrictions text[],
  marketplace_restrictions text[],
  valid_from timestamptz,
  valid_until timestamptz,
  license_url text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists dam_rights_asset_idx on dam_rights(asset_id);
create index if not exists dam_rights_tenant_idx on dam_rights(tenant_id);
create index if not exists dam_rights_expiry_idx on dam_rights(valid_until) where valid_until is not null;

-- ============================================================
-- USAGE
-- ============================================================
create table if not exists dam_usage (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references dam_assets(id) on delete cascade,
  tenant_id uuid not null references tenants(id) on delete cascade,
  context_type text not null,
  context_id text,
  context_name text,
  used_by uuid not null references auth.users(id),
  used_at timestamptz not null default now()
);
create index if not exists dam_usage_asset_idx on dam_usage(asset_id);
create index if not exists dam_usage_tenant_idx on dam_usage(tenant_id);

-- ============================================================
-- PROCESSING JOBS
-- ============================================================
create table if not exists dam_processing_jobs (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references dam_assets(id) on delete cascade,
  tenant_id uuid not null references tenants(id) on delete cascade,
  job_type text not null,
  status text not null default 'queued',
  priority integer not null default 5,
  attempts integer not null default 0,
  max_attempts integer not null default 3,
  result jsonb,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists dam_processing_jobs_asset_idx on dam_processing_jobs(asset_id);
create index if not exists dam_processing_jobs_status_idx on dam_processing_jobs(status);
create index if not exists dam_processing_jobs_queue_idx on dam_processing_jobs(status, priority desc, created_at asc)
  where status = 'queued';

-- ============================================================
-- DERIVATIVES
-- ============================================================
create table if not exists dam_derivatives (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references dam_assets(id) on delete cascade,
  tenant_id uuid not null references tenants(id) on delete cascade,
  derivative_type text not null,
  width integer,
  height integer,
  format text not null,
  file_size bigint not null,
  storage_path text not null,
  cdn_url text,
  transform_params jsonb,
  created_at timestamptz not null default now()
);
create index if not exists dam_derivatives_asset_idx on dam_derivatives(asset_id);
create index if not exists dam_derivatives_type_idx on dam_derivatives(asset_id, derivative_type);

-- ============================================================
-- SIMILARITY
-- ============================================================
create table if not exists dam_similarity (
  asset_id uuid not null references dam_assets(id) on delete cascade,
  similar_asset_id uuid not null references dam_assets(id) on delete cascade,
  similarity_score numeric not null,
  is_duplicate boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (asset_id, similar_asset_id)
);
create index if not exists dam_similarity_score_idx on dam_similarity(similarity_score desc);
create index if not exists dam_similarity_duplicate_idx on dam_similarity(asset_id) where is_duplicate = true;

-- ============================================================
-- DOWNLOAD LOGS
-- ============================================================
create table if not exists dam_download_logs (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references dam_assets(id) on delete cascade,
  tenant_id uuid not null references tenants(id) on delete cascade,
  downloaded_by uuid references auth.users(id),
  ip_address inet,
  user_agent text,
  derivative_type text,
  downloaded_at timestamptz not null default now()
);
create index if not exists dam_download_logs_asset_idx on dam_download_logs(asset_id);
create index if not exists dam_download_logs_tenant_idx on dam_download_logs(tenant_id);
create index if not exists dam_download_logs_date_idx on dam_download_logs(downloaded_at);

-- ============================================================
-- AUDIT
-- ============================================================
create table if not exists dam_audit (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid references dam_assets(id) on delete set null,
  tenant_id uuid not null references tenants(id) on delete cascade,
  actor_id uuid not null references auth.users(id),
  action text not null,
  entity_type text not null,
  entity_id text not null,
  changes jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now()
);
create index if not exists dam_audit_tenant_idx on dam_audit(tenant_id);
create index if not exists dam_audit_asset_idx on dam_audit(asset_id);
create index if not exists dam_audit_actor_idx on dam_audit(actor_id);
create index if not exists dam_audit_date_idx on dam_audit(created_at);

-- ============================================================
-- updated_at triggers (reuse pattern from existing sprints)
-- ============================================================
create or replace function update_dam_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

do $$ begin
  create trigger dam_folders_updated_at before update on dam_folders
    for each row execute function update_dam_updated_at();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger dam_assets_updated_at before update on dam_assets
    for each row execute function update_dam_updated_at();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger dam_collections_updated_at before update on dam_collections
    for each row execute function update_dam_updated_at();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger dam_metadata_updated_at before update on dam_metadata
    for each row execute function update_dam_updated_at();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger dam_rights_updated_at before update on dam_rights
    for each row execute function update_dam_updated_at();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger dam_processing_jobs_updated_at before update on dam_processing_jobs
    for each row execute function update_dam_updated_at();
exception when duplicate_object then null; end $$;

-- ============================================================
-- RLS POLICIES — Reuse Sprint 11 tenant isolation pattern
-- ============================================================
alter table dam_folders enable row level security;
alter table dam_assets enable row level security;
alter table dam_asset_versions enable row level security;
alter table dam_collections enable row level security;
alter table dam_collection_assets enable row level security;
alter table dam_tags enable row level security;
alter table dam_asset_tags enable row level security;
alter table dam_metadata enable row level security;
alter table dam_ai_analysis enable row level security;
alter table dam_rights enable row level security;
alter table dam_usage enable row level security;
alter table dam_processing_jobs enable row level security;
alter table dam_derivatives enable row level security;
alter table dam_similarity enable row level security;
alter table dam_download_logs enable row level security;
alter table dam_audit enable row level security;

-- Tenant isolation helper (same pattern as Sprint 11)
create or replace function auth_tenant_id()
returns uuid language sql stable as $$
  select coalesce(
    (current_setting('app.tenant_id', true))::uuid,
    null
  );
$$;

-- RLS for dam_assets (other tables follow same pattern)
create policy "tenant_isolation" on dam_assets
  using (tenant_id = auth_tenant_id());
create policy "tenant_isolation" on dam_folders
  using (tenant_id = auth_tenant_id());
create policy "tenant_isolation" on dam_asset_versions
  using (tenant_id = auth_tenant_id());
create policy "tenant_isolation" on dam_collections
  using (tenant_id = auth_tenant_id());
create policy "tenant_isolation" on dam_tags
  using (tenant_id = auth_tenant_id());
create policy "tenant_isolation" on dam_metadata
  using (tenant_id = auth_tenant_id());
create policy "tenant_isolation" on dam_ai_analysis
  using (tenant_id = auth_tenant_id());
create policy "tenant_isolation" on dam_rights
  using (tenant_id = auth_tenant_id());
create policy "tenant_isolation" on dam_usage
  using (tenant_id = auth_tenant_id());
create policy "tenant_isolation" on dam_processing_jobs
  using (tenant_id = auth_tenant_id());
create policy "tenant_isolation" on dam_derivatives
  using (tenant_id = auth_tenant_id());
create policy "tenant_isolation" on dam_download_logs
  using (tenant_id = auth_tenant_id());
create policy "tenant_isolation" on dam_audit
  using (tenant_id = auth_tenant_id());
