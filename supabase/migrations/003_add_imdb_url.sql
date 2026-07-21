alter table public.releases
  add column if not exists imdb_url text;

alter table public.releases
  drop constraint if exists releases_imdb_url_check;

alter table public.releases
  add constraint releases_imdb_url_check
  check (imdb_url is null or imdb_url ~ '^https://(www\.)?imdb\.com/title/tt[0-9]{7,10}/?$');

notify pgrst, 'reload schema';
