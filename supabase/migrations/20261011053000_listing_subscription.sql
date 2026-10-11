-- Yearly $199 listing subscription, stub drafts, attribution, and review changes.
-- Does not edit earlier migrations. Supabase already owns storage.objects.

alter type public.listing_status add value if not exists 'changes_requested';

alter table public.listings
  alter column slug drop not null,
  alter column title drop not null,
  alter column bedrooms drop not null,
  alter column bathrooms drop not null,
  alter column max_occupants drop not null,
  alter column monthly_rent_cents drop not null;

alter table public.listings drop constraint if exists listings_slug_format;
alter table public.listings add constraint listings_slug_format check (
  slug is null or slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
);

alter table public.listings drop constraint if exists listings_title_length;
alter table public.listings add constraint listings_title_length check (
  title is null or char_length(title) between 1 and 140
);

alter table public.listings drop constraint if exists listings_bedrooms_range;
alter table public.listings add constraint listings_bedrooms_range check (
  bedrooms is null or bedrooms between 0 and 30
);

alter table public.listings drop constraint if exists listings_bathrooms_range;
alter table public.listings add constraint listings_bathrooms_range check (
  bathrooms is null or bathrooms between 0 and 30
);

alter table public.listings drop constraint if exists listings_max_occupants_range;
alter table public.listings add constraint listings_max_occupants_range check (
  max_occupants is null or max_occupants between 1 and 50
);

alter table public.listings drop constraint if exists listings_rent_nonnegative;
alter table public.listings add constraint listings_rent_nonnegative check (
  monthly_rent_cents is null or monthly_rent_cents between 0 and 100000000
);

alter table public.listings
  add column if not exists fee_paid_through timestamptz,
  add column if not exists paid_at timestamptz,
  add column if not exists admin_note text,
  add column if not exists stripe_subscription_id text,
  add column if not exists renewal_canceled boolean not null default false,
  add column if not exists source text not null default 'web';

alter table public.listings drop constraint if exists listings_admin_note_length;
alter table public.listings add constraint listings_admin_note_length check (
  admin_note is null or char_length(admin_note) between 1 and 2000
);

alter table public.listings drop constraint if exists listings_source_format;
alter table public.listings add constraint listings_source_format check (
  source ~ '^[a-z0-9_-]{1,40}$'
);

create unique index if not exists listings_stripe_subscription_id_idx
  on public.listings (stripe_subscription_id)
  where stripe_subscription_id is not null;

alter table public.listings drop constraint if exists listings_approved_complete;
alter table public.listings add constraint listings_approved_complete check (
  status::text <> 'approved'
  or (
    title is not null
    and description is not null
    and monthly_rent_cents > 0
    and listing_fee_status in ('paid', 'waived')
  )
);

comment on column public.listings.fee_paid_through is
  'End of the paid subscription period. Public approved listings need this in the future unless the fee is waived.';
comment on column public.listings.paid_at is
  'When the latest successful listing subscription payment was recorded.';
comment on column public.listings.admin_note is
  'Note from approve, request changes, or reject. Shown on the owner dashboard.';
comment on column public.listings.renewal_canceled is
  'Mirrors Stripe cancel_at_period_end. The listing stays live until fee_paid_through.';
comment on column public.listings.source is
  'Acquisition slug. Default web. Same format as owner_leads.source. Owners cannot change it.';

-- Owners cannot set billing fields, the admin note, source, or review-only statuses.
create or replace function private.enforce_listing_guards()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
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

-- Approved listings stay public only while the yearly fee is current, or waived.
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
      and (
        listing_fee_status = 'waived'
        or (
          listing_fee_status = 'paid'
          and fee_paid_through > pg_catalog.now()
        )
      )
  );
$$;

