-- FurnishedKeys initial schema.
-- Markets live in public.locations (seeded below). Do not hard-code a city in policies or functions.
-- Address strings are not part of the public catalog: anon/authenticated have no SELECT
-- on listings.address_private. Owners and admins read it through public.listing_address().
-- Listing photos live in the private Storage bucket listing-photos. See docs/data-model.md.

create schema if not exists private;

revoke all on schema private from public;
grant usage on schema private to anon, authenticated, service_role;

alter default privileges in schema private revoke execute on functions from public;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

do $$ begin
  create type public.user_role as enum ('renter', 'owner', 'manager', 'admin');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.property_type as enum ('adu', 'apartment', 'room', 'house', 'other');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.listing_management as enum ('self_managed', 'fk_managed');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.listing_status as enum (
    'draft', 'pending_review', 'approved', 'rejected', 'archived'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.listing_fee_status as enum ('unpaid', 'paid', 'waived');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.fee_kind as enum ('utilities', 'deposit', 'cleaning', 'pet', 'other');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.fee_frequency as enum ('one_time', 'monthly');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.inquiry_status as enum ('new', 'responded', 'closed');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.furnished_level as enum ('yes', 'partly', 'no');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.owner_lead_status as enum ('new', 'contacted', 'closed');
exception when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.locations (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  region text not null,
  state text not null,
  country text not null,
  active boolean not null default true,
  sort integer not null default 0,
  constraint locations_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint locations_state_format check (state ~ '^[A-Z]{2}$'),
  constraint locations_country_format check (country ~ '^[A-Z]{2}$'),
  constraint locations_name_length check (char_length(name) between 1 and 120),
  constraint locations_region_length check (char_length(region) between 1 and 120)
);

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  email text,
  phone text,
  role public.user_role not null default 'renter',
  company_name text,
  created_at timestamptz not null default pg_catalog.now(),
  constraint profiles_full_name_length check (
    full_name is null or char_length(full_name) between 1 and 200
  ),
  constraint profiles_email_format check (
    email is null or email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
  ),
  constraint profiles_phone_length check (
    phone is null or char_length(phone) between 1 and 40
  ),
  constraint profiles_company_name_length check (
    company_name is null or char_length(company_name) between 1 and 200
  )
);

create unique index if not exists profiles_email_key
  on public.profiles (email)
  where email is not null;

create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete restrict,
  location_id uuid not null references public.locations (id) on delete restrict,
  slug text not null unique,
  title text not null,
  description text,
  property_type public.property_type not null,
  bedrooms integer not null,
  bathrooms numeric(3, 1) not null,
  max_occupants integer not null,
  pets_allowed boolean not null default false,
  pet_policy text,
  monthly_rent_cents integer not null,
  min_stay_months integer not null default 1,
  max_stay_months integer,
  amenities text[] not null default '{}',
  house_rules text,
  approx_lat numeric(7, 3),
  approx_lng numeric(7, 3),
  address_private text,
  management public.listing_management not null default 'self_managed',
  status public.listing_status not null default 'draft',
  is_demo boolean not null default false,
  listing_fee_status public.listing_fee_status not null default 'unpaid',
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  rejection_reason text,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  constraint listings_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint listings_title_length check (char_length(title) between 1 and 140),
  constraint listings_description_length check (
    description is null or char_length(description) between 1 and 8000
  ),
  constraint listings_bedrooms_range check (bedrooms between 0 and 30),
  constraint listings_bathrooms_range check (bathrooms between 0 and 30),
  constraint listings_max_occupants_range check (max_occupants between 1 and 50),
  constraint listings_pet_policy_length check (
    pet_policy is null or char_length(pet_policy) between 1 and 2000
  ),
  constraint listings_rent_nonnegative check (
    monthly_rent_cents between 0 and 100000000
  ),
  constraint listings_min_stay check (min_stay_months >= 1),
  constraint listings_max_stay check (
    max_stay_months is null or max_stay_months >= min_stay_months
  ),
  constraint listings_house_rules_length check (
    house_rules is null or char_length(house_rules) between 1 and 8000
  ),
  constraint listings_approx_pair check (
    (approx_lat is null and approx_lng is null)
    or (approx_lat is not null and approx_lng is not null)
  ),
  constraint listings_approx_lat_range check (
    approx_lat is null or approx_lat between -90 and 90
  ),
  constraint listings_approx_lng_range check (
    approx_lng is null or approx_lng between -180 and 180
  ),
  constraint listings_address_length check (
    address_private is null or char_length(address_private) between 1 and 500
  ),
  constraint listings_rejection_length check (
    rejection_reason is null or char_length(rejection_reason) between 1 and 2000
  ),
  constraint listings_approved_complete check (
    status <> 'approved'
    or (
      description is not null
      and monthly_rent_cents > 0
      and listing_fee_status in ('paid', 'waived')
    )
  )
);

