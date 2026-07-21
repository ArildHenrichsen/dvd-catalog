create extension if not exists pgcrypto;

create table if not exists public.releases (
  id uuid primary key default gen_random_uuid(),
  original_title text not null check (char_length(trim(original_title)) between 1 and 240),
  alternative_title text,
  release_year integer check (release_year between 1888 and extract(year from current_date)::integer + 1),
  region text,
  edition text,
  imdb_score numeric(3,1) check (imdb_score between 0 and 10),
  imdb_url text,
  notes text,
  cover_path text,
  is_wishlist boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists releases_original_title_idx on public.releases (lower(original_title));
create index if not exists releases_alternative_title_idx on public.releases (lower(alternative_title));
create index if not exists releases_year_idx on public.releases (release_year);
create index if not exists releases_region_idx on public.releases (region);
create index if not exists releases_score_idx on public.releases (imdb_score);
create index if not exists releases_wishlist_idx on public.releases (is_wishlist, created_at desc);
create index if not exists releases_created_idx on public.releases (created_at desc);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists releases_set_updated_at on public.releases;
create trigger releases_set_updated_at before update on public.releases
for each row execute function public.set_updated_at();

alter table public.releases enable row level security;
-- Ingen anon/authenticated policies i v1. All tilgang går via serverens secret key.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('covers','covers',false,10485760,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public=false, file_size_limit=10485760,
allowed_mime_types=array['image/jpeg','image/png','image/webp'];
