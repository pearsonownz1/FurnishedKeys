# FurnishedKeys data model

Postgres schema for the Supabase project. The migration is `supabase/migrations/20261011033000_init.sql`. Demo inventory is `supabase/seed.sql` (local `supabase db reset` only). Hand-written TypeScript for the front end is `lib/db/types.ts`.

Markets are rows in `locations`. Policies and functions do not name a city. The launch rows match the front-end mirror in `lib/locations.ts`:

| id | slug | name | region | state | country | active | sort |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `c3a1e0b2-4d5f-4a6b-8c7d-111111111101` | `bend` | Bend | Deschutes County | OR | US | true | 1 |
| `c3a1e0b2-4d5f-4a6b-8c7d-111111111102` | `deschutes-county` | Deschutes County | Central Oregon | OR | US | true | 2 |

Bend’s `region` is the county name so launch copy can be built from the row (`Now in Bend & Deschutes County`). Adding a market is an insert into `locations`, not a code change.

## Tables

Surrogate keys are `uuid`, default `gen_random_uuid()`, except `profiles.id`, which is `auth.users.id`. Money is integer cents. Timestamps are `timestamptz`. `approx_lat` and `approx_lng` are `numeric(7,3)` (about 111 meters), and they are stored as a pair or not at all.

### `locations`

`id`, `slug`, `name`, `region`, `state`, `country`, `active`, `sort`.

Public read of active rows. Admins read and write every row, including inactive markets staged for later.

### `profiles`

`id`, `full_name`, `email`, `phone`, `role`, `company_name`, `created_at`.

`role` is `renter | owner | manager | admin`, default `renter`. A trigger on `auth.users` inserts the profile at signup and always sets `renter`. Display name may be copied from signup metadata. Role is never taken from `user_metadata`.

A second trigger blocks self-service role changes. An admin, `service_role`, or the SQL editor can change `role`. Signing up does not make someone an owner or admin.

Listing access is `listings.owner_id`, not `profiles.role`. A renter may draft a listing they own. `manager` is the consultation inbox (see `owner_leads`). `admin` is global.

### `listings`

`id`, `owner_id`, `location_id`, `slug`, `title`, `description`, `property_type`, `bedrooms`, `bathrooms`, `max_occupants`, `pets_allowed`, `pet_policy`, `monthly_rent_cents`, `min_stay_months`, `max_stay_months`, `amenities`, `house_rules`, `approx_lat`, `approx_lng`, `address_private`, `management`, `status`, `is_demo`, `listing_fee_status`, `reviewed_by`, `reviewed_at`, `rejection_reason`, `created_at`, `updated_at`.

Enums:

- `property_type`: `adu | apartment | room | house | other`
- `management`: `self_managed | fk_managed`
- `status`: `draft | pending_review | approved | rejected | archived` (default `draft`)
- `listing_fee_status`: `unpaid | paid | waived` (default `unpaid`)

`amenities` is `text[]`. `bathrooms` is `numeric(3,1)`.

An approved listing must have a description, rent greater than zero, and `listing_fee_status` of `paid` or `waived`. That last rule is a data check only. Nothing in this schema charges a card.

### `listing_fees`

`id`, `listing_id`, `kind`, `label`, `amount_cents`, `frequency`, `refundable`.

Rent stays on `listings.monthly_rent_cents`. Utilities, deposits, cleaning, pet, and other charges are rows here.

- `kind`: `utilities | deposit | cleaning | pet | other`
- `frequency`: `one_time | monthly`
- `refundable`: boolean, default false

### `listing_photos`

`id`, `listing_id`, `storage_path`, `caption`, `sort`.

`storage_path` is unique and must look like `{listing_id}/{filename}` with no `..`.

### `availability_windows`

`id`, `listing_id`, `available_from`, `available_to`, `last_confirmed_at`, `confirmed_by`.

`available_to` null means open-ended. This is an owner-confirmed range, not a booking calendar.

### `inquiries`

`id`, `listing_id`, `renter_id`, `name`, `email`, `phone`, `move_in`, `move_out`, `occupants`, `pets`, `message`, `status`, `assigned_to`, `created_at`.

`renter_id` is null for a signed-out visitor. `status` is `new | responded | closed`, default `new`. `assigned_to` may point at a `manager` or `admin` profile.

Anonymous and signed-in visitors can insert a row with `status = new`, `assigned_to` null, and `renter_id` null or their own id. They cannot read it back unless they are signed in and `renter_id` is their id. The listing owner, the assignee, and admins can read the thread. Owners and assignees can update `status` and `assigned_to` only. Admins can edit the rest.

### `messages`

`id`, `inquiry_id`, `sender_id`, `body`, `created_at`.

Thread replies. `sender_id` is null only so a later system note can exist. Signed-in participants insert with `sender_id` equal to themselves. Participants do not update messages. Admins can delete.

### `owner_leads`

Management consultation form.

`id`, `name`, `email`, `phone`, `property_address`, `location_id`, `property_type`, `furnished`, `current_use`, `available_from`, `notes`, `source`, `status`, `assigned_to`, `created_at`.