create index if not exists listings_owner_id_idx on public.listings (owner_id);
create index if not exists listings_location_id_idx on public.listings (location_id);
create index if not exists listings_status_idx on public.listings (status);
create index if not exists listings_approved_location_idx
  on public.listings (location_id)
  where status = 'approved';

create table if not exists public.listing_fees (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  kind public.fee_kind not null,
  label text not null,
  amount_cents integer not null,
  frequency public.fee_frequency not null,
  refundable boolean not null default false,
  constraint listing_fees_label_length check (char_length(label) between 1 and 120),
  constraint listing_fees_amount_nonnegative check (amount_cents between 0 and 100000000)
);

create index if not exists listing_fees_listing_id_idx on public.listing_fees (listing_id);

create table if not exists public.listing_photos (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  storage_path text not null unique,
  caption text,
  sort integer not null default 0,
  constraint listing_photos_path_prefix check (
    storage_path like listing_id::text || '/%'
    and position('..' in storage_path) = 0
    and char_length(storage_path) between 3 and 500
  ),
  constraint listing_photos_caption_length check (
    caption is null or char_length(caption) between 1 and 300
  ),
  constraint listing_photos_sort_nonnegative check (sort >= 0)
);

create index if not exists listing_photos_listing_sort_idx
  on public.listing_photos (listing_id, sort);

create table if not exists public.availability_windows (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  available_from date not null,
  available_to date,
  last_confirmed_at timestamptz,
  confirmed_by uuid references public.profiles (id) on delete set null,
  constraint availability_windows_range check (
    available_to is null or available_to >= available_from
  )
);

create index if not exists availability_windows_listing_id_idx
  on public.availability_windows (listing_id, available_from);

create table if not exists public.inquiries (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  renter_id uuid references public.profiles (id) on delete set null,
  name text not null,
  email text not null,
  phone text,
  move_in date not null,
  move_out date,
  occupants integer not null default 1,
  pets text,
  message text not null,
  status public.inquiry_status not null default 'new',
  assigned_to uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default pg_catalog.now(),
  constraint inquiries_name_length check (char_length(name) between 1 and 200),
  constraint inquiries_email_format check (
    email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
  ),
  constraint inquiries_phone_length check (
    phone is null or char_length(phone) between 1 and 40
  ),
  constraint inquiries_dates check (move_out is null or move_out >= move_in),
  constraint inquiries_occupants_range check (occupants between 1 and 20),
  constraint inquiries_pets_length check (
    pets is null or char_length(pets) between 1 and 500
  ),
  constraint inquiries_message_length check (char_length(message) between 1 and 8000)
);

create index if not exists inquiries_listing_id_idx on public.inquiries (listing_id);
create index if not exists inquiries_renter_id_idx on public.inquiries (renter_id);
create index if not exists inquiries_assigned_to_idx on public.inquiries (assigned_to);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  inquiry_id uuid not null references public.inquiries (id) on delete cascade,
  sender_id uuid references public.profiles (id) on delete set null,
  body text not null,
  created_at timestamptz not null default pg_catalog.now(),
  constraint messages_body_length check (char_length(body) between 1 and 8000)
);

