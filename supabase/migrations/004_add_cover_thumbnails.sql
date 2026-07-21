alter table public.releases
  add column if not exists thumbnail_path text;

create index if not exists releases_thumbnail_path_idx
  on public.releases (thumbnail_path)
  where thumbnail_path is not null;

notify pgrst, 'reload schema';
