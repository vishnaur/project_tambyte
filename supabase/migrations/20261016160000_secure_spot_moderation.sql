-- Proposal only: compare the deployed schema, all grants, and every spots/admins
-- policy in staging before applying. The checks below intentionally abort on drift.

do $$
begin
  if to_regclass('public.admins') is null
     or not exists (
       select 1
       from information_schema.columns
       where table_schema = 'public'
         and table_name = 'admins'
         and column_name = 'user_id'
         and udt_name = 'uuid'
     ) then
    raise exception 'Expected public.admins.user_id UUID. Inspect the deployed administrator model before applying.';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'spots'
      and column_name = 'is_active'
      and udt_name = 'bool'
  ) then
    raise exception 'Expected public.spots.is_active boolean. Inspect the deployed spots schema before applying.';
  end if;

  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'spots'
      and (
        policyname <> 'Anyone can read active spots'
        or cmd <> 'SELECT'
        or coalesce(regexp_replace(qual, '[()[:space:]]', '', 'g'), '') <> 'is_active=true'
        or not ('anon' = any(roles) and 'authenticated' = any(roles))
      )
  ) or not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'spots'
      and policyname = 'Anyone can read active spots'
  ) then
    raise exception 'Unexpected public.spots policies exist. Review their interaction before adapting this proposal.';
  end if;

  if to_regprocedure('public.is_admin()') is not null then
    raise exception 'public.is_admin() already exists. Review its implementation before adapting this proposal.';
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'spots'
      and column_name = 'approved'
  ) then
    alter table public.spots add column approved boolean;
    update public.spots set approved = is_active;
  elsif not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'spots'
      and column_name = 'approved'
      and udt_name = 'bool'
  ) then
    raise exception 'public.spots.approved exists but is not boolean; inspect the schema before applying.';
  end if;

  update public.spots
  set approved = is_active
  where approved is null;
end
$$;

alter table public.spots
  alter column approved set default false,
  alter column approved set not null,
  alter column is_active set default false,
  add column if not exists open_time text,
  add column if not exists close_time text,
  add column if not exists budget_range text,
  add column if not exists estimated_walk_mins integer,
  add column if not exists image_path text,
  add column if not exists admin_edited boolean not null default false,
  add column if not exists approved_by uuid references auth.users(id),
  add column if not exists approved_at timestamptz;

do $$
begin
  if exists (
    select 1
    from public.spots
    where image_path is not null
      and image_path !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$'
  ) then
    raise exception 'Found existing image_path values outside the supported UUID filename format. Review them manually before applying.';
  end if;

  if exists (
    select 1
    from public.spots
    where image_url is not null
      and image_path is null
      and image_url !~ '^https?://[^/]+/storage/v1/object/public/spot-images/[0-9A-Fa-f-]{36}\.(jpg|png|webp)(\?.*)?$'
  ) then
    raise exception 'Found image URLs that cannot be mapped to a spot-images object path. Review and migrate them manually first.';
  end if;

  update public.spots
  set image_path = substring(
        image_url from '/storage/v1/object/public/spot-images/([0-9A-Fa-f-]{36}\.(jpg|png|webp))'
      ),
      image_url = null
  where image_url is not null
    and image_path is null;
end
$$;

do $$
declare
  constraint_name text;
begin
  if exists (
    select 1
    from public.spots
    where char_length(btrim(name)) not between 1 and 120
       or category not in ('Food', 'Study', 'Relaxation', 'Recreation', 'Shopping', 'Essentials', 'Other')
       or (description is not null and char_length(description) > 2000)
       or (location_description is not null and char_length(location_description) > 300)
       or char_length(btrim(hours)) not between 1 and 120
       or (budget_range is not null and char_length(budget_range) > 100)
       or (
         image_path is not null
         and image_path !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$'
       )
  ) then
    raise exception 'Existing spot data violates the proposed input constraints. Review and correct the data in staging before applying.';
  end if;

  foreach constraint_name in array array[
    'spots_name_length_check',
    'spots_category_check',
    'spots_description_length_check',
    'spots_location_description_length_check',
    'spots_hours_length_check',
    'spots_budget_range_length_check',
    'spots_image_path_check',
    'spots_image_url_null_check',
    'spots_open_time_check',
    'spots_close_time_check'
  ]
  loop
    if exists (
      select 1
      from pg_constraint
      where conrelid = 'public.spots'::regclass
        and conname = constraint_name
    ) then
      raise exception 'Constraint % already exists. Review it before adapting this proposal.', constraint_name;
    end if;
  end loop;
end
$$;

alter table public.spots
  add constraint spots_name_length_check
    check (char_length(btrim(name)) between 1 and 120) not valid,
  add constraint spots_category_check
    check (category in ('Food', 'Study', 'Relaxation', 'Recreation', 'Shopping', 'Essentials', 'Other')) not valid,
  add constraint spots_description_length_check
    check (description is null or char_length(description) <= 2000) not valid,
  add constraint spots_location_description_length_check
    check (location_description is null or char_length(location_description) <= 300) not valid,
  add constraint spots_hours_length_check
    check (char_length(btrim(hours)) between 1 and 120) not valid,
  add constraint spots_budget_range_length_check
    check (budget_range is null or char_length(budget_range) <= 100) not valid,
  add constraint spots_image_path_check
    check (
      image_path is null
      or image_path ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$'
    ) not valid,
  add constraint spots_image_url_null_check
    check (image_url is null) not valid,
  add constraint spots_open_time_check
    check (
      open_time is null
      or open_time ~ '^(?:[01][0-9]|2[0-3]):[0-5][0-9](?::[0-5][0-9])?$'
    ) not valid,
  add constraint spots_close_time_check
    check (
      close_time is null
      or close_time ~ '^(?:[01][0-9]|2[0-3]):[0-5][0-9](?::[0-5][0-9])?$'
    ) not valid;

create index if not exists spots_image_path_idx
  on public.spots (image_path)
  where image_path is not null;

-- The frontend's admin-table lookup is replaced with this narrow, read-only
-- predicate. No client role can grant itself access to public.admins.
alter table public.admins enable row level security;
revoke all on public.admins from public, anon, authenticated;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
set row_security = off
as $function$
  select exists (
    select 1
    from public.admins
    where user_id = auth.uid()
  );
$function$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

alter table public.spots enable row level security;
revoke all on public.spots from public, anon, authenticated;
grant select, insert on public.spots to anon, authenticated;
grant update, delete on public.spots to authenticated;

drop policy if exists "Anyone can read active spots" on public.spots;
drop policy if exists "Public can read approved spots" on public.spots;
drop policy if exists "Admins can read all spots" on public.spots;
drop policy if exists "Public can submit pending spots" on public.spots;
drop policy if exists "Admins can manage spots" on public.spots;

create policy "Public can read approved spots"
  on public.spots
  for select
  to anon, authenticated
  using (
    (approved = true and is_active = true)
    or public.is_admin()
  );

create policy "Admins can read all spots"
  on public.spots
  for select
  to authenticated
  using (public.is_admin());

create policy "Public can submit pending spots"
  on public.spots
  for insert
  to anon, authenticated
  with check (
    public.is_admin()
    or (
      approved = false
      and is_active = false
      and approved_by is null
      and approved_at is null
      and admin_edited = false
      and image_url is null
    )
  );

create policy "Admins can manage spots"
  on public.spots
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