create index if not exists messages_inquiry_created_idx
  on public.messages (inquiry_id, created_at);

create table if not exists public.owner_leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text,
  property_address text,
  location_id uuid references public.locations (id) on delete set null,
  property_type public.property_type,
  furnished public.furnished_level,
  current_use text,
  available_from date,
  notes text,
  source text not null default 'web',
  status public.owner_lead_status not null default 'new',
  assigned_to uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default pg_catalog.now(),
  constraint owner_leads_name_length check (char_length(name) between 1 and 200),
  constraint owner_leads_email_format check (
    email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
  ),
  constraint owner_leads_phone_length check (
    phone is null or char_length(phone) between 1 and 40
  ),
  constraint owner_leads_address_length check (
    property_address is null or char_length(property_address) between 1 and 500
  ),
  constraint owner_leads_current_use_length check (
    current_use is null or char_length(current_use) between 1 and 200
  ),
  constraint owner_leads_notes_length check (
    notes is null or char_length(notes) between 1 and 8000
  ),
  constraint owner_leads_source_format check (source ~ '^[a-z0-9_-]{1,40}$')
);

create index if not exists owner_leads_location_id_idx on public.owner_leads (location_id);
create index if not exists owner_leads_assigned_to_idx on public.owner_leads (assigned_to);
create index if not exists owner_leads_status_created_idx
  on public.owner_leads (status, created_at);

create index if not exists locations_active_sort_idx on public.locations (active, sort);

-- ---------------------------------------------------------------------------
-- Helpers. security definer functions stay in private so the Data API cannot call them.
-- Authorization reads profiles.role. Never trust auth.jwt() user_metadata.
-- ---------------------------------------------------------------------------

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'admin'
  );
$$;

create or replace function private.owns_listing(target_listing uuid)
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
      and owner_id = (select auth.uid())
  );
$$;

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

create or replace function private.can_read_inquiry(target_inquiry uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.inquiries as inquiry
    where inquiry.id = target_inquiry
      and (
        inquiry.renter_id = (select auth.uid())
        or inquiry.assigned_to = (select auth.uid())
        or private.owns_listing(inquiry.listing_id)
        or (select private.is_admin())
      )
  );
$$;

create or replace function private.is_assignable_staff(target uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = target
      and role in ('manager', 'admin')
  );
$$;

create or replace function private.uuid_or_null(value text)
returns uuid
language sql
immutable
set search_path = ''
as $$
  select case
    when value ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then value::uuid
    else null
  end;
$$;

-- True for migrations, seed, the SQL editor, and service_role. Invoker so current_user
-- is the caller. Do not mark this security definer: that would make current_user postgres.
create or replace function private.listing_guard_bypass()
returns boolean
language plpgsql
stable
set search_path = ''
as $$
begin
  if coalesce(auth.role(), '') = 'service_role' then
    return true;
  end if;

  if (select private.is_admin()) then
    return true;
  end if;

  if (select auth.uid()) is null
    and coalesce(auth.role(), '') not in ('anon', 'authenticated')
    and current_user in ('postgres', 'supabase_admin', 'supabase_auth_admin')
  then
    return true;
  end if;

  return false;
end;
$$;

