-- Local demo inventory for `supabase db reset`. Not a production import.
-- Three approved listings, titles prefixed "Demo:", is_demo = true.
-- The market is the locations row with slug bend (seeded by the init migration).
-- The demo owner is not a login.

do $seed_user$
declare
  demo_id uuid := '00000000-0000-4000-8000-0000000000d1';
  colnames text[] := array[
    'instance_id',
    'id',
    'aud',
    'role',
    'email',
    'encrypted_password',
    'email_confirmed_at',
    'raw_app_meta_data',
    'raw_user_meta_data',
    'created_at',
    'updated_at',
    'confirmation_token',
    'recovery_token',
    'email_change',
    'email_change_token_new',
    'email_change_token_current',
    'email_change_confirm_status',
    'phone_change',
    'phone_change_token',
    'reauthentication_token',
    'is_sso_user',
    'is_anonymous'
  ];
  colvals text[] := array[
    quote_literal('00000000-0000-0000-0000-000000000000'),
    quote_literal(demo_id::text),
    quote_literal('authenticated'),
    quote_literal('authenticated'),
    quote_literal('demo-owner@furnishedkeys.example'),
    quote_literal('not-a-login'),
    'pg_catalog.now()',
    quote_literal('{"provider":"email","providers":["email"]}') || '::jsonb',
    quote_literal('{"full_name":"Demo Owner"}') || '::jsonb',
    'pg_catalog.now()',
    'pg_catalog.now()',
    quote_literal(''),
    quote_literal(''),
    quote_literal(''),
    quote_literal(''),
    quote_literal(''),
    '0',
    quote_literal(''),
    quote_literal(''),
    quote_literal(''),
    'false',
    'false'
  ];
  sql_cols text := '';
  sql_vals text := '';
  i integer;
begin
  if to_regclass('auth.users') is null then
    raise exception 'auth.users is missing; run this seed on Supabase';
  end if;

  for i in 1..array_length(colnames, 1) loop
    if exists (
      select 1
      from information_schema.columns
      where table_schema = 'auth'
        and table_name = 'users'
        and column_name = colnames[i]
        and is_generated = 'NEVER'
        and coalesce(identity_generation, '') = ''
    ) then
      sql_cols := sql_cols || quote_ident(colnames[i]) || ', ';
      sql_vals := sql_vals || colvals[i] || ', ';
    end if;
  end loop;

  if sql_cols = '' then
    raise exception 'auth.users has none of the expected columns';
  end if;

  execute format(
    'insert into auth.users (%s) values (%s) on conflict (id) do nothing',
    left(sql_cols, length(sql_cols) - 2),
    left(sql_vals, length(sql_vals) - 2)
  );
end
$seed_user$;

do $seed_identity$
declare
  demo_id uuid := '00000000-0000-4000-8000-0000000000d1';
  identity_id uuid := '00000000-0000-4000-8000-0000000000d2';
  colnames text[] := array[
    'id',
    'user_id',
    'identity_data',
    'provider',
    'provider_id',
    'last_sign_in_at',
    'created_at',
    'updated_at'
  ];
  colvals text[] := array[
    quote_literal(identity_id::text),
    quote_literal(demo_id::text),
    format(
      'jsonb_build_object(%L, %L, %L, %L, %L, true)',
      'sub',
      demo_id::text,
      'email',
      'demo-owner@furnishedkeys.example',
      'email_verified'
    ),
    quote_literal('email'),
    quote_literal(demo_id::text),
    'pg_catalog.now()',
    'pg_catalog.now()',
    'pg_catalog.now()'
  ];
  sql_cols text := '';
  sql_vals text := '';
  i integer;
begin
  if to_regclass('auth.identities') is null then
    return;
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'auth'
      and table_name = 'identities'
      and column_name = 'provider_id'
  ) then
    return;
  end if;

  for i in 1..array_length(colnames, 1) loop
    if exists (
      select 1
      from information_schema.columns
      where table_schema = 'auth'
        and table_name = 'identities'
        and column_name = colnames[i]
        and is_generated = 'NEVER'
        and coalesce(identity_generation, '') = ''
    ) then
      sql_cols := sql_cols || quote_ident(colnames[i]) || ', ';
      sql_vals := sql_vals || colvals[i] || ', ';
    end if;
  end loop;

  if sql_cols = '' then
    return;
  end if;

  execute format(
    'insert into auth.identities (%s) values (%s) on conflict do nothing',
    left(sql_cols, length(sql_cols) - 2),
    left(sql_vals, length(sql_vals) - 2)
  );
end
$seed_identity$;

