alter table public.spots
  add column if not exists admin_edited boolean not null default false,
  add column if not exists approved_by uuid references auth.users(id),
  add column if not exists approved_at timestamptz;
