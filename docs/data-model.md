# FurnishedKeys data model

Postgres schema for the Supabase project. Migrations, in order: `supabase/migrations/20261011033000_init.sql`, `supabase/migrations/20261011041000_owner_lead_interest.sql`, `supabase/migrations/20261011053000_listing_subscription.sql`. Demo inventory is `supabase/seed.sql` (local `supabase db reset` only). Hand-written TypeScript for the front end is `lib/db/types.ts`.

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

`id`, `owner_id`, `location_id`, `slug`, `title`, `description`, `property_type`, `bedrooms`, `bathrooms`, `max_occupants`, `pets_allowed`, `pet_policy`, `monthly_rent_cents`, `min_stay_months`, `max_stay_months`, `amenities`, `house_rules`, `approx_lat`, `approx_lng`, `address_private`, `management`, `status`, `is_demo`, `listing_fee_status`, `fee_paid_through`, `paid_at`, `admin_note`, `stripe_subscription_id`, `renewal_canceled`, `source`, `reviewed_by`, `reviewed_at`, `rejection_reason`, `created_at`, `updated_at`.

Enums:

- `property_type`: `adu | apartment | room | house | other`
- `management`: `self_managed | fk_managed`
- `status`: `draft | pending_review | approved | rejected | changes_requested | archived` (default `draft`)
- `listing_fee_status`: `unpaid | paid | waived` (default `unpaid`)

`amenities` is `text[]`. `bathrooms` is `numeric(3,1)`.

A stub draft may leave `slug`, `title`, `bedrooms`, `bathrooms`, `max_occupants`, and `monthly_rent_cents` null. Submit checks completeness in the API. An approved row must have a title, a description, rent greater than zero, and `listing_fee_status` of `paid` or `waived`.

`source` is a short slug, default `web`, with the same format check as `owner_leads.source` (`^[a-z0-9_-]{1,40}$`). Owners can set it on insert and cannot change it later. `renewal_canceled` mirrors Stripe `cancel_at_period_end`. `paid_at` and `admin_note` are for the owner dashboard. `fee_paid_through` is the end of the paid year.

The public catalog (and child rows, and public photo reads) shows an approved listing only when the fee is `waived`, or `paid` with `fee_paid_through` still in the future. Demo rows stay visible because their fee is waived.

### `listing_payments`

`id`, `listing_id`, `stripe_event_id`, `stripe_session_id`, `stripe_invoice_id`, `stripe_subscription_id`, `amount_cents`, `status`, `period_end`, `created_at`.

`stripe_event_id` is unique. Webhook handling inserts that id and updates the listing in one function, `apply_listing_fee_event`, so a replayed event is a no-op. `status` is `paid | payment_failed | subscription_deleted | cancel_scheduled | cancel_cleared | waived_no_stripe`. The owner reads rows for their listings. Admins read all. Inserts and updates are service role only. `waived_no_stripe` is the placeholder row written when checkout runs without `STRIPE_SECRET_KEY`. Its event id is `waived_no_stripe:<listing_id>`.

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

`id`, `name`, `email`, `phone`, `property_address`, `location_id`, `property_type`, `furnished`, `current_use`, `available_from`, `notes`, `interest`, `source`, `status`, `assigned_to`, `created_at`.

- `furnished`: `yes | partly | no`
- `interest`: `list_myself | full_management | not_sure`. Nullable, no default. Added by `20261011041000_owner_lead_interest.sql`.
- `status`: `new | contacted | closed`, default `new`
- `source`: short slug, default `web`. The format check `^[a-z0-9_-]{1,40}$` accepts `web`, `mailer`, and `letter`. It is not a closed list.

Anyone can insert a new, unassigned lead, including `interest` and `source`. The insert policy only requires `status = new` and `assigned_to` null, and the insert grant is table-level, so both columns are writable. Visitors cannot read the row back. `manager` and `admin` profiles can read and update the inbox. `assigned_to` must be a manager or admin.

## Address privacy

`address_private` lives on `listings`, but `anon` and `authenticated` have no `SELECT` privilege on that column. Table-level `SELECT` is revoked; the other columns are granted individually. Consequences:

- `select *` from `listings` fails for the Data API roles. Select `listingPublicColumns` from `lib/db/types.ts`, or read the `listings_public` view (security invoker, same columns, listings RLS still applies).
- Owners and admins still insert and update `address_private` on the row.
- They read it back with `listing_address(target_listing uuid)`, exposed as `supabase.rpc("listing_address", { target_listing })`. Anyone else gets null. The privileged read is `private.listing_address`, which is not in an exposed schema.

`service_role` keeps full table access and bypasses RLS. Use it only on the server.

## Who can set review fields

Owners cannot set `status` to `approved`, `rejected`, or `changes_requested`, and they cannot change `is_demo`, `listing_fee_status`, `fee_paid_through`, `paid_at`, `admin_note`, `stripe_subscription_id`, `renewal_canceled`, `source`, `reviewed_by`, `reviewed_at`, or `rejection_reason`. A before-trigger enforces that. They can move a listing among `draft`, `pending_review`, and `archived`, including taking an approved listing down. `source` may be set on insert and not changed after.

Admins, `service_role`, and the SQL editor (no end-user JWT) can set those fields. Moving a listing to `approved` or `rejected` stamps `reviewed_at` and `reviewed_by` when they are still empty.

Role checks use `profiles.role` via `private.is_admin()`. They do not read `auth.jwt()` user metadata.

## Row level security

RLS is enabled and forced on every table above. `anon` is a signed-out Data API request. `authenticated` is a signed-in user. Admin means `profiles.role = 'admin'`.

