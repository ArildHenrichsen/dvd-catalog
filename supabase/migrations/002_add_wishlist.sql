-- Legger til ønskelistestatus på eksisterende installasjoner.
alter table public.releases
  add column if not exists is_wishlist boolean not null default false;

create index if not exists releases_wishlist_idx
  on public.releases (is_wishlist, created_at desc);

comment on column public.releases.is_wishlist is
  'False betyr eid DVD i samlingen. True betyr ønskeliste.';

notify pgrst, 'reload schema';
