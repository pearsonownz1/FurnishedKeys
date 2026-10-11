-- Inquiry inserts are allowed only on publicly visible listings that are not samples.
-- listing_is_public stays "approved": demo homes can still appear in the catalog.

create or replace function private.listing_is_demo(target_listing uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.listings
    where id = target_listing
      and is_demo
  );
$$;

comment on function private.listing_is_demo(uuid) is
  'True when the listing is a sample. Inquiry inserts reject these even if they are approved.';

revoke all on function private.listing_is_demo(uuid) from public;
grant execute on function private.listing_is_demo(uuid) to anon, authenticated, service_role;

drop policy if exists inquiries_insert on public.inquiries;
create policy inquiries_insert
  on public.inquiries
  for insert
  to anon, authenticated
  with check (
    status = 'new'
    and assigned_to is null
    and (renter_id is null or renter_id = (select auth.uid()))
    and (select private.listing_is_public(listing_id))
    and not (select private.listing_is_demo(listing_id))
  );

comment on policy inquiries_insert on public.inquiries is
  'Inserts require status new, no assignee, a publicly visible listing, and a non-demo listing.';
