alter table public.releases
  add column if not exists overview text,
  add column if not exists runtime_minutes integer check (runtime_minutes between 1 and 999),
  add column if not exists genres text[] not null default '{}',
  add column if not exists metadata_provider text,
  add column if not exists metadata_provider_id text,
  add column if not exists metadata_last_enriched_at timestamptz,
  add column if not exists metadata_manual_fields text[] not null default '{}';

create index if not exists releases_metadata_provider_idx
  on public.releases (metadata_provider, metadata_provider_id)
  where metadata_provider is not null and metadata_provider_id is not null;

notify pgrst, 'reload schema';