create or replace function private.listing_address(target_listing uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select listings.address_private
  from public.listings as listings
  where listings.id = target_listing
    and (
      listings.owner_id = (select auth.uid())
      or (select private.is_admin())
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
    join public.listings as listing on listing.id = photo.listing_id
    where photo.storage_path = object_name
      and listing.status = 'approved'
  );
end;
$$;

create or replace function private.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := pg_catalog.now();
  return new;
end;
$$;

create or replace function private.enforce_listing_guards()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if private.listing_guard_bypass() then
    if tg_op = 'INSERT' and new.status in ('approved', 'rejected') then
      new.reviewed_at := coalesce(new.reviewed_at, pg_catalog.now());
      new.reviewed_by := coalesce(new.reviewed_by, (select auth.uid()));
    elsif tg_op = 'UPDATE'
      and new.status is distinct from old.status
      and new.status in ('approved', 'rejected')
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
    if new.status in ('approved', 'rejected') then
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
    then
      raise exception 'Only an admin can set review fields'
        using errcode = '42501';
    end if;
  else
    if new.owner_id is distinct from old.owner_id then
      raise exception 'Only an admin can reassign a listing'
        using errcode = '42501';
    end if;
    if new.status is distinct from old.status and new.status in ('approved', 'rejected') then
      raise exception 'Only an admin can approve or reject a listing'
        using errcode = '42501';
    end if;
    if new.is_demo is distinct from old.is_demo then
      raise exception 'Only an admin can change is_demo'
        using errcode = '42501';
    end if;
    if new.listing_fee_status is distinct from old.listing_fee_status then
      raise exception 'Only an admin can change listing fee status'
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

create or replace function private.enforce_profile_role()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if private.listing_guard_bypass() then
    return new;
  end if;

  if tg_op = 'INSERT' and new.role is distinct from 'renter' then
    raise exception 'New profiles start as renter'
      using errcode = '42501';
  end if;

  if tg_op = 'UPDATE' and new.role is distinct from old.role then
    raise exception 'Only an admin can change profile role'
      using errcode = '42501';
  end if;

  if tg_op = 'UPDATE' and new.id is distinct from old.id then
    raise exception 'Profile id is immutable'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

create or replace function private.enforce_inquiry_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if private.listing_guard_bypass() then
    return new;
  end if;

  if new.id is distinct from old.id
    or new.listing_id is distinct from old.listing_id
    or new.renter_id is distinct from old.renter_id
    or new.name is distinct from old.name
    or new.email is distinct from old.email
    or new.phone is distinct from old.phone
    or new.move_in is distinct from old.move_in
    or new.move_out is distinct from old.move_out
    or new.occupants is distinct from old.occupants
    or new.pets is distinct from old.pets
    or new.message is distinct from old.message
    or new.created_at is distinct from old.created_at
  then
    raise exception 'Only an admin can edit inquiry details'
      using errcode = '42501';
  end if;

  if new.assigned_to is not null and new.assigned_to is distinct from old.assigned_to then
    if not private.is_assignable_staff(new.assigned_to) then
      raise exception 'Inquiries can only be assigned to a manager or admin'
        using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;

-- Signup copies display fields only. Role is always renter; user_metadata is not an ACL.
create or replace function private.enforce_owner_lead_assignment()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.assigned_to is not null and not private.is_assignable_staff(new.assigned_to) then
    raise exception 'Owner leads can only be assigned to a manager or admin'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    'renter'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create or replace function public.listing_address(target_listing uuid)
returns text
language sql
stable
security invoker
set search_path = ''
as $$
  select private.listing_address(target_listing);
$$;

revoke all on function private.is_admin() from public;
revoke all on function private.owns_listing(uuid) from public;
revoke all on function private.listing_is_public(uuid) from public;
revoke all on function private.can_read_inquiry(uuid) from public;
revoke all on function private.is_assignable_staff(uuid) from public;
revoke all on function private.uuid_or_null(text) from public;
revoke all on function private.listing_guard_bypass() from public;
revoke all on function private.listing_address(uuid) from public;
revoke all on function private.storage_object_readable(text) from public;
revoke all on function private.touch_updated_at() from public;
revoke all on function private.enforce_listing_guards() from public;
revoke all on function private.enforce_profile_role() from public;
revoke all on function private.enforce_inquiry_update() from public;
revoke all on function private.enforce_owner_lead_assignment() from public;
revoke all on function private.handle_new_user() from public;
revoke all on function public.listing_address(uuid) from public;

grant execute on function private.is_admin() to anon, authenticated, service_role;
grant execute on function private.owns_listing(uuid) to anon, authenticated, service_role;
grant execute on function private.listing_is_public(uuid) to anon, authenticated, service_role;
grant execute on function private.can_read_inquiry(uuid) to authenticated, service_role;
grant execute on function private.is_assignable_staff(uuid) to anon, authenticated, service_role;
grant execute on function private.uuid_or_null(text) to anon, authenticated, service_role;
grant execute on function private.listing_guard_bypass() to anon, authenticated, service_role;
grant execute on function private.storage_object_readable(text) to anon, authenticated, service_role;
grant execute on function private.touch_updated_at() to anon, authenticated, service_role;
grant execute on function private.enforce_listing_guards() to anon, authenticated, service_role;
grant execute on function private.enforce_profile_role() to anon, authenticated, service_role;
grant execute on function private.enforce_inquiry_update() to anon, authenticated, service_role;
grant execute on function private.enforce_owner_lead_assignment() to anon, authenticated, service_role;
grant execute on function private.listing_address(uuid) to authenticated, service_role;
grant execute on function public.listing_address(uuid) to authenticated, service_role;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'supabase_auth_admin') then
    grant execute on function private.handle_new_user() to supabase_auth_admin;
  end if;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function private.handle_new_user();

