alter table public.spots
  add column if not exists has_outlets boolean not null default false,
  add column if not exists has_wifi boolean not null default false,
  add column if not exists has_aircon boolean not null default false,
  add column if not exists has_restroom boolean not null default false,
  add column if not exists is_shaded boolean not null default false,
  add column if not exists is_quiet boolean not null default false;
