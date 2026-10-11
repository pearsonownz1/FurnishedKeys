-- Listing on FurnishedKeys is free. Approval is what makes a listing public.
-- listing_fee_status, fee_paid_through, and listing_payments stay for a later commission.

alter table public.listings drop constraint if exists listings_approved_complete;
alter table public.listings add constraint listings_approved_complete check (
  status::text <> 'approved'
  or (
    title is not null
    and description is not null
    and monthly_rent_cents > 0
  )
);

comment on column public.listings.listing_fee_status is
  'Record of a listing fee or a later commission. Not required to submit, approve, or show a listing.';
comment on column public.listings.fee_paid_through is
  'End of a recorded fee period, when one exists. Public visibility does not depend on it.';
comment on column public.listings.renewal_canceled is
  'Mirrors Stripe cancel_at_period_end when a subscription exists. Public visibility does not depend on it.';

create or replace function private.listing_is_public(target_listing uuid)
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
      and status = 'approved'
  );
$$;

comment on function private.listing_is_public(uuid) is
  'True when the listing is approved. The fee is not part of public visibility.';

drop policy if exists listings_public_select on public.listings;
create policy listings_public_select
  on public.listings
  for select
  to anon, authenticated
  using (status = 'approved');