create or replace function private.storage_object_readable(object_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if (select private.is_admin()) then
    return true;
  end if;

  if private.owns_listing(private.uuid_or_null((storage.foldername(object_name))[1])) then
    return true;
  end if;

  return exists (
    select 1
    from public.listing_photos as photo
    where photo.storage_path = object_name
      and private.listing_is_public(photo.listing_id)
  );
end;
$$;

drop policy if exists listings_public_select on public.listings;
create policy listings_public_select
  on public.listings
  for select
  to anon, authenticated
  using (
    status = 'approved'
    and (
      listing_fee_status = 'waived'
      or (
        listing_fee_status = 'paid'
        and fee_paid_through > pg_catalog.now()
      )
    )
  );

grant select (
  fee_paid_through,
  paid_at,
  admin_note,
  stripe_subscription_id,
  renewal_canceled,
  source
) on table public.listings to authenticated;

-- Ledger of Stripe events and cancellation records. Writes are service role only.
create table if not exists public.listing_payments (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  stripe_event_id text not null unique,
  stripe_session_id text,
  stripe_invoice_id text,
  stripe_subscription_id text,
  amount_cents integer not null,
  status text not null,
  period_end timestamptz,
  created_at timestamptz not null default pg_catalog.now(),
  constraint listing_payments_amount_nonnegative check (amount_cents between 0 and 100000000),
  constraint listing_payments_status_value check (
    status in (
      'paid',
      'payment_failed',
      'subscription_deleted',
      'cancel_scheduled',
      'cancel_cleared'
    )
  )
);

create unique index if not exists listing_payments_session_id_idx
  on public.listing_payments (stripe_session_id)
  where stripe_session_id is not null;

create index if not exists listing_payments_listing_id_idx
  on public.listing_payments (listing_id);

comment on table public.listing_payments is
  'Stripe listing-fee events, idempotent on stripe_event_id. Service role writes. Owner and admin read.';

alter table public.listing_payments enable row level security;
alter table public.listing_payments force row level security;

drop policy if exists listing_payments_select on public.listing_payments;
create policy listing_payments_select
  on public.listing_payments
  for select
  to authenticated
  using (
    (select private.is_admin())
    or (select private.owns_listing(listing_id))
  );

revoke all on table public.listing_payments from public, anon, authenticated;
grant select on table public.listing_payments to authenticated;
grant all on table public.listing_payments to service_role;

-- One transaction: claim the event id, then apply the fee patch. Returns false if the event was already stored.
create or replace function public.apply_listing_fee_event(
  event_id text,
  target_listing uuid,
  session_id text,
  invoice_id text,
  subscription_id text,
  amount_cents integer,
  payment_status text,
  period_end timestamptz,
  update_listing boolean,
  next_fee_status public.listing_fee_status,
  next_paid_through timestamptz,
  next_paid_at timestamptz,
  next_subscription_id text,
  next_renewal_canceled boolean
) returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if coalesce(auth.role(), '') is distinct from 'service_role'
    and current_user not in ('postgres', 'supabase_admin')
  then
    raise exception 'service role required' using errcode = '42501';
  end if;

  insert into public.listing_payments (
    listing_id,
    stripe_event_id,
    stripe_session_id,
    stripe_invoice_id,
    stripe_subscription_id,
    amount_cents,
    status,
    period_end
  ) values (
    target_listing,
    event_id,
    session_id,
    invoice_id,
    subscription_id,
    amount_cents,
    payment_status,
    period_end
  )
  on conflict (stripe_event_id) do nothing;

  if not found then
    return false;
  end if;

  if update_listing then
    update public.listings
    set listing_fee_status = next_fee_status,
        fee_paid_through = next_paid_through,
        paid_at = next_paid_at,
        stripe_subscription_id = next_subscription_id,
        renewal_canceled = next_renewal_canceled
    where id = target_listing;
  end if;

  return true;
end;
$$;

revoke all on function public.apply_listing_fee_event(
  text, uuid, text, text, text, integer, text, timestamptz, boolean,
  public.listing_fee_status, timestamptz, timestamptz, text, boolean
) from public, anon, authenticated;

grant execute on function public.apply_listing_fee_event(
  text, uuid, text, text, text, integer, text, timestamptz, boolean,
  public.listing_fee_status, timestamptz, timestamptz, text, boolean
) to service_role;