| Table | anon | signed-in non-admin | admin |
| --- | --- | --- | --- |
| `locations` | select active | select active | all |
| `profiles` | none | select/update own row; insert own row as `renter` | all |
| `listings` | select `approved` only while the fee is waived or `fee_paid_through` is still in the future | select those public rows; full CRUD where `owner_id` is self, except review, billing, and `source` | all |
| `listing_payments` | none | select rows for own listings | select all; writes are service role |
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

## Listing fee

The listing fee is **$199 per year**, not a one-time charge. When `STRIPE_SECRET_KEY` is set, checkout is Stripe Embedded Checkout (`ui_mode: embedded_page` on the current Stripe API; this is the inline card, name, and ZIP form, not a hosted redirect). `POST /api/listings/[id]/checkout` accepts `{ auto_renew }` (default true) and returns `{ client_secret }`. The return URL is `/owners/listings/{id}/setup?session_id={CHECKOUT_SESSION_ID}`. When `auto_renew` is false, the webhook sets `cancel_at_period_end` on the new subscription. `GET /api/listings/[id]/checkout/status?session_id=` returns `{ status, paid_through }` from Stripe so the setup page can confirm before the webhook lands. A waived listing skips Stripe and that GET returns `{ status: "waived", paid_through }`.

`POST /api/stripe/webhook` checks the signature and is idempotent on the Stripe event id.

- `checkout.session.completed` sets `listing_fee_status = paid`, `paid_at`, `fee_paid_through` to the period end, and `stripe_subscription_id`. It does **not** move the listing to review. The owner builds the listing after paying.
- `invoice.paid` extends `fee_paid_through`.
- `invoice.payment_failed` sets the fee unpaid only once `fee_paid_through` has passed.
- `customer.subscription.deleted` sets the fee unpaid.

If `STRIPE_SECRET_KEY` is missing, `POST /api/listings/[id]/checkout` does not return 503. The service role sets `listing_fee_status` to `waived` and `fee_paid_through` to one year from now, inserts a `listing_payments` row with `status` `waived_no_stripe` and `amount_cents` 0, and returns `200` `{ waived: true, paid_through }`. `paid_through` is an ISO timestamp. If the listing is already `paid` or `waived`, the same body is returned and nothing is written (`paid_through` is the stored value, which can be null when an admin waived the fee without a date). Cancel-renewal and the webhook still return 503 `Payments are not set up yet`. Submit already accepts a waived fee. A missing price id, once Stripe is configured, falls back to `price_data` of 19900 USD with `recurring.interval = year`.

Session metadata is `listing_id`, `owner_id`, `source`, and `auto_renew`.

Owners cancel renewal with `POST /api/listings/[id]/cancel-renewal` and undo it with `DELETE` on that route, until the period ends. The listing stays public until `fee_paid_through`.

There are no refunds. Rejecting a listing sets `cancel_at_period_end` when Stripe is configured and records `cancel_scheduled` in `listing_payments`.

### Routes

- `POST /api/owners/start` — `{ full_name, email, phone, property_type, location_id, source? }`. Signed-in callers are reused (the email must match). Anonymous callers are created with `signUp` on the cookie client (random password, not returned) so a session cookie is set when Supabase returns one. This is not `signInWithOtp`, because that cannot return `listing_id` before the email link is opened, and the sign-in page is not built yet. An email that already has an account gets 401 `{ error: "Sign in required", hint }`. The profile role becomes `owner` unless it is already `manager` or `admin`. A draft stub is inserted and the response is `{ listing_id }`.
- `POST /api/listings` — signed-in draft. Promotes a renter to owner. 401 if signed out.
- `PATCH /api/listings/[id]` — owner, and only `draft`, `rejected`, or `changes_requested`. Optional `availability` replaces windows.
- `GET /api/listings/[id]` — owner read, including `paid_at`, `admin_note`, and `renewal_canceled`.
- `POST /api/listings/[id]/photos` — signed upload URLs under `listing-photos/<listing_id>/...`.
- `POST /api/listings/[id]/checkout` — `{ client_secret }` when Stripe is configured. Without `STRIPE_SECRET_KEY`, `{ waived: true, paid_through }`.
- `GET /api/listings/[id]/checkout/status?session_id=` — `{ status, paid_through }`. A waived listing returns `{ status: "waived", paid_through }` and does not need `session_id`.
- `POST /api/listings/[id]/submit` — does not charge. Requires a current paid or waived fee, otherwise 402 `{ checkout_url }` (that URL is the checkout route above, which returns a client secret). 422 `{ missing }` when title, description, rent, a photo, or an availability window is absent. Resubmitting after `changes_requested` does not charge again while `fee_paid_through` is still in the future.
- `POST /api/listings/[id]/cancel-renewal` and `DELETE` — owner only. 503 when Stripe is not configured.
- `POST /api/stripe/webhook`
- `POST /api/admin/listings/[id]/review` — `{ action: approve | request_changes | reject, note? }`. `note` is required for request changes and reject. Approve sets `approved`. Request changes sets `changes_requested`. Reject sets `rejected` and cancels renewal at period end when Stripe is configured.
- `POST /api/admin/listings/[id]/waive` — sets `listing_fee_status = waived`. Admin only.

Front end Embedded Checkout needs `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`. The webhook endpoint to register is `https://furnishedkeys.com/api/stripe/webhook`.

## Deferred

Not in this schema:

- **Background checks.** No applicant, screening, or report tables.
- **Booking and calendar.** `availability_windows` is a confirmed range only. No reservations, leases, or nightly calendar.
- **Other feature flags.** Background checks and booking stay off. Until `STRIPE_SECRET_KEY` is set, checkout records a one-year waiver instead of charging. There is no feature-flag table.

Also later: re-review after an edit to an approved listing, and per-listing assignment of FurnishedKeys managers. `fk_managed` is a label. It does not grant every `manager` profile write access to that listing.