drop trigger if exists profiles_enforce_role on public.profiles;
create trigger profiles_enforce_role
  before insert or update on public.profiles
  for each row
  execute function private.enforce_profile_role();

drop trigger if exists listings_enforce_guards on public.listings;
create trigger listings_enforce_guards
  before insert or update on public.listings
  for each row
  execute function private.enforce_listing_guards();

drop trigger if exists listings_touch_updated_at on public.listings;
create trigger listings_touch_updated_at
  before insert or update on public.listings
  for each row
  execute function private.touch_updated_at();

drop trigger if exists inquiries_enforce_update on public.inquiries;
create trigger inquiries_enforce_update
  before update on public.inquiries
  for each row
  execute function private.enforce_inquiry_update();

drop trigger if exists owner_leads_enforce_assignment on public.owner_leads;
create trigger owner_leads_enforce_assignment
  before insert or update on public.owner_leads
  for each row
  execute function private.enforce_owner_lead_assignment();

-- ---------------------------------------------------------------------------
-- Grants. Table-level select on listings is revoked so address_private cannot
-- leak through select *. Clients list public columns or read listings_public.
-- ---------------------------------------------------------------------------

grant usage on schema public to anon, authenticated, service_role;

revoke all on table public.locations from public, anon, authenticated;
revoke all on table public.profiles from public, anon, authenticated;
revoke all on table public.listings from public, anon, authenticated;
revoke all on table public.listing_fees from public, anon, authenticated;
revoke all on table public.listing_photos from public, anon, authenticated;
revoke all on table public.availability_windows from public, anon, authenticated;
revoke all on table public.inquiries from public, anon, authenticated;
revoke all on table public.messages from public, anon, authenticated;
revoke all on table public.owner_leads from public, anon, authenticated;

grant select on table public.locations to anon, authenticated;
grant insert, update, delete on table public.locations to authenticated;

grant select, insert, update, delete on table public.profiles to authenticated;

grant select (
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
  updated_at
) on table public.listings to anon, authenticated;

grant insert, update, delete on table public.listings to authenticated;

grant select on table public.listing_fees to anon, authenticated;
grant insert, update, delete on table public.listing_fees to authenticated;

grant select on table public.listing_photos to anon, authenticated;
grant insert, update, delete on table public.listing_photos to authenticated;

grant select on table public.availability_windows to anon, authenticated;
grant insert, update, delete on table public.availability_windows to authenticated;

