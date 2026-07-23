-- ============================================================
-- Sprint 13: Enterprise Digital Asset Management
-- Delta only — creates only new DAM tables
-- Reuses Sprint 11 tenant isolation pattern
-- ============================================================

-- Enable pgvector if not already enabled (for similarity search)
create extension if not exists vector;

-- ============================================================
-- dam_assets
-- ============================================================
create table if not exists dam_assets (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  organization_id uuid,
  folder_id uuid,
  asset_type text not null default 'image',
  title text,
  alt_text text,
  description text,
  filename text not null,
  original_filename text not null,
  mime_type text not null,
  file_size bigint not null default 0,
  width integer,
  height integer,
  duration numeric,
  storage_path text not null,
  storage_bucket text not null default 'dam-assets',
  public_url text,
  cdn_url text,
  status text not null default 'pending'
    check (status in ('pending','processing','ready','failed','archived','expired')),
  is_public boolean not null default false,
  uploaded_by uuid not null,
  approved_by uuid,
  approved_at timestamptz,
  published_at timestamptz,
  expires_at timestamptz,
  version integer not null default 1,
  hash_md5 text,
  hash_perceptual text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_dam_assets_tenant on dam_assets(tenant_id);
create index if not exists idx_dam_assets_folder on dam_assets(folder_id);
create index if not exists idx_dam_assets_type on dam_assets(asset_type);
create index if not exists idx_dam_assets_status on dam_assets(status);
create index if not exists idx_dam_assets_hash on dam_assets(hash_perceptual);
create index if not exists idx_dam_assets_created on dam_assets(created_at desc);

-- ============================================================
-- dam_folders
-- ============================================================
create table if not exists dam_folders (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  organization_id uuid,
  parent_id uuid references dam_folders(id) on delete cascade,
  name text not null,
  path text not null,
  description text,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_dam_folders_tenant on dam_folders(tenant_id);
create index if not exists idx_dam_folders_parent on dam_folders(parent_id);

-- ============================================================
-- dam_asset_versions
-- ============================================================
create table if not exists dam_asset_versions (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references dam_assets(id) on delete cascade,
  tenant_id uuid not null,
  version integer not null,
  storage_path text not null,
  file_size bigint not null default 0,
  change_notes text,
  created_by uuid not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_dam_versions_asset on dam_asset_versions(asset_id);

-- ============================================================
-- dam_collections
-- ============================================================
create table if not exists dam_collections (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  organization_id uuid,
  name text not null,
  description text,
  is_smart boolean not null default false,
  smart_rules jsonb,
  cover_asset_id uuid references dam_assets(id) on delete set null,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_dam_collections_tenant on dam_collections(tenant_id);

-- ============================================================
-- dam_collection_assets
-- ============================================================
create table if not exists dam_collection_assets (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid not null references dam_collections(id) on delete cascade,
  asset_id uuid not null references dam_assets(id) on delete cascade,
  sort_order integer not null default 0,
  added_by uuid not null,
  added_at timestamptz not null default now(),
  unique(collection_id, asset_id)
);

create index if not exists idx_dam_ca_collection on dam_collection_assets(collection_id);
create index if not exists idx_dam_ca_asset on dam_collection_assets(asset_id);

-- ============================================================
-- dam_tags
-- ============================================================
create table if not exists dam_tags (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  name text not null,
  slug text not null,
  color text,
  is_ai_generated boolean not null default false,
  created_at timestamptz not null default now(),
  unique(tenant_id, slug)
);

create index if not exists idx_dam_tags_tenant on dam_tags(tenant_id);

-- ============================================================
-- dam_asset_tags
-- ============================================================
create table if not exists dam_asset_tags (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references dam_assets(id) on delete cascade,
  tag_id uuid not null references dam_tags(id) on delete cascade,
  confidence numeric check (confidence between 0 and 1),
  source text not null default 'manual' check (source in ('manual','ai','import')),
  created_at timestamptz not null default now(),
  unique(asset_id, tag_id)
);

create index if not exists idx_dam_asset_tags_asset on dam_asset_tags(asset_id);
create index if not exists idx_dam_asset_tags_tag on dam_asset_tags(tag_id);

-- ============================================================
-- dam_metadata
-- ============================================================
create table if not exists dam_metadata (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references dam_assets(id) on delete cascade,
  tenant_id uuid not null,
  key text not null,
  value text not null,
  namespace text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(asset_id, namespace, key)
);

create index if not exists idx_dam_metadata_asset on dam_metadata(asset_id);

-- ============================================================
-- dam_ai_analysis
-- ============================================================
create table if not exists dam_ai_analysis (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references dam_assets(id) on delete cascade,
  tenant_id uuid not null,
  operation text not null,
  status text not null default 'queued'
    check (status in ('queued','processing','completed','failed','skipped')),
  result jsonb,
  confidence numeric check (confidence between 0 and 1),
  model_version text,
  processed_at timestamptz,
  error_message text,
  created_at timestamptz not null default now(),
  unique(asset_id, operation)
);

create index if not exists idx_dam_ai_asset on dam_ai_analysis(asset_id);
create index if not exists idx_dam_ai_operation on dam_ai_analysis(operation);

-- ============================================================
-- dam_rights
-- ============================================================
create table if not exists dam_rights (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references dam_assets(id) on delete cascade,
  tenant_id uuid not null,
  license_type text not null default 'proprietary'
    check (license_type in ('royalty_free','rights_managed','creative_commons','proprietary','public_domain')),
  copyright_holder text,
  copyright_year integer,
  attribution_required boolean not null default false,
  attribution_text text,
  usage_rights text[] not null default '{}',
  restricted_usage text[] not null default '{}',
  geographic_restrictions text[] not null default '{}',
  brand_restrictions text[] not null default '{}',
  marketplace_restrictions text[] not null default '{}',
  expires_at timestamptz,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_dam_rights_asset on dam_rights(asset_id);
create index if not exists idx_dam_rights_tenant on dam_rights(tenant_id);
create index if not exists idx_dam_rights_expires on dam_rights(expires_at);

-- ============================================================
-- dam_usage
-- ============================================================
create table if not exists dam_usage (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references dam_assets(id) on delete cascade,
  tenant_id uuid not null,
  context_type text not null,
  context_id text not null,
  used_by uuid not null,
  used_at timestamptz not null default now()
);

create index if not exists idx_dam_usage_asset on dam_usage(asset_id);
create index if not exists idx_dam_usage_tenant on dam_usage(tenant_id);

-- ============================================================
-- dam_processing_jobs
-- ============================================================
create table if not exists dam_processing_jobs (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references dam_assets(id) on delete cascade,
  tenant_id uuid not null,
  operation text not null,
  status text not null default 'queued'
    check (status in ('queued','processing','completed','failed','skipped')),
  priority integer not null default 5,
  attempts integer not null default 0,
  max_attempts integer not null default 3,
  payload jsonb not null default '{}',
  result jsonb,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_dam_jobs_asset on dam_processing_jobs(asset_id);
create index if not exists idx_dam_jobs_status on dam_processing_jobs(status);
create index if not exists idx_dam_jobs_tenant on dam_processing_jobs(tenant_id);
create index if not exists idx_dam_jobs_priority on dam_processing_jobs(priority desc, created_at asc);

-- ============================================================
-- dam_derivatives
-- ============================================================
create table if not exists dam_derivatives (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references dam_assets(id) on delete cascade,
  tenant_id uuid not null,
  derivative_type text not null,
  width integer,
  height integer,
  format text not null,
  quality integer,
  storage_path text not null,
  cdn_url text,
  file_size bigint not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_dam_derivatives_asset on dam_derivatives(asset_id);

-- ============================================================
-- dam_similarity
-- ============================================================
create table if not exists dam_similarity (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references dam_assets(id) on delete cascade,
  similar_asset_id uuid not null references dam_assets(id) on delete cascade,
  tenant_id uuid not null,
  similarity_score numeric not null check (similarity_score between 0 and 1),
  is_duplicate boolean not null default false,
  created_at timestamptz not null default now(),
  unique(asset_id, similar_asset_id)
);

create index if not exists idx_dam_similarity_asset on dam_similarity(asset_id);
create index if not exists idx_dam_similarity_score on dam_similarity(similarity_score desc);
create index if not exists idx_dam_similarity_dupe on dam_similarity(is_duplicate) where is_duplicate = true;

-- ============================================================
-- dam_download_logs
-- ============================================================
create table if not exists dam_download_logs (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references dam_assets(id) on delete cascade,
  tenant_id uuid not null,
  downloaded_by uuid not null,
  ip_address inet,
  user_agent text,
  derivative_type text,
  created_at timestamptz not null default now()
);

create index if not exists idx_dam_downloads_asset on dam_download_logs(asset_id);
create index if not exists idx_dam_downloads_tenant on dam_download_logs(tenant_id);

-- ============================================================
-- dam_audit
-- ============================================================
create table if not exists dam_audit (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid references dam_assets(id) on delete set null,
  tenant_id uuid not null,
  action text not null,
  actor_id uuid not null,
  details jsonb not null default '{}',
  ip_address inet,
  created_at timestamptz not null default now()
);

create index if not exists idx_dam_audit_tenant on dam_audit(tenant_id);
create index if not exists idx_dam_audit_asset on dam_audit(asset_id);
create index if not exists idx_dam_audit_created on dam_audit(created_at desc);

-- ============================================================
-- RLS Policies — reuse Sprint 11 tenant isolation pattern
-- ============================================================
alter table dam_assets enable row level security;
alter table dam_folders enable row level security;
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

-- dam_assets RLS
create policy "dam_assets_tenant_isolation" on dam_assets
  for all using (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- dam_folders RLS
create policy "dam_folders_tenant_isolation" on dam_folders
  for all using (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- dam_collections RLS
create policy "dam_collections_tenant_isolation" on dam_collections
  for all using (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- dam_tags RLS
create policy "dam_tags_tenant_isolation" on dam_tags
  for all using (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- dam_rights RLS
create policy "dam_rights_tenant_isolation" on dam_rights
  for all using (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- dam_processing_jobs RLS
create policy "dam_jobs_tenant_isolation" on dam_processing_jobs
  for all using (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- dam_ai_analysis RLS
create policy "dam_ai_tenant_isolation" on dam_ai_analysis
  for all using (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- dam_audit RLS
create policy "dam_audit_tenant_isolation" on dam_audit
  for all using (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- dam_download_logs RLS
create policy "dam_downloads_tenant_isolation" on dam_download_logs
  for all using (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- dam_similarity RLS
create policy "dam_similarity_tenant_isolation" on dam_similarity
  for all using (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- dam_usage RLS
create policy "dam_usage_tenant_isolation" on dam_usage
  for all using (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- dam_derivatives RLS
create policy "dam_derivatives_tenant_isolation" on dam_derivatives
  for all using (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- dam_metadata RLS
create policy "dam_metadata_tenant_isolation" on dam_metadata
  for all using (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- dam_collection_assets — joined via collection tenant
create policy "dam_ca_tenant_isolation" on dam_collection_assets
  for all using (
    exists (
      select 1 from dam_collections c
      where c.id = dam_collection_assets.collection_id
        and c.tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    )
  );

-- dam_asset_versions
create policy "dam_versions_tenant_isolation" on dam_asset_versions
  for all using (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- dam_asset_tags — joined via asset tenant
create policy "dam_asset_tags_tenant_isolation" on dam_asset_tags
  for all using (
    exists (
      select 1 from dam_assets a
      where a.id = dam_asset_tags.asset_id
        and a.tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    )
  );

-- ============================================================
-- Updated_at trigger (reuse pattern)
-- ============================================================
create or replace function update_dam_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_dam_assets_updated_at
  before update on dam_assets
  for each row execute function update_dam_updated_at();

create trigger trg_dam_folders_updated_at
  before update on dam_folders
  for each row execute function update_dam_updated_at();

create trigger trg_dam_collections_updated_at
  before update on dam_collections
  for each row execute function update_dam_updated_at();

create trigger trg_dam_rights_updated_at
  before update on dam_rights
  for each row execute function update_dam_updated_at();

create trigger trg_dam_jobs_updated_at
  before update on dam_processing_jobs
  for each row execute function update_dam_updated_at();
