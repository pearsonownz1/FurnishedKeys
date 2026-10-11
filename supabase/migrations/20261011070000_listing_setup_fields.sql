-- Listing setup fields, bedroom rows, blocked dates, and a public landlord card.
-- Adds columns and tables. Does not delete or rewrite existing rows.

alter table public.listings
  add column if not exists square_feet integer,
  add column if not exists space_description text,
  add column if not exists smoking_allowed boolean not null default false,
  add column if not exists calendar_updated_at timestamptz,
  add column if not exists good_for text[] not null default '{}';

alter table public.listings drop constraint if exists listings_square_feet_positive;
alter table public.listings add constraint listings_square_feet_positive check (
  square_feet is null or square_feet > 0
);

alter table public.listings drop constraint if exists listings_space_description_length;
alter table public.listings add constraint listings_space_description_length check (
  space_description is null or char_length(space_description) between 1 and 8000
);

comment on column public.listings.square_feet is
  'Interior size in square feet. Null until the owner sets it.';
comment on column public.listings.space_description is
  'The space. A longer description of the home, separate from the short description.';
comment on column public.listings.smoking_allowed is
  'Whether smoking is allowed. Default false.';
comment on column public.listings.calendar_updated_at is
  'When availability windows or blocked dates last changed.';
comment on column public.listings.good_for is
  'Who the home suits. Keys from lib/listings/good-for.ts. Default empty.';

alter table public.listing_photos
  add column if not exists is_cover boolean not null default false;

create unique index if not exists listing_photos_one_cover_idx
  on public.listing_photos (listing_id)
  where is_cover;

comment on column public.listing_photos.is_cover is
  'Exactly one cover photo per listing. Partial unique index.';

-- ---------------------------------------------------------------------------
-- Bedrooms. listings.bedrooms stays, and a trigger keeps it equal to the row count.
-- ---------------------------------------------------------------------------

create table if not exists public.listing_bedrooms (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  sort integer not null,
  label text not null,
  beds text not null,
  constraint listing_bedrooms_sort_range check (sort between 0 and 30),
  constraint listing_bedrooms_label_length check (char_length(label) between 1 and 80),
  constraint listing_bedrooms_beds_length check (char_length(beds) between 1 and 80)
);

create index if not exists listing_bedrooms_listing_sort_idx
  on public.listing_bedrooms (listing_id, sort);

comment on column public.listing_bedrooms.label is
  'Defaults to Bedroom N, where N is sort, when the insert omits a label.';
comment on column public.listing_bedrooms.beds is
  'Bed description, for example King bed, 3x Bunk beds, Queen bed, Twin bed, or Sofa bed.';

create or replace function private.listing_bedroom_label()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.sort is null then
    select coalesce(max(sort), 0) + 1
    into new.sort
    from public.listing_bedrooms
    where listing_id = new.listing_id;
  end if;

  if new.label is null or btrim(new.label) = '' then
    new.label := 'Bedroom ' || new.sort::text;
  else
    new.label := btrim(new.label);
  end if;

  new.beds := btrim(new.beds);
  if new.beds is null or new.beds = '' then
    raise exception 'Bedroom beds are required'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create or replace function private.sync_listing_bedroom_count()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  target uuid;
begin
  if tg_op = 'UPDATE' and old.listing_id is distinct from new.listing_id then
    update public.listings
    set bedrooms = (
      select count(*)::integer
      from public.listing_bedrooms
      where listing_id = old.listing_id
    )
    where id = old.listing_id;
  end if;

  target := case when tg_op = 'DELETE' then old.listing_id else new.listing_id end;

  update public.listings
  set bedrooms = (
    select count(*)::integer
    from public.listing_bedrooms
    where listing_id = target
  )
  where id = target;

  return coalesce(new, old);
end;
$$;

drop trigger if exists listing_bedrooms_label on public.listing_bedrooms;
create trigger listing_bedrooms_label
  before insert or update on public.listing_bedrooms
  for each row
  execute function private.listing_bedroom_label();

drop trigger if exists listing_bedrooms_sync_count on public.listing_bedrooms;
create trigger listing_bedrooms_sync_count
  after insert or update or delete on public.listing_bedrooms
  for each row
  execute function private.sync_listing_bedroom_count();

-- ---------------------------------------------------------------------------
-- At most 20 photos. The upload route checks the same limit before signing.
-- ---------------------------------------------------------------------------

create or replace function private.enforce_listing_photo_limit()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  existing integer;
begin
  if tg_op = 'UPDATE' and new.listing_id is not distinct from old.listing_id then
    return new;
  end if;

  select count(*)::integer
  into existing
  from public.listing_photos
  where listing_id = new.listing_id;

  if existing >= 20 then
    raise exception 'A listing can have at most 20 photos'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists listing_photos_limit on public.listing_photos;
create trigger listing_photos_limit
  before insert or update on public.listing_photos
  for each row
  execute function private.enforce_listing_photo_limit();

-- ---------------------------------------------------------------------------
-- Blocked dates. Same read pattern as listing photos.
-- ---------------------------------------------------------------------------

create table if not exists public.listing_blocked_dates (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  start_date date not null,
  end_date date not null,
  note text,
  constraint listing_blocked_dates_range check (end_date >= start_date),
  constraint listing_blocked_dates_note_length check (
    note is null or char_length(note) between 1 and 500
  )
);

create index if not exists listing_blocked_dates_listing_start_idx
  on public.listing_blocked_dates (listing_id, start_date);