grant insert on table public.inquiries to anon, authenticated;
grant select, update, delete on table public.inquiries to authenticated;

grant select, insert, delete on table public.messages to authenticated;

grant insert on table public.owner_leads to anon, authenticated;
grant select, update, delete on table public.owner_leads to authenticated;

grant all on table public.locations to service_role;
grant all on table public.profiles to service_role;
grant all on table public.listings to service_role;
grant all on table public.listing_fees to service_role;
grant all on table public.listing_photos to service_role;
grant all on table public.availability_windows to service_role;
grant all on table public.inquiries to service_role;
grant all on table public.messages to service_role;
grant all on table public.owner_leads to service_role;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.locations enable row level security;
alter table public.profiles enable row level security;
alter table public.listings enable row level security;
alter table public.listing_fees enable row level security;
alter table public.listing_photos enable row level security;
alter table public.availability_windows enable row level security;
alter table public.inquiries enable row level security;
alter table public.messages enable row level security;
alter table public.owner_leads enable row level security;

alter table public.locations force row level security;
alter table public.profiles force row level security;
alter table public.listings force row level security;
alter table public.listing_fees force row level security;
alter table public.listing_photos force row level security;
alter table public.availability_windows force row level security;
alter table public.inquiries force row level security;
alter table public.messages force row level security;
alter table public.owner_leads force row level security;

drop policy if exists locations_select on public.locations;
create policy locations_select
  on public.locations
  for select
  to anon, authenticated
  using (active or (select private.is_admin()));

drop policy if exists locations_admin_write on public.locations;
create policy locations_admin_write
  on public.locations
  for all
  to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

drop policy if exists profiles_select on public.profiles;
create policy profiles_select
  on public.profiles
  for select
  to authenticated
  using (id = (select auth.uid()) or (select private.is_admin()));

drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert
  on public.profiles
  for insert
  to authenticated
  with check (id = (select auth.uid()) and role = 'renter');

drop policy if exists profiles_update on public.profiles;
create policy profiles_update
  on public.profiles
  for update
  to authenticated
  using (id = (select auth.uid()) or (select private.is_admin()))
  with check (id = (select auth.uid()) or (select private.is_admin()));

drop policy if exists profiles_delete on public.profiles;
create policy profiles_delete
  on public.profiles
  for delete
  to authenticated
  using ((select private.is_admin()));

drop policy if exists listings_public_select on public.listings;
create policy listings_public_select
  on public.listings
  for select
  to anon, authenticated
  using (status = 'approved');

drop policy if exists listings_owner_all on public.listings;
create policy listings_owner_all
  on public.listings
  for all
  to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

drop policy if exists listings_admin_all on public.listings;
create policy listings_admin_all
  on public.listings
  for all
  to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

drop policy if exists listing_fees_public_select on public.listing_fees;
create policy listing_fees_public_select
  on public.listing_fees
  for select
  to anon, authenticated
  using ((select private.listing_is_public(listing_id)));

drop policy if exists listing_fees_owner_all on public.listing_fees;
create policy listing_fees_owner_all
  on public.listing_fees
  for all
  to authenticated
  using ((select private.owns_listing(listing_id)))
  with check ((select private.owns_listing(listing_id)));

drop policy if exists listing_fees_admin_all on public.listing_fees;
create policy listing_fees_admin_all
  on public.listing_fees
  for all
  to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

drop policy if exists listing_photos_public_select on public.listing_photos;
create policy listing_photos_public_select
  on public.listing_photos
  for select
  to anon, authenticated
  using ((select private.listing_is_public(listing_id)));

drop policy if exists listing_photos_owner_all on public.listing_photos;
create policy listing_photos_owner_all
  on public.listing_photos
  for all
  to authenticated
  using ((select private.owns_listing(listing_id)))
  with check ((select private.owns_listing(listing_id)));

