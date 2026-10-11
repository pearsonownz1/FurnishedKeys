-- Admin console. submitted_at orders the review queue. Lead statuses gain
-- qualified and onboarded. Notes already exist. Review notes can be 4000
-- characters. Lead updates from the Data API are admin only.

alter table public.listings
  add column if not exists submitted_at timestamptz;

comment on column public.listings.submitted_at is
  'When the listing last moved to pending_review. Stamped by the listing guard.';

update public.listings
set submitted_at = updated_at
where status = 'pending_review'
  and submitted_at is null;

create index if not exists listings_pending_submitted_idx
  on public.listings (submitted_at)
  where status = 'pending_review';

alter table public.listings drop constraint if exists listings_admin_note_length;
alter table public.listings add constraint listings_admin_note_length check (
  admin_note is null or char_length(admin_note) between 1 and 4000
);

alter table public.listings drop constraint if exists listings_rejection_length;
alter table public.listings add constraint listings_rejection_length check (
  rejection_reason is null or char_length(rejection_reason) between 1 and 4000
);

alter type public.owner_lead_status add value if not exists 'qualified' before 'closed';
alter type public.owner_lead_status add value if not exists 'onboarded' before 'closed';

drop policy if exists owner_leads_update on public.owner_leads;
create policy owner_leads_update
  on public.owner_leads
  for update
  to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create or replace function private.enforce_listing_guards()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (tg_op = 'INSERT' and new.status::text = 'pending_review')
    or (
      tg_op = 'UPDATE'
      and new.status is distinct from old.status
      and new.status::text = 'pending_review'
    )
  then
    new.submitted_at := pg_catalog.now();
  end if;

  if private.listing_guard_bypass() then
    if tg_op = 'INSERT' and new.status::text in ('approved', 'rejected') then
      new.reviewed_at := coalesce(new.reviewed_at, pg_catalog.now());
      new.reviewed_by := coalesce(new.reviewed_by, (select auth.uid()));
    elsif tg_op = 'UPDATE'
      and new.status is distinct from old.status
      and new.status::text in ('approved', 'rejected')
    then
      new.reviewed_at := coalesce(new.reviewed_at, pg_catalog.now());
      new.reviewed_by := coalesce(new.reviewed_by, (select auth.uid()));
    end if;
    return new;
  end if;

  if not exists (
    select 1
    from public.locations
    where id = new.location_id
      and active
  ) then
    raise exception 'Listings must use an active location';
  end if;

  if tg_op = 'INSERT' then
    if new.status::text in ('approved', 'rejected', 'changes_requested') then
      raise exception 'Only an admin can set listing status to %', new.status
        using errcode = '42501';
    end if;
    if new.submitted_at is not null and new.status::text <> 'pending_review' then
      raise exception 'Only an admin can set submitted_at'
        using errcode = '42501';
    end if;
    if new.is_demo then
      raise exception 'Only an admin can create a demo listing'
        using errcode = '42501';
    end if;
    if new.listing_fee_status is distinct from 'unpaid' then
      raise exception 'Only an admin can set listing fee status'
        using errcode = '42501';
    end if;
    if new.reviewed_by is not null
      or new.reviewed_at is not null
      or new.rejection_reason is not null
      or new.admin_note is not null
      or new.fee_paid_through is not null
      or new.paid_at is not null
      or new.stripe_subscription_id is not null
      or new.renewal_canceled
    then
      raise exception 'Only an admin can set review or billing fields'
        using errcode = '42501';
    end if;
  else
    if new.owner_id is distinct from old.owner_id then
      raise exception 'Only an admin can reassign a listing'
        using errcode = '42501';
    end if;
    if new.status is distinct from old.status
      and new.status::text in ('approved', 'rejected', 'changes_requested')
    then
      raise exception 'Only an admin can set listing status to %', new.status
        using errcode = '42501';
    end if;
    if new.submitted_at is distinct from old.submitted_at
      and not (
        new.status is distinct from old.status
        and new.status::text = 'pending_review'
      )
    then
      raise exception 'Only an admin can set submitted_at'
        using errcode = '42501';
    end if;
    if new.is_demo is distinct from old.is_demo then
      raise exception 'Only an admin can change is_demo'
        using errcode = '42501';
    end if;
    if new.listing_fee_status is distinct from old.listing_fee_status
      or new.fee_paid_through is distinct from old.fee_paid_through
      or new.paid_at is distinct from old.paid_at
      or new.admin_note is distinct from old.admin_note
      or new.stripe_subscription_id is distinct from old.stripe_subscription_id
      or new.renewal_canceled is distinct from old.renewal_canceled
      or new.source is distinct from old.source
    then
      raise exception 'Only an admin can change listing billing, source, or notes'
        using errcode = '42501';
    end if;
    if new.reviewed_by is distinct from old.reviewed_by
      or new.reviewed_at is distinct from old.reviewed_at
      or new.rejection_reason is distinct from old.rejection_reason
    then
      raise exception 'Only an admin can change review fields'
        using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;
