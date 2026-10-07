create table public.spots (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  category text not null,
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  location_description text,
  hours text not null,
  operating_hours jsonb,
  noise_level text,
  outlets_available boolean,
  image_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.spots enable row level security;

grant select on public.spots to anon, authenticated;

create policy "Anyone can read active spots"
  on public.spots
  for select
  to anon, authenticated
  using (is_active = true);