insert into public.profiles (id, full_name, email, phone, role, company_name)
values (
  '00000000-0000-4000-8000-0000000000d1',
  'Demo Owner',
  'demo-owner@furnishedkeys.example',
  '555-010-0199',
  'owner',
  'FurnishedKeys Demo'
)
on conflict (id) do update
set
  full_name = excluded.full_name,
  email = excluded.email,
  phone = excluded.phone,
  role = excluded.role,
  company_name = excluded.company_name;

do $$
begin
  if not exists (select 1 from public.locations where slug = 'bend') then
    raise exception 'seed requires a locations row with slug bend';
  end if;
end $$;

insert into public.listings (
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
  address_private,
  management,
  status,
  is_demo,
  listing_fee_status,
  reviewed_at
)
select
  '00000000-0000-4000-8000-0000000000a1',
  '00000000-0000-4000-8000-0000000000d1',
  location.id,
  'demo-northwest-crossing-adu',
  'Demo: Northwest Crossing one-bedroom ADU',
  'Sample listing for the catalog. A furnished one-bedroom ADU with a private entrance. Not a real vacancy.',
  'adu',
  1,
  1.0,
  2,
  false,
  'Pets are not accepted in this sample listing.',
  245000,
  1,
  null,
  array['wifi', 'washer', 'dryer', 'heating', 'dedicated workspace'],
  'No parties. Quiet hours after 10pm. This is sample copy.',
  44.098,
  -121.360,
  '100 Demo Lane',
  'self_managed',
  'approved',
  true,
  'waived',
  timestamptz '2026-10-01 00:00:00+00'
from public.locations as location
where location.slug = 'bend'
on conflict (id) do nothing;

insert into public.listings (
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
  address_private,
  management,
  status,
  is_demo,
  listing_fee_status,
  reviewed_at
)
select
  '00000000-0000-4000-8000-0000000000a2',
  '00000000-0000-4000-8000-0000000000d1',
  location.id,
  'demo-old-mill-apartment',
  'Demo: Old Mill furnished apartment',
  'Sample listing for the catalog. A furnished two-bedroom apartment near the river trail. Not a real vacancy.',
  'apartment',
  2,
  2.0,
  4,
  true,
  'One dog or cat under 40 lb. Sample pet policy only.',
  189500,
  2,
  12,
  array['wifi', 'in-unit laundry', 'dishwasher', 'parking', 'heating'],
  'No smoking. Pets require the pet fee below. This is sample copy.',
  44.045,
  -121.314,
  '200 Demo Street',
  'fk_managed',
  'approved',
  true,
  'waived',
  timestamptz '2026-10-01 00:00:00+00'
from public.locations as location
where location.slug = 'bend'
on conflict (id) do nothing;

insert into public.listings (
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
  address_private,
  management,
  status,
  is_demo,
  listing_fee_status,
  reviewed_at
)
select
  '00000000-0000-4000-8000-0000000000a3',
  '00000000-0000-4000-8000-0000000000d1',
  location.id,
  'demo-river-west-room',
  'Demo: River West private room',
  'Sample listing for the catalog. A furnished private room in a shared house. Not a real vacancy.',
  'room',
  1,
  1.0,
  1,
  false,
  'No pets in this sample listing.',
  95000,
  1,
  3,
  array['wifi', 'shared kitchen', 'heating', 'desk'],
  'Shared kitchen and bath. Overnight guests need a heads-up. This is sample copy.',
  44.056,
  -121.329,
  '300 Demo Court',
  'self_managed',
  'approved',
  true,
  'waived',
  timestamptz '2026-10-01 00:00:00+00'
from public.locations as location
where location.slug = 'bend'
on conflict (id) do nothing;

insert into public.listing_fees (listing_id, kind, label, amount_cents, frequency, refundable)
select listing.id, 'utilities', 'Estimated utilities', 18000, 'monthly', false
from public.listings as listing
where listing.slug = 'demo-northwest-crossing-adu'
  and not exists (
    select 1
    from public.listing_fees as fee
    where fee.listing_id = listing.id
      and fee.kind = 'utilities'
      and fee.label = 'Estimated utilities'
  );

insert into public.listing_fees (listing_id, kind, label, amount_cents, frequency, refundable)
select listing.id, 'deposit', 'Security deposit', 245000, 'one_time', true
from public.listings as listing
where listing.slug = 'demo-northwest-crossing-adu'
  and not exists (
    select 1
    from public.listing_fees as fee
    where fee.listing_id = listing.id
      and fee.kind = 'deposit'
      and fee.label = 'Security deposit'
  );

insert into public.listing_fees (listing_id, kind, label, amount_cents, frequency, refundable)
select listing.id, 'cleaning', 'Departure cleaning', 15000, 'one_time', false
from public.listings as listing
where listing.slug = 'demo-northwest-crossing-adu'
  and not exists (
    select 1
    from public.listing_fees as fee
    where fee.listing_id = listing.id
      and fee.kind = 'cleaning'
      and fee.label = 'Departure cleaning'
  );