drop policy if exists listing_photos_admin_all on public.listing_photos;
create policy listing_photos_admin_all
  on public.listing_photos
  for all
  to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

drop policy if exists availability_public_select on public.availability_windows;
create policy availability_public_select
  on public.availability_windows
  for select
  to anon, authenticated
  using ((select private.listing_is_public(listing_id)));

drop policy if exists availability_owner_all on public.availability_windows;
create policy availability_owner_all
  on public.availability_windows
  for all
  to authenticated
  using ((select private.owns_listing(listing_id)))
  with check ((select private.owns_listing(listing_id)));

drop policy if exists availability_admin_all on public.availability_windows;
create policy availability_admin_all
  on public.availability_windows
  for all
  to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

drop policy if exists inquiries_insert on public.inquiries;
create policy inquiries_insert
  on public.inquiries
  for insert
  to anon, authenticated
  with check (
    status = 'new'
    and assigned_to is null
    and (renter_id is null or renter_id = (select auth.uid()))
  );

drop policy if exists inquiries_select on public.inquiries;
create policy inquiries_select
  on public.inquiries
  for select
  to authenticated
  using (
    renter_id = (select auth.uid())
    or assigned_to = (select auth.uid())
    or (select private.owns_listing(listing_id))
    or (select private.is_admin())
  );

drop policy if exists inquiries_update on public.inquiries;
create policy inquiries_update
  on public.inquiries
  for update
  to authenticated
  using (
    (select private.owns_listing(listing_id))
    or assigned_to = (select auth.uid())
    or (select private.is_admin())
  )
  with check (
    (select private.owns_listing(listing_id))
    or assigned_to = (select auth.uid())
    or (select private.is_admin())
  );

drop policy if exists inquiries_delete on public.inquiries;
create policy inquiries_delete
  on public.inquiries
  for delete
  to authenticated
  using ((select private.is_admin()));

drop policy if exists messages_select on public.messages;
create policy messages_select
  on public.messages
  for select
  to authenticated
  using ((select private.can_read_inquiry(inquiry_id)));

drop policy if exists messages_insert on public.messages;
create policy messages_insert
  on public.messages
  for insert
  to authenticated
  with check (
    sender_id = (select auth.uid())
    and (select private.can_read_inquiry(inquiry_id))
  );

drop policy if exists messages_delete on public.messages;
create policy messages_delete
  on public.messages
  for delete
  to authenticated
  using ((select private.is_admin()));

drop policy if exists owner_leads_insert on public.owner_leads;
create policy owner_leads_insert
  on public.owner_leads
  for insert
  to anon, authenticated
  with check (status = 'new' and assigned_to is null);

-- is_assignable_staff is security definer so a manager can see the inbox
-- without a profiles SELECT policy that would expose other people.
drop policy if exists owner_leads_select on public.owner_leads;
create policy owner_leads_select
  on public.owner_leads
  for select
  to authenticated
  using (
    (select private.is_admin())
    or assigned_to = (select auth.uid())
    or (select private.is_assignable_staff((select auth.uid())))
  );

drop policy if exists owner_leads_update on public.owner_leads;
create policy owner_leads_update
  on public.owner_leads
  for update
  to authenticated
  using (
    (select private.is_admin())
    or assigned_to = (select auth.uid())
    or (select private.is_assignable_staff((select auth.uid())))
  )
  with check (
    (select private.is_admin())
    or assigned_to = (select auth.uid())
    or (select private.is_assignable_staff((select auth.uid())))
  );

drop policy if exists owner_leads_delete on public.owner_leads;
create policy owner_leads_delete
  on public.owner_leads
  for delete
  to authenticated
  using ((select private.is_admin()));

-- ---------------------------------------------------------------------------
-- Public catalog view. security_invoker so listings RLS still applies.
-- ---------------------------------------------------------------------------

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
  updated_at
from public.listings;

