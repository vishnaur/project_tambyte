-- Proposal only: the repository has no CREATE TABLE migrations for these tables.
-- Confirm all table definitions, defaults, foreign keys, and policies in staging.
-- This proposal deliberately aborts if any policies already exist on either table.

do $$
declare
  required_column text;
begin
  if to_regclass('public.reports') is null
     or to_regclass('public.admin_logs') is null then
    raise exception 'Expected public.reports and public.admin_logs. Inspect the deployed schema before applying.';
  end if;

  foreach required_column in array array[
    'id', 'spot_id', 'spot_name', 'reason', 'description', 'status', 'created_at'
  ]
  loop
    if not exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'reports'
        and column_name = required_column
    ) then
      raise exception 'Expected public.reports.% column. Inspect the deployed schema before applying.', required_column;
    end if;
  end loop;

  foreach required_column in array array[
    'admin_id', 'admin_email', 'action', 'spot_name', 'details', 'created_at'
  ]
  loop
    if not exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'admin_logs'
        and column_name = required_column
    ) then
      raise exception 'Expected public.admin_logs.% column. Inspect the deployed schema before applying.', required_column;
    end if;
  end loop;

  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename in ('reports', 'admin_logs')
  ) then
    raise exception 'Existing reports/admin_logs policies detected. Review permissive-policy behavior before adapting this proposal.';
  end if;

  if exists (
    select 1
    from pg_trigger
    where not tgisinternal
      and tgname in (
        'spots_write_admin_audit_log',
        'reports_write_admin_audit_log'
      )
  ) then
    raise exception 'An audit trigger with a proposed name already exists. Review it before applying.';
  end if;

  if to_regprocedure('public.write_admin_audit_log()') is not null then
    raise exception 'public.write_admin_audit_log() already exists. Review it before applying.';
  end if;
end
$$;

alter table public.reports enable row level security;
alter table public.admin_logs enable row level security;

revoke all on public.reports from public, anon, authenticated;
revoke all on public.admin_logs from public, anon, authenticated;
grant insert on public.reports to anon, authenticated;
grant select, delete on public.reports to authenticated;
grant select on public.admin_logs to authenticated;

create policy "Public can submit pending reports"
  on public.reports
  for insert
  to anon, authenticated
  with check (
    status = 'pending'
    and reason in (
      'Wrong Location',
      'Permanently Closed',
      'Incorrect Hours',
      'Broken Outlets or Wi-Fi',
      'Other'
    )
    and char_length(btrim(spot_name)) between 1 and 120
    and char_length(description) <= 2000
    and exists (
      select 1
      from public.spots
      where spots.id = reports.spot_id
        and spots.approved = true
        and spots.is_active = true
    )
  );

create policy "Admins can read reports"
  on public.reports
  for select
  to authenticated
  using (public.is_admin());

create policy "Admins can delete reports"
  on public.reports
  for delete
  to authenticated
  using (public.is_admin());

create policy "Admins can read admin logs"
  on public.admin_logs
  for select
  to authenticated
  using (public.is_admin());

create or replace function public.write_admin_audit_log()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
set row_security = off
as $function$
declare
  audit_action text;
  audit_spot_name text;
  audit_details text;
begin
  if auth.uid() is null or not public.is_admin() then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;

  if tg_table_name = 'spots' then
    if tg_op = 'INSERT' then
      if new.approved then
        audit_action := 'APPROVED_SPOT';
        audit_spot_name := new.name;
        audit_details := 'Admin added and published a spot';
      end if;
    elsif tg_op = 'UPDATE' then
      audit_action := case
        when old.approved = false and new.approved = true then 'APPROVED_SPOT'
        else 'EDITED_SPOT'
      end;
      audit_spot_name := new.name;
      audit_details := 'Admin updated spot';
    elsif tg_op = 'DELETE' then
      audit_action := 'DELETED_SPOT';
      audit_spot_name := old.name;
      audit_details := 'Admin deleted spot';
    end if;
  elsif tg_table_name = 'reports' and tg_op = 'DELETE' then
    audit_action := 'DISMISSED_REPORT';
    audit_spot_name := coalesce(old.spot_name, 'Unknown spot');
    audit_details := 'Admin dismissed report';
  end if;

  if audit_action is not null then
    insert into public.admin_logs (
      admin_id,
      admin_email,
      action,
      spot_name,
      details
    )
    values (
      auth.uid(),
      coalesce(auth.jwt()->>'email', 'Admin'),
      audit_action,
      audit_spot_name,
      audit_details
    );
  end if;

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$function$;

revoke all on function public.write_admin_audit_log() from public, anon, authenticated;

create trigger spots_write_admin_audit_log
  after insert or update or delete on public.spots
  for each row execute function public.write_admin_audit_log();

create trigger reports_write_admin_audit_log
  after delete on public.reports
  for each row execute function public.write_admin_audit_log();

-- Row-level policies cannot reliably rate-limit anonymous PostgREST callers:
-- they do not have a stable authenticated identity or trusted client IP.
-- Add a trusted edge/API endpoint with per-IP limits before enabling public launch.