insert into public.listing_fees (listing_id, kind, label, amount_cents, frequency, refundable)
select listing.id, 'utilities', 'Utilities cap', 15000, 'monthly', false
from public.listings as listing
where listing.slug = 'demo-old-mill-apartment'
  and not exists (
    select 1
    from public.listing_fees as fee
    where fee.listing_id = listing.id
      and fee.kind = 'utilities'
      and fee.label = 'Utilities cap'
  );

insert into public.listing_fees (listing_id, kind, label, amount_cents, frequency, refundable)
select listing.id, 'deposit', 'Security deposit', 189500, 'one_time', true
from public.listings as listing
where listing.slug = 'demo-old-mill-apartment'
  and not exists (
    select 1
    from public.listing_fees as fee
    where fee.listing_id = listing.id
      and fee.kind = 'deposit'
      and fee.label = 'Security deposit'
  );

insert into public.listing_fees (listing_id, kind, label, amount_cents, frequency, refundable)
select listing.id, 'pet', 'Monthly pet fee', 5000, 'monthly', false
from public.listings as listing
where listing.slug = 'demo-old-mill-apartment'
  and not exists (
    select 1
    from public.listing_fees as fee
    where fee.listing_id = listing.id
      and fee.kind = 'pet'
      and fee.label = 'Monthly pet fee'
  );

insert into public.listing_fees (listing_id, kind, label, amount_cents, frequency, refundable)
select listing.id, 'utilities', 'Utilities share', 7500, 'monthly', false
from public.listings as listing
where listing.slug = 'demo-river-west-room'
  and not exists (
    select 1
    from public.listing_fees as fee
    where fee.listing_id = listing.id
      and fee.kind = 'utilities'
      and fee.label = 'Utilities share'
  );

insert into public.listing_fees (listing_id, kind, label, amount_cents, frequency, refundable)
select listing.id, 'deposit', 'Security deposit', 50000, 'one_time', true
from public.listings as listing
where listing.slug = 'demo-river-west-room'
  and not exists (
    select 1
    from public.listing_fees as fee
    where fee.listing_id = listing.id
      and fee.kind = 'deposit'
      and fee.label = 'Security deposit'
  );

insert into public.listing_fees (listing_id, kind, label, amount_cents, frequency, refundable)
select listing.id, 'cleaning', 'Cleaning fee', 7500, 'one_time', false
from public.listings as listing
where listing.slug = 'demo-river-west-room'
  and not exists (
    select 1
    from public.listing_fees as fee
    where fee.listing_id = listing.id
      and fee.kind = 'cleaning'
      and fee.label = 'Cleaning fee'
  );

insert into public.listing_photos (listing_id, storage_path, caption, sort)
select listing.id, listing.id::text || '/cover.webp', 'Demo cover photo', 0
from public.listings as listing
where listing.slug in (
  'demo-northwest-crossing-adu',
  'demo-old-mill-apartment',
  'demo-river-west-room'
)
on conflict (storage_path) do nothing;

insert into public.availability_windows (
  listing_id,
  available_from,
  available_to,
  last_confirmed_at,
  confirmed_by
)
select
  listing.id,
  date '2026-11-01',
  null,
  timestamptz '2026-10-01 00:00:00+00',
  listing.owner_id
from public.listings as listing
where listing.slug = 'demo-northwest-crossing-adu'
  and not exists (
    select 1
    from public.availability_windows as span
    where span.listing_id = listing.id
      and span.available_from = date '2026-11-01'
  );

insert into public.availability_windows (
  listing_id,
  available_from,
  available_to,
  last_confirmed_at,
  confirmed_by
)
select
  listing.id,
  date '2026-12-01',
  date '2027-06-01',
  timestamptz '2026-10-01 00:00:00+00',
  listing.owner_id
from public.listings as listing
where listing.slug = 'demo-old-mill-apartment'
  and not exists (
    select 1
    from public.availability_windows as span
    where span.listing_id = listing.id
      and span.available_from = date '2026-12-01'
  );

insert into public.availability_windows (
  listing_id,
  available_from,
  available_to,
  last_confirmed_at,
  confirmed_by
)
select
  listing.id,
  date '2027-01-15',
  date '2027-04-15',
  timestamptz '2026-10-01 00:00:00+00',
  listing.owner_id
from public.listings as listing
where listing.slug = 'demo-river-west-room'
  and not exists (
    select 1
    from public.availability_windows as span
    where span.listing_id = listing.id
      and span.available_from = date '2027-01-15'
  );