create or replace function private.touch_listing_calendar()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  target uuid;
begin
  target := coalesce(new.listing_id, old.listing_id);
  update public.listings
  set calendar_updated_at = pg_catalog.now()
  where id = target;
  return coalesce(new, old);
end;
$$;

drop trigger if exists availability_windows_touch_calendar on public.availability_windows;
create trigger availability_windows_touch_calendar
  after insert or update or delete on public.availability_windows
  for each row
  execute function private.touch_listing_calendar();

drop trigger if exists listing_blocked_dates_touch_calendar on public.listing_blocked_dates;
create trigger listing_blocked_dates_touch_calendar
  after insert or update or delete on public.listing_blocked_dates
  for each row
  execute function private.touch_listing_calendar();

-- ---------------------------------------------------------------------------
-- Public landlord card. First name, last initial, and when the profile was created.
-- Empty unless the listing is publicly visible. No email, phone, or other profile fields.
-- ---------------------------------------------------------------------------

create or replace function public.public_listing_landlord(listing_id uuid)
returns table (
  first_name text,
  last_initial text,
  member_since timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    nullif(tokens.parts[1], '') as first_name,
    case
      when coalesce(array_length(tokens.parts, 1), 0) < 2 then null
      else upper(left(tokens.parts[array_length(tokens.parts, 1)], 1))
    end as last_initial,
    profile.created_at as member_since
  from public.listings as listing
  join public.profiles as profile on profile.id = listing.owner_id
  cross join lateral (
    select regexp_split_to_array(btrim(coalesce(profile.full_name, '')), '\s+') as parts
  ) as tokens
  where listing.id = public_listing_landlord.listing_id
    and private.listing_is_public(listing.id);
$$;

comment on function public.public_listing_landlord(uuid) is
  'Public landlord card for a visible listing: first name, last initial, and profile created_at. Returns no row otherwise. Does not expose email or phone.';

revoke all on function public.public_listing_landlord(uuid) from public;
grant execute on function public.public_listing_landlord(uuid) to anon, authenticated, service_role;

revoke all on function private.listing_bedroom_label() from public;
revoke all on function private.sync_listing_bedroom_count() from public;
revoke all on function private.enforce_listing_photo_limit() from public;
revoke all on function private.touch_listing_calendar() from public;
grant execute on function private.listing_bedroom_label() to anon, authenticated, service_role;
grant execute on function private.sync_listing_bedroom_count() to anon, authenticated, service_role;
grant execute on function private.enforce_listing_photo_limit() to anon, authenticated, service_role;
grant execute on function private.touch_listing_calendar() to anon, authenticated, service_role;

-- New listing columns are not covered by the earlier column grants.
grant select (
  square_feet,
  space_description,
  smoking_allowed,
  calendar_updated_at,
  good_for
) on table public.listings to anon, authenticated;

revoke all on table public.listing_bedrooms from public, anon, authenticated;
revoke all on table public.listing_blocked_dates from public, anon, authenticated;

grant select on table public.listing_bedrooms to anon, authenticated;
grant insert, update, delete on table public.listing_bedrooms to authenticated;
grant select on table public.listing_blocked_dates to anon, authenticated;
grant insert, update, delete on table public.listing_blocked_dates to authenticated;

grant all on table public.listing_bedrooms to service_role;
grant all on table public.listing_blocked_dates to service_role;

alter table public.listing_bedrooms enable row level security;
alter table public.listing_bedrooms force row level security;
alter table public.listing_blocked_dates enable row level security;
alter table public.listing_blocked_dates force row level security;

drop policy if exists listing_bedrooms_public_select on public.listing_bedrooms;
create policy listing_bedrooms_public_select
  on public.listing_bedrooms
  for select
  to anon, authenticated
  using ((select private.listing_is_public(listing_id)));

drop policy if exists listing_bedrooms_owner_all on public.listing_bedrooms;
create policy listing_bedrooms_owner_all
  on public.listing_bedrooms
  for all
  to authenticated
  using ((select private.owns_listing(listing_id)))
  with check ((select private.owns_listing(listing_id)));

drop policy if exists listing_bedrooms_admin_all on public.listing_bedrooms;
create policy listing_bedrooms_admin_all
  on public.listing_bedrooms
  for all
  to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

drop policy if exists listing_blocked_dates_public_select on public.listing_blocked_dates;
create policy listing_blocked_dates_public_select
  on public.listing_blocked_dates
  for select
  to anon, authenticated
  using ((select private.listing_is_public(listing_id)));

drop policy if exists listing_blocked_dates_owner_all on public.listing_blocked_dates;
create policy listing_blocked_dates_owner_all
  on public.listing_blocked_dates
  for all
  to authenticated
  using ((select private.owns_listing(listing_id)))
  with check ((select private.owns_listing(listing_id)));

drop policy if exists listing_blocked_dates_admin_all on public.listing_blocked_dates;
create policy listing_blocked_dates_admin_all
  on public.listing_blocked_dates
  for all
  to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

-- Append-only so create or replace view keeps the existing column order.
create or replace view public.listings_public
with (security_invoker = true) as
select
  id,
  owner_id,
  location_id,
  slug,
  title,
  description,
  property_type,
  bedrooms,
  bathrooms,
  max_occupants,
  pets_allowed,
  pet_policy,
  monthly_rent_cents,
  min_stay_months,
  max_stay_months,
  amenities,
  house_rules,
  approx_lat,
  approx_lng,
  management,
  status,
  is_demo,
  listing_fee_status,
  reviewed_by,
  reviewed_at,
  rejection_reason,
  created_at,
  updated_at,
  square_feet,
  space_description,
  smoking_allowed,
  calendar_updated_at,
  good_for
from public.listings;