- `furnished`: `yes | partly | no`
- `status`: `new | contacted | closed`, default `new`
- `source`: short slug such as `web` (the default) or `mailer`

Anyone can insert a new, unassigned lead. They cannot read it back. `manager` and `admin` profiles can read and update the inbox. `assigned_to` must be a manager or admin.

## Address privacy

`address_private` lives on `listings`, but `anon` and `authenticated` have no `SELECT` privilege on that column. Table-level `SELECT` is revoked; the other columns are granted individually. Consequences:

- `select *` from `listings` fails for the Data API roles. Select `listingPublicColumns` from `lib/db/types.ts`, or read the `listings_public` view (security invoker, same columns, listings RLS still applies).
- Owners and admins still insert and update `address_private` on the row.
- They read it back with `listing_address(target_listing uuid)`, exposed as `supabase.rpc("listing_address", { target_listing })`. Anyone else gets null. The privileged read is `private.listing_address`, which is not in an exposed schema.

`service_role` keeps full table access and bypasses RLS. Use it only on the server.

## Who can set review fields

Owners cannot set `status` to `approved` or `rejected`, and they cannot change `is_demo`, `listing_fee_status`, `reviewed_by`, `reviewed_at`, or `rejection_reason`. A before-trigger enforces that. They can move a listing among `draft`, `pending_review`, and `archived`, including taking an approved listing down.

Admins, `service_role`, and the SQL editor (no end-user JWT) can set those fields. Moving a listing to `approved` or `rejected` stamps `reviewed_at` and `reviewed_by` when they are still empty.

Role checks use `profiles.role` via `private.is_admin()`. They do not read `auth.jwt()` user metadata.

## Row level security

RLS is enabled and forced on every table above. `anon` is a signed-out Data API request. `authenticated` is a signed-in user. Admin means `profiles.role = 'admin'`.

| Table | anon | signed-in non-admin | admin |
| --- | --- | --- | --- |
| `locations` | select active | select active | all |
| `profiles` | none | select/update own row; insert own row as `renter` | all |
| `listings` | select `approved` | select `approved`; full CRUD where `owner_id` is self, except the review columns above | all |
| `listing_fees`, `listing_photos`, `availability_windows` | select when the listing is `approved` | same, plus full CRUD on children of own listings | all |
| `inquiries` | insert only | insert; select own (`renter_id`), assigned, or owned-listing inquiries; update status/assignee on owned or assigned inquiries | all |
| `messages` | none | select and insert on inquiries they can read | all, including delete |
| `owner_leads` | insert only | insert; managers read/update the inbox; assignees read/update their rows | all |

There is no public read of `profiles`, so owner phone and email are not on the catalog. Contact goes through an inquiry.

## Storage

Bucket `listing-photos` is private (`public = false`). `getPublicUrl` will not serve these files.

Reads use a `SELECT` policy on `storage.objects`:

- The object path equals `listing_photos.storage_path` for an `approved` listing, or
- The first folder is a listing uuid the caller owns, or
- The caller is an admin.

Uploads, replacements, and deletes are authenticated only. The path must stay inside `{listing_id}/…`, must not contain `..`, and the extension must be `jpg`, `jpeg`, `png`, `webp`, or `avif`. Upsert needs select, insert, and update; the owner policies grant all three. The bucket limits files to 10 MB and those image types when the Storage columns exist.

Front end: load `listing_photos` for a listing the RLS policy already allows, then `createSignedUrl(storage_path, expiresIn)` or `download`. A signed URL for a draft path fails for everyone except the owner and admins. The catalog can put that signed URL in an image tag. Do not make the bucket public; a public bucket would serve draft objects to anyone who can guess the path.

## Demo seed

`supabase/seed.sql` inserts three **approved** listings for the `bend` location, `is_demo = true`, `listing_fee_status = waived`, titles prefixed `Demo:`:

- `demo-northwest-crossing-adu` — ADU, self-managed, open-ended from 2026-11-01
- `demo-old-mill-apartment` — apartment, FurnishedKeys-managed, pets, 2026-12-01 to 2027-06-01
- `demo-river-west-room` — room, 2027-01-15 to 2027-04-15

Each has utilities, a refundable deposit, and either cleaning or a pet fee, plus one photo path and an availability window. Street addresses are fake (`100 Demo Lane`, and so on) and are not in the public column list. The demo profile is `demo-owner@furnishedkeys.example` with role `owner`. It is not a login.

## Deferred

Not in this migration, and not to be implied by the columns that happen to exist:

- **Stripe $199 listing fee.** `listing_fee_status` is the placeholder (`unpaid`, `paid`, `waived`). No Checkout session, webhook, price, or customer.
- **Background checks.** No applicant, screening, or report tables.
- **Booking and calendar.** `availability_windows` is a confirmed range only. No reservations, leases, payments, or nightly calendar.
- **Feature flags.** Those three stay off until a later flag. This schema does not add a flag table.

Also later, not now: promoting a user to `owner` or `manager` from the product UI (an admin can do it in SQL today), re-review after an edit to an approved listing, and per-listing assignment of FurnishedKeys managers. `fk_managed` is a label. It does not grant every `manager` profile write access to that listing.
