alter table public.releases
  add column if not exists auto_keywords text[] not null default '{}',
  add column if not exists manual_keywords text[] not null default '{}',
  add column if not exists keywords_source text,
  add column if not exists keywords_updated_at timestamptz,
  add column if not exists times_suggested integer not null default 0,
  add column if not exists last_suggested_at timestamptz,
  add column if not exists theme_suggestion_counts jsonb not null default '{}'::jsonb;

create index if not exists releases_last_suggested_idx
  on public.releases (last_suggested_at desc)
  where last_suggested_at is not null;

create table if not exists public.movie_metadata_cache (
  imdb_id text primary key,
  source text not null,
  payload jsonb not null,
  fetched_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists movie_metadata_cache_set_updated_at on public.movie_metadata_cache;
create trigger movie_metadata_cache_set_updated_at before update on public.movie_metadata_cache
for each row execute function public.set_updated_at();

create table if not exists public.movie_night_history (
  id uuid primary key default gen_random_uuid(),
  theme_id text not null,
  theme_title text not null,
  release_ids uuid[] not null,
  keywords text[] not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists movie_night_history_created_idx
  on public.movie_night_history (created_at desc);

create index if not exists movie_night_history_theme_idx
  on public.movie_night_history (theme_id, created_at desc);

alter table public.movie_metadata_cache enable row level security;
alter table public.movie_night_history enable row level security;

notify pgrst, 'reload schema';
