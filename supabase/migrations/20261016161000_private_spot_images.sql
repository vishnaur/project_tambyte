-- Proposal requires review of all deployed storage.objects policies before application.
-- The preflight intentionally stops if policies beyond this repository's known upload
-- policy exist, so another permissive policy cannot silently keep the bucket public.

do $$
begin
  if to_regclass('storage.objects') is null then
    raise exception 'Supabase Storage is unavailable; inspect project setup before applying.';
  end if;

  if not exists (
    select 1
    from storage.buckets
    where id = 'spot-images'
  ) then
    raise exception 'Expected the spot-images bucket from the existing storage setup.';
  end if;

  if exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and (
        policyname <> 'Anyone can upload spot images'
        or cmd <> 'INSERT'
        or coalesce(with_check, '') not ilike '%spot-images%'
      )
  ) then
    raise exception 'Unexpected storage.objects policies exist. Review all bucket policies and adapt this proposal before applying.';
  end if;
end
$$;

update storage.buckets
set public = false,
    file_size_limit = 5242880,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id = 'spot-images';

drop policy if exists "Anyone can upload spot images" on storage.objects;
drop policy if exists "Public can read approved spot images" on storage.objects;
drop policy if exists "Admins can read spot images" on storage.objects;
drop policy if exists "Anyone can upload unique spot images" on storage.objects;
drop policy if exists "Admins can update spot images" on storage.objects;
drop policy if exists "Admins can delete spot images" on storage.objects;

create policy "Public can read approved spot images"
  on storage.objects
  for select
  to anon, authenticated
  using (
    bucket_id = 'spot-images'
    and (
      public.is_admin()
      or exists (
        select 1
        from public.spots
        where spots.image_path = storage.objects.name
          and spots.approved = true
          and spots.is_active = true
      )
    )
  );

create policy "Admins can read spot images"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'spot-images'
    and public.is_admin()
  );

create policy "Anyone can upload unique spot images"
  on storage.objects
  for insert
  to anon, authenticated
  with check (
    bucket_id = 'spot-images'
    and name ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$'
    and metadata->>'mimetype' in ('image/jpeg', 'image/png', 'image/webp')
  );

create policy "Admins can update spot images"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'spot-images'
    and public.is_admin()
  )
  with check (
    bucket_id = 'spot-images'
    and public.is_admin()
  );

create policy "Admins can delete spot images"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'spot-images'
    and public.is_admin()
  );