revoke all on table public.listings_public from public, anon, authenticated;
grant select on table public.listings_public to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Launch markets. Ids match the front-end mirror in lib/locations.ts.
-- Bend's region is the county name so launch copy can read the row.
-- ---------------------------------------------------------------------------

insert into public.locations (id, slug, name, region, state, country, active, sort)
values
  (
    'c3a1e0b2-4d5f-4a6b-8c7d-111111111101',
    'bend',
    'Bend',
    'Deschutes County',
    'OR',
    'US',
    true,
    1
  ),
  (
    'c3a1e0b2-4d5f-4a6b-8c7d-111111111102',
    'deschutes-county',
    'Deschutes County',
    'Central Oregon',
    'OR',
    'US',
    true,
    2
  )
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------------
-- Storage. Private bucket. Approved photos are readable because a SELECT
-- policy matches listing_photos.storage_path. getPublicUrl does not work.
-- Clients create a signed URL (or download) with the anon key; draft objects
-- fail that policy. Owners upload under {listing_id}/{file}.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('listing-photos', 'listing-photos', false)
on conflict (id) do update
set public = false,
    name = excluded.name;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'storage'
      and table_name = 'buckets'
      and column_name = 'file_size_limit'
  ) then
    update storage.buckets
    set file_size_limit = 10485760
    where id = 'listing-photos';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'storage'
      and table_name = 'buckets'
      and column_name = 'allowed_mime_types'
  ) then
    update storage.buckets
    set allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
    where id = 'listing-photos';
  end if;
end $$;

alter table storage.objects enable row level security;

drop policy if exists listing_photos_read on storage.objects;
create policy listing_photos_read
  on storage.objects
  for select
  to anon, authenticated
  using (
    bucket_id = 'listing-photos'
    and (select private.storage_object_readable(name))
  );

drop policy if exists listing_photos_insert on storage.objects;
create policy listing_photos_insert
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'listing-photos'
    and position('..' in name) = 0
    and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp', 'avif')
    and (
      (select private.is_admin())
      or private.owns_listing(private.uuid_or_null((storage.foldername(name))[1]))
    )
  );

drop policy if exists listing_photos_update on storage.objects;
create policy listing_photos_update
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'listing-photos'
    and (
      (select private.is_admin())
      or private.owns_listing(private.uuid_or_null((storage.foldername(name))[1]))
    )
  )
  with check (
    bucket_id = 'listing-photos'
    and position('..' in name) = 0
    and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp', 'avif')
    and (
      (select private.is_admin())
      or private.owns_listing(private.uuid_or_null((storage.foldername(name))[1]))
    )
  );

drop policy if exists listing_photos_delete on storage.objects;
create policy listing_photos_delete
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'listing-photos'
    and (
      (select private.is_admin())
      or private.owns_listing(private.uuid_or_null((storage.foldername(name))[1]))
    )
  );

comment on table public.locations is
  'Config-driven markets. Application code should read this table (or its mirror) instead of hard-coding a city.';
comment on column public.listings.address_private is
  'Street address. Hidden from anon and authenticated SELECT. Read with public.listing_address().';
comment on column public.listings.approx_lat is
  'Public pin, numeric(7,3), about 111 meters. Not a rooftop coordinate.';
comment on column public.listings.approx_lng is
  'Public pin, numeric(7,3), about 111 meters. Not a rooftop coordinate.';
comment on column public.listings.is_demo is
  'Sample inventory. Only an admin (or service_role / SQL editor) can set this.';
comment on column public.listings.listing_fee_status is
  'Placeholder for the future $199 listing fee. Owners cannot change it. No payment provider is wired.';
comment on column public.listings.status is
  'Owners may use draft, pending_review, and archived. approved and rejected are admin-only.';
comment on function public.listing_address(uuid) is
  'Returns address_private when the caller owns the listing or is an admin. Otherwise null.';
comment on view public.listings_public is
  'Catalog projection of listings without address_private. Honors listings RLS.';
