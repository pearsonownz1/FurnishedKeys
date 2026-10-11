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

`id`, `full_name`, `email`, `phone`, `notify_new_inquiry`, `notify_new_message`, `notify_listing_status`, `role`, `company_name`, `created_at`.

`notify_new_inquiry`, `notify_new_message`, and `notify_listing_status` each default to true. They replace the earlier single `notify_email` column. A false `notify_email` was copied onto all three before that column was dropped. Inquiry notices respect `notify_new_inquiry`. Renter-message notices respect `notify_new_message`. Listing approved, changes-requested, and rejected mail respects `notify_listing_status`. `phone` was already on the profile.

`role` is `renter | owner | manager | admin`, default `renter`. A trigger on `auth.users` inserts the profile at signup and always sets `renter`. Display name may be copied from signup metadata. Role is never taken from `user_metadata`.

A second trigger blocks self-service role changes. An admin, `service_role`, or the SQL editor can change `role`. Signing up does not make someone an owner or admin.

Listing access is `listings.owner_id`, not `profiles.role`. A renter may draft a listing they own. `manager` is the consultation inbox (see `owner_leads`). `admin` is global.

### `listings`

`id`, `owner_id`, `location_id`, `slug`, `title`, `description`, `property_type`, `bedrooms`, `bathrooms`, `max_occupants`, `pets_allowed`, `pet_policy`, `monthly_rent_cents`, `min_stay_months`, `max_stay_months`, `amenities`, `good_for`, `house_rules`, `square_feet`, `space_description`, `smoking_allowed`, `calendar_updated_at`, `approx_lat`, `approx_lng`, `address_private`, `management`, `status`, `is_demo`, `listing_fee_status`, `fee_paid_through`, `paid_at`, `admin_note`, `stripe_subscription_id`, `renewal_canceled`, `source`, `setup_step`, `reviewed_by`, `reviewed_at`, `rejection_reason`, `created_at`, `updated_at`.

`setup_step` is the wizard step last saved (`basics`, `rooms`, `photos`, `description`, `goodFor`, `amenities`, `rent`, `availability`, `rules`, `review`), or null. It is not on the public catalog. Authenticated clients can select it. The setup page opens `?step=` when that query is present, and otherwise opens the saved step. Every draft save writes the current step. Save and exit writes the fields entered so far, including the calendar, then leaves for `/owner`.

Enums:

- `property_type`: `adu | apartment | room | house | other`
- `management`: `self_managed | fk_managed`
- `status`: `draft | pending_review | approved | rejected | changes_requested | archived` (default `draft`)
- `listing_fee_status`: `unpaid | paid | waived` (default `unpaid`)

`amenities` and `good_for` are `text[]` (default `'{}'`). The API accepts only keys from `lib/listings/amenities.ts` and `lib/listings/good-for.ts`. `bathrooms` is `numeric(3,1)`. `square_feet` is an integer greater than zero, or null. `space_description` is the longer “The space” copy. `smoking_allowed` defaults to false. `calendar_updated_at` changes when an availability window or blocked date is inserted, updated, or deleted. `bedrooms` remains the integer count; a trigger sets it from `listing_bedrooms` and does not rewrite existing rows until those child rows change.

A stub draft may leave `slug`, `title`, `bedrooms`, `bathrooms`, `max_occupants`, and `monthly_rent_cents` null. Submit checks completeness in the API. An approved row must have a title, a description, and rent greater than zero. `listing_fee_status` is not part of that check.

`source` is a short slug, default `web`, with the same format check as `owner_leads.source` (`^[a-z0-9_-]{1,40}$`). Owners can set it on insert and cannot change it later. `renewal_canceled` mirrors Stripe `cancel_at_period_end` when a subscription exists. `paid_at` and `admin_note` are for the owner dashboard. `fee_paid_through` is the end of a recorded fee period. Listing is free; those fee columns stay and do not gate submit, approval, or the catalog.

The public catalog (and child rows, and public photo reads) shows a listing when `status` is `approved`. `private.listing_is_public` is that same check. The app query does not filter on `listing_fee_status`. Demo rows stay visible because they are approved.

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

`id`, `listing_id`, `storage_path`, `caption`, `sort`, `is_cover`.

`storage_path` is unique and must look like `{listing_id}/{filename}` with no `..`. `is_cover` defaults to false. A partial unique index allows one cover per listing. A trigger rejects a 21st photo, and `POST /api/listings/[id]/photos` checks the same limit before signing uploads. Submit marks the lowest `sort` as the cover when none is set.

### `listing_bedrooms`

`id`, `listing_id`, `sort`, `label`, `beds`.

`beds` is required text such as `King bed`, `3x Bunk beds`, `Queen bed`, `Twin bed`, or `Sofa bed`. `label` defaults to `Bedroom N`, where N is `sort`, when the insert omits it. Public reads follow `listing_is_public`. The owner has full CRUD on their own rows. Admins have all. Deleting the listing cascades.

### `listing_blocked_dates`

`id`, `listing_id`, `start_date`, `end_date`, `note`.

`end_date` is on or after `start_date`. The same RLS as `listing_photos`. Changes here, and changes to `availability_windows`, set `listings.calendar_updated_at` to now.

### `availability_windows`

`id`, `listing_id`, `available_from`, `available_to`, `last_confirmed_at`, `confirmed_by`.

`available_to` null means open-ended. This is an owner-confirmed range, not a booking calendar.

### `inquiries`

`id`, `listing_id`, `renter_id`, `name`, `email`, `phone`, `move_in`, `move_out`, `occupants`, `pets`, `message`, `status`, `assigned_to`, `renter_token_hash`, `last_message_at`, `owner_unread`, `renter_unread`, `created_at`.

`renter_id` is null for a signed-out visitor. `status` is `new | responded | closed | declined`, default `new`. `assigned_to` may point at a `manager` or `admin` profile. `declined` is set by the listing owner through `declineInquiry`. The inbox still returns those rows and marks them with that status. Anonymous inserts still require `status = new`.

Anonymous and signed-in visitors can insert a row with `status = new`, `assigned_to` null, and `renter_id` null or their own id, and only when `private.listing_is_public(listing_id)` is true and the listing is not a demo (`private.listing_is_demo`). They cannot read it back unless they are signed in and `renter_id` is their id. The listing owner, the assignee, and admins can read the thread. Owners and assignees can update `status`, `assigned_to`, `owner_unread`, `renter_unread`, and `last_message_at`. They cannot change `renter_token_hash`. Admins and the service role can edit the rest.

`submitInquiry` stores `sha256` of a random 32-byte token in `renter_token_hash` and discards the raw token. The owner notice email is unchanged and does not include the link. A non-bypass insert forces `owner_unread = 1`, `renter_unread = 0`, and `last_message_at = now()`.

Renter links rotate. Each successful `replyToInquiry` replaces `renter_token_hash` with the sha256 of a new token and puts the raw token only in that email's button (`/inquiry/<token>`). An older link no longer matches. The page then says "This link has expired. Open the newest email from the owner." The raw token is not stored. Encryption was not used, so a leaked old email cannot reopen the thread.

`submitInquiry` refuses a demo listing before any insert or email: `{ ok: false, formError: "This is a sample listing, so it can't take inquiries. Browse real homes at /rentals." }`.

After a real insert succeeds, the server emails the listing owner. The id is chosen before the insert so the message can link to `/owner#inquiry-{id}` without reading the row back. The HTML includes the listing title, the renter's name, email, phone (or "None"), desired dates, occupants, pets (or "None"), and message. Reply-To is the renter's email. The owner's address is read with the service role from `profiles`. A missing `RESEND_API_KEY` logs the email and does not send. Any `to` address that ends in `.example` is logged as `skipped:example-domain` and is not sent. A lookup or send failure is logged and the inquiry still succeeds.

The owner board loads inquiries with `status` in `new` or `responded`. Each board inquiry keeps `id`, `listingTitle`, `name`, `message`, and `createdAt`, and also includes `email`, `phone`, `move_in`, `move_out`, `occupants`, `pets`, `status`, and `created_at`.

### `messages`

`id`, `inquiry_id`, `sender_id`, `sender_role`, `body`, `emailed`, `created_at`.

`sender_role` is `owner` or `renter`, default `owner`. `sender_id` stays nullable. Owner replies set `sender_id` to the signed-in profile and `sender_role` to `owner`. Renter replies set `sender_id` null and `sender_role` to `renter`, and only the service role inserts those after the token hash matches. `anon` has no privilege on `messages`. Signed-in users can insert only when `sender_role = owner`, `sender_id` is themselves, and `private.can_read_inquiry` is true. They can select messages on inquiries they can read. They cannot update messages. Admins can delete.

`emailed` defaults to false. A non-bypass insert forces it false. It becomes true only when the service role updates it after Resend accepts the email to the other party. A skipped or failed send leaves it false, so the thread can show "emailed" only for a send that was accepted.

A renter can send at most 20 messages on one inquiry per hour.

### Owner reply (`replyToInquiry`)

Exported from `app/(site)/owner/actions.ts` for the owner board. Front End posts a form; do not add the form in this change.

```
replyToInquiry(previousState, formData) => ReplyActionState
```

`formData` fields:

- `inquiryId` — uuid
- `body` — string, trimmed, 1 to 8000 characters

`ReplyActionState` is `{ ok: boolean, success?: boolean, formError?: string }`.

| Result | Response |
| --- | --- |
| No session | `{ ok: false, formError: "Sign in again." }` |
| `inquiryId` is not a uuid, or the signed-in user cannot read that inquiry | `{ ok: false, formError: "That inquiry is not on your board." }` |
| `body` is empty or longer than 8000 characters | `{ ok: false, formError: "Write a reply between 1 and 8000 characters." }` |
| Message insert or status update fails | `{ ok: false, formError: "We couldn't send this. Please try again." }` |
| Success | `{ ok: true, success: true }` |

On success the action uses the signed-in user's client (RLS). It inserts `messages` `{ inquiry_id, sender_id, sender_role: "owner", body }`, sets the inquiry `status` to `responded`, then the service role stores the new token hash, increments `renter_unread`, and sets `last_message_at`. The renter email subject stays `Re: your inquiry for <title>`. The HTML body is escaped and includes a button to `/inquiry/<token>`. `replyTo` is the owner's `profiles.email`. A mail failure is logged and the action still returns success. If the token cannot be stored, the action returns `{ ok: false, formError: "We couldn't send this. Please try again." }`.

### `owner_leads`

Management consultation form.

`id`, `name`, `email`, `phone`, `property_address`, `location_id`, `property_type`, `furnished`, `current_use`, `available_from`, `notes`, `interest`, `source`, `status`, `assigned_to`, `created_at`.

- `furnished`: `yes | partly | no`
- `interest`: `list_myself | full_management | not_sure`. Nullable, no default. Added by `20261011041000_owner_lead_interest.sql`.
- `status`: `new | contacted | qualified | onboarded | closed`, default `new`. `qualified` and `onboarded` were added by `20261011203437_admin_console.sql`.
- `source`: short slug, default `web`. The format check `^[a-z0-9_-]{1,40}$` accepts `web`, `mailer`, and `letter`. It is not a closed list.

Anyone can insert a new, unassigned lead, including `interest` and `source`. The insert policy only requires `status = new` and `assigned_to` null, and the insert grant is table-level, so both columns are writable. Visitors cannot read the row back. `manager` and `admin` profiles can read the inbox. Updates are admin only. `assigned_to` must be a manager or admin.

After a successful insert, `submitOwnerLead` emails `LEADS_NOTIFY_TO` or, when that is unset, `guy@gcs.org`. The subject is `New owner lead: <interest> – <property address>`. Every field in the HTML is escaped. Reply-To is the lead's email. A mail failure is logged. The action still returns `{ ok: true, success: true }`.

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
| `listings` | select `approved` | select those public rows; full CRUD where `owner_id` is self, except review, billing, and `source` | all |
| `listing_payments` | none | select rows for own listings | select all; writes are service role |
| `listing_fees`, `listing_photos`, `listing_bedrooms`, `listing_blocked_dates`, `availability_windows` | select when the listing is publicly visible | same, plus full CRUD on children of own listings | all |
| `inquiries` | insert only | insert; select own (`renter_id`), assigned, or owned-listing inquiries; update status/assignee on owned or assigned inquiries | all |
| `messages` | none | select on inquiries they can read; insert only an `owner` row as themselves | all, including delete |
| `owner_leads` | insert only | insert; managers and assignees can read. Updates are admin only | all |

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

Listing is free. Submit and approve do not look at `listing_fee_status` or `fee_paid_through`. The site does not call checkout, and old `/plan` and `/checkout` URLs redirect to setup. The checkout, status, cancel-renewal, and Stripe webhook routes remain for Backend. The columns and `listing_payments` stay for a later share of rent and do not gate submit, approval, or the catalog.

When `STRIPE_SECRET_KEY` is set, checkout is Stripe Embedded Checkout (`ui_mode: embedded_page` on the current Stripe API; this is the inline card, name, and ZIP form, not a hosted redirect). `POST /api/listings/[id]/checkout` accepts `{ auto_renew }` (default true) and returns `{ client_secret }`. The return URL is `/owners/listings/{id}/setup?session_id={CHECKOUT_SESSION_ID}`. When `auto_renew` is false, the webhook sets `cancel_at_period_end` on the new subscription. `GET /api/listings/[id]/checkout/status?session_id=` returns `{ status, paid_through }` from Stripe so the setup page can confirm before the webhook lands. A waived listing skips Stripe and that GET returns `{ status: "waived", paid_through }`.

`POST /api/stripe/webhook` checks the signature and is idempotent on the Stripe event id.

- `checkout.session.completed` sets `listing_fee_status = paid`, `paid_at`, `fee_paid_through` to the period end, and `stripe_subscription_id`. It does **not** move the listing to review. The owner builds the listing after paying.
- `invoice.paid` extends `fee_paid_through`.
- `invoice.payment_failed` sets the fee unpaid only once `fee_paid_through` has passed.
- `customer.subscription.deleted` sets the fee unpaid.

If `STRIPE_SECRET_KEY` is missing, `POST /api/listings/[id]/checkout` does not return 503. The service role sets `listing_fee_status` to `waived` and `fee_paid_through` to one year from now, inserts a `listing_payments` row with `status` `waived_no_stripe` and `amount_cents` 0, and returns `200` `{ waived: true, paid_through }`. `paid_through` is an ISO timestamp. If the listing is already `paid` or `waived`, the same body is returned and nothing is written (`paid_through` is the stored value, which can be null when an admin waived the fee without a date). Cancel-renewal and the webhook still return 503 `Payments are not set up yet`. A missing price id, once Stripe is configured, falls back to `price_data` of 19900 USD with `recurring.interval = year`. None of that is required to submit or approve.

Session metadata is `listing_id`, `owner_id`, `source`, and `auto_renew`.

Owners cancel renewal with `POST /api/listings/[id]/cancel-renewal` and undo it with `DELETE` on that route, until the period ends. Canceling a subscription does not take an approved listing out of the catalog.

There are no refunds. Rejecting a listing sets `cancel_at_period_end` when Stripe is configured and records `cancel_scheduled` in `listing_payments`.

### Routes

- `POST /api/owners/start` — `{ full_name, email, phone, password?, property_type, location_id, source? }`. Signed-in callers are reused (the email must match) and `password` is ignored. Anonymous callers must send `password` (8–72 characters). A missing or shorter password is 422 `{ error: "Password must be at least 8 characters" }`. Longer than 72 is 422 `{ error: "Password must be at most 72 characters" }`. The service client creates the user with `auth.admin.createUser` (`email_confirm: true`, that password, `user_metadata.full_name`), then `signInWithPassword` on the cookie client so the session cookie is set. The password is not returned. Email confirmation is on, so `signUp` is not used: it would leave an unconfirmed user with no session and later owner requests would run as anon. An email that already has an account gets 401 `{ error: "Sign in required", hint }` and the hint says to sign in or use Forgot password. If sign-in returns no session, the response is 500 `{ error: "Could not start the session" }`. The profile role becomes `owner` unless it is already `manager` or `admin`. A draft stub is inserted and the response is `{ listing_id }`. Owner listing routes check the session before selecting owner columns and return 401 `{ error: "Sign in required" }` when there is none. A database error from that select is JSON 500 `{ error }` instead of an uncaught throw.
- `POST /api/listings` — signed-in draft. Promotes a renter to owner. 401 if signed out.
- `PATCH /api/listings/[id]` — owner, and only `draft`, `rejected`, or `changes_requested`. Optional `availability` replaces windows. Also accepts `square_feet`, `space_description`, `smoking_allowed`, `amenities` (catalog keys), `good_for` (catalog keys), `setup_step` (a wizard step id), and `bedrooms: [{ label?, beds }]` which replaces every bedroom row. The integer `listings.bedrooms` is the row count after that write, not a field the client sets.
- `GET /api/listings/[id]` — owner read, including `paid_at`, `admin_note`, and `renewal_canceled`.
- `GET /api/listings/[id]/calendar` — owner read of `{ calendar_updated_at, availability, blocked_dates }`.
- `PUT /api/listings/[id]/calendar` — owner, editable statuses only. Body `{ availability: [{ available_from, available_to? }], blocked_dates: [{ start_date, end_date, note? }] }` replaces both lists and returns the same shape as GET.
- `POST /api/listings/[id]/photos` — signed upload URLs under `listing-photos/<listing_id>/...`. 422 when the listing would exceed 20 photos.
- `POST /api/listings/[id]/checkout` — `{ client_secret }` when Stripe is configured. Without `STRIPE_SECRET_KEY`, `{ waived: true, paid_through }`.
- `GET /api/listings/[id]/checkout/status?session_id=` — `{ status, paid_through }`. A waived listing returns `{ status: "waived", paid_through }` and does not need `session_id`.
- `POST /api/listings/[id]/submit` — does not charge and does not check the fee. 422 `{ missing }` lists any of `title`, `description`, `rent`, `min_stay`, `bedroom`, `bathrooms`, `photo`, and `cover` that are absent. If photos exist and none is the cover, submit marks the first by `sort` before that check. A complete listing becomes `pending_review`. After that status write, the server calls `revalidatePath` on `/rentals/<slug>`, `/rentals`, and `/`.
- `POST /api/listings/[id]/cancel-renewal` and `DELETE` — owner only. 503 when Stripe is not configured.
- `POST /api/stripe/webhook`
- `POST /api/admin/listings/[id]/review` — `{ action: approve | request_changes | reject, note? }`. `note` is required for request changes and optional for reject. It is 1–4000 characters. Approve sets `approved` when the same completeness list is empty, with no fee check. Request changes sets `changes_requested`. Reject sets `rejected` and cancels renewal at period end when Stripe is configured. After each successful status write, the server calls `revalidatePath` on `/rentals/<slug>` (when the listing has a slug), `/rentals`, and `/`, then emails the owner: approved, changes requested (the note is in the message), or rejected (the note is in the message). Mail is skipped when `notify_listing_status` is false. A mail failure does not change the JSON response. `EMAIL_FROM` is the From address. With no `RESEND_API_KEY`, the email is logged and not sent. Addresses ending in `.example` are not sent.
- `POST /api/admin/listings/[id]/waive` — sets `listing_fee_status = waived`. Admin only.

Front end Embedded Checkout needs `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`. The webhook endpoint to register is `https://furnishedkeys.com/api/stripe/webhook`.

## Public landlord card

`public.public_listing_landlord(listing_id uuid)` is `security definer`. `supabase.rpc("public_listing_landlord", { listing_id })` returns an array of at most one row, and only when `listing_is_public` is true:

```json
[{ "first_name": "Ada", "last_initial": "L", "member_since": "2026-01-04T00:00:00.000Z" }]
```

`first_name` is the first word of `profiles.full_name`. `last_initial` is the first letter of the last word, or null when the name is a single word. `member_since` is `profiles.created_at`. A listing that is not publicly visible returns `[]`. The function does not return email, phone, or any other profile field. `anon` and `authenticated` may call it.

## Owner dashboard loaders and actions

Front End builds the Listings, Inquiries, Calendar, and Settings screens. These are the server contracts. Signed-out list loaders return `[]`, `loadInbox` returns `{ inquiries: [], unread_total: 0 }`, and the other loaders return `null`. Actions return `{ ok, success?, formError?, fieldErrors?, message? }`.

| Export | File | Args | Returns |
| --- | --- | --- | --- |
| `loadInbox` | `lib/owner-dashboard-load.ts` | none | `{ inquiries, unread_total }`. `inquiries` is every status, including `declined`, sorted by `last_message_at` desc. Each item: `id`, `name`, `email`, `phone`, `move_in`, `move_out`, `occupants`, `pets`, `status`, `listing_title`, `last_message_snippet`, `unread_count` (`owner_unread`), `last_message_at`. `unread_total` is the sum of `owner_unread`, including declined threads. Signed out: `{ inquiries: [], unread_total: 0 }`. |
| `loadThread` | `lib/owner-dashboard-load.ts` | `inquiryId: string` | `OwnerThread` or `null`. `inquiry` plus `messages: { id, sender_role, body, emailed, created_at }[]` oldest first. `emailed` is true only after Resend accepted the send. Sets `owner_unread` to 0 when the signed-in user can read the inquiry. The renter page uses the same message shape. |
| `loadOwnerListings` | `lib/owner-dashboard-load.ts` | none | `OwnerListingCard[]`: `id`, `title`, `status`, `status_group` (`draft`, `review`, or `live`), `cover_url` (signed, or null), `city` (location name), `setup_step`, `step_index` (1-based resume step), `step_count` (10), `next_step_label` (that step's label, for example "Photos"), `percent_complete` (0–100 from the 8 submit fields), `resume_href` (`/owners/listings/<id>/setup?step=<setup_step>`), `updated_at`. Card copy is `Step ${step_index} of ${step_count} · ${next_step_label} next`. `draft` covers draft, rejected, changes_requested, and archived. `review` is `pending_review`. `live` is `approved`. |
| `loadCalendar` | `lib/owner-dashboard-load.ts` | `listingId`, `month` `YYYY-MM` | `{ listing_id, month, blocked_days, availability: { id, available_from, available_to }[] }` or `null`. `blocked_days` are the expanded days in that month. Availability windows are the whole listing. |
| `loadSettings` | `lib/owner-dashboard-load.ts` | none | `{ full_name, email, phone, notify_new_inquiry, notify_new_message, notify_listing_status }` or `null`. `email` is the auth user email when present. Each notify flag is true unless the column is false. |
| `replyToInquiry` | `app/(site)/owner/actions.ts` | `(prev, formData{inquiryId, body})` | Same `{ ok, success?, formError? }` as before. Rotates the renter token and emails `/inquiry/<token>`. Sets `messages.emailed` when Resend returns an id. |
| `declineInquiry` | `app/(site)/owner/actions.ts` | `(prev, formData{inquiryId, note?})` | `{ ok, success?, formError? }`. Owner only. Sets status to `declined` and emails the renter "The owner is not able to offer this stay." Optional `note` is at most 2000 characters and is included, escaped. The row stays in `loadInbox`. Another owner: "That inquiry is not on your board." A mail failure still returns success. |
| `renterReply` | `app/(site)/inquiry/actions.ts` | `(prev, formData{token, body})` | `{ ok, success?, formError? }`. Body 1–8000. Bad token: "This link has expired. Open the newest email from the owner." Over 20 renter messages an hour: "Please wait before sending another message." Inserts `sender_role: "renter"`, increments `owner_unread`, sets `last_message_at`, and emails the owner "New message about <title>" with a button to `/owner/inquiries/<id>` when `notify_new_message` is not false. Sets `messages.emailed` when Resend returns an id. |
| `setBlockedDates` | `app/(site)/owner/calendar-actions.ts` | `(listingId, days: string[], blocked: boolean)` | `{ ok, formError? }`. Adds or removes those `YYYY-MM-DD` days on `listing_blocked_dates` and keeps the other days. Another owner gets "That listing is not yours." |
| `confirmAvailability` | `app/(site)/owner/calendar-actions.ts` | `(listingId)` | `{ ok, formError? }`. Owner only. Sets every `availability_windows.last_confirmed_at` for that listing to now and `confirmed_by` to the owner. That is the browse-card "Availability confirmed" stamp. Also sets `listings.calendar_updated_at` to now, which the property page shows as "Calendar updated". Then revalidates `/rentals/<slug>`, `/rentals`, and `/`. Another owner: "That listing is not yours." |
| `saveProfile` | `app/(site)/owner/settings-actions.ts` | `(prev, formData{full_name, phone, notify_new_inquiry, notify_new_message, notify_listing_status})` | `{ ok, success?, formError?, fieldErrors? }`. Each notify field is true only for `true`, `on`, or `1`. An omitted box is false. |
| `requestPasswordReset` | `app/(site)/forgot-password/actions.ts` | `(prev, formData{email})` | `{ ok: true, success: true }` for any well-formed email, including a missing account, a rate limit, and a mail failure. Invalid email: `{ ok: false, fieldErrors: { email: "Add a valid email." } }`. The link is `${SITE_URL}/auth/confirm?token_hash=<hashed>&type=recovery&next=/reset-password`. Subject: "Reset your Furnished Keys password". Five requests per email and twenty per IP each hour. |
| `changeEmail` | `app/(site)/owner/settings-actions.ts` | `(prev, formData{email})` | `{ ok, success?, formError?, fieldErrors?, message? }`. Does not call `updateUser`. Generates `email_change_new` and `email_change_current` links and emails both through Resend. Each link is `/auth/confirm?token_hash=<token>&type=email_change&next=/owner/settings`. Success message stays "Check your inbox to confirm the new email." A trigger copies the confirmed auth email onto `profiles.email`. |
| `changePassword` | `app/(site)/owner/settings-actions.ts` | `(prev, formData{current_password, new_password})` | `{ ok, success?, formError?, fieldErrors? }`. `new_password` is 8–72 characters. `signInWithPassword` runs first, then `updateUser`. |

`/inquiry/[token]` is the only new page. It shows the listing title, the original inquiry, then messages oldest first, and a reply box. The public property calendar already renders blocked days from `listing_blocked_dates`. An inquiry whose nights overlap a blocked day is rejected with "Those dates include a blocked day."

## Admin console loaders and actions

Front End builds the admin screens. These are the server contracts. A caller who is not `profiles.role = 'admin'` makes a loader call `forbidden()` (HTTP 403). Actions return `{ ok: false, formError: "Admins only." }`. After the gate, reads and writes use the service-role client. `rent` is monthly rent in cents.

The review checklist is informational. Approve still uses the submit list (`title`, `description`, `rent`, `min_stay`, `bedroom`, `bathrooms`, `photo`, `cover`). Checklist keys: `photos` (at least 5), `cover`, `description` (trimmed length at least 1, the submit minimum), `rent`, `fees` (at least one `listing_fees` row), `availability` (at least one window), `amenities`, `house_rules`, `address` (street address and both map coordinates).

| Export | File | Args | Returns |
| --- | --- | --- | --- |
| `loadAdminCounts` | `lib/admin-load.ts` | none | `{ review_waiting, leads_new, listings_live, listings_total, inquiries_7d, owners_total }`. `review_waiting` is `pending_review`. `leads_new` is `owner_leads.status = new`. `listings_live` is `approved`. `inquiries_7d` counts inquiries created in the last 7 days. `owners_total` counts `profiles.role = owner`. |
| `loadReviewQueue` | `lib/admin-load.ts` | none | `pending_review` rows, oldest `submitted_at` first. Each: `id`, `title`, `owner_name`, `owner_email`, `city`, `submitted_at`, `cover_url` (signed, or null), `rent`, `beds`, `baths`, `sqft`, `checklist: { key, label, ok }[]`. |
| `loadRecentActivity` | `lib/admin-load.ts` | `limit = 20` (capped at 50) | `{ kind, label, at, href }[]`, newest first. `kind` is `listing_submitted`, `listing_approved`, `inquiry`, `owner_lead`, or `signup`. Hrefs: `/admin/listings/<id>`, `/admin/inquiries/<id>`, `/admin/leads/<id>`, `/admin/users`. |
| `loadAdminListings` | `lib/admin-load.ts` | `{ status? }` | Rows: `id`, `title`, `status`, `owner_name`, `owner_email`, `city`, `rent`, `beds`, `baths`, `sqft`, `submitted_at`, `updated_at`. An unknown status returns `[]`. |
| `loadOwnerLeads` | `lib/admin-load.ts` | `{ status? }` | Rows: `id`, `source`, `source_label`, `status`, `notes`, `interest`, `name`, `email`, `phone`, `address`, `created_at`. `source_label` is `Letter (QR)` when `source` is `letter`, otherwise `/owners`. |
| `loadAdminInquiries` | `lib/admin-load.ts` | none | Rows: `id`, `listing_id`, `listing_title`, `name`, `email`, `phone`, `status`, `move_in`, `move_out`, `message`, `created_at`. |
| `loadAdminUsers` | `lib/admin-load.ts` | none | Rows: `id`, `full_name`, `email`, `role`, `listings_count`, `created_at`, `last_sign_in_at`. |
| `approveListing` | `app/(site)/admin/actions.ts` | `(id)` | `{ ok, success?, formError? }`. Same approve rules, revalidation, and owner email as the review route. Incomplete: `{ ok: false, formError: "Listing is incomplete" }`. |
| `requestChanges` | `app/(site)/admin/actions.ts` | `(prev, formData{listingId, note})` | `{ ok, success?, formError? }`. `note` is 1–4000 characters. Sets `changes_requested`, stores the note, revalidates public pages, and emails the owner when `notify_listing_status` is not false. Empty or oversized note: `{ ok: false, formError: "Write a note between 1 and 4000 characters." }`. |
| `rejectListing` | `app/(site)/admin/actions.ts` | `(prev, formData{listingId, note?})` | `{ ok, success?, formError? }`. `note` is optional, at most 4000 characters. Sets `rejected`, revalidates, and emails the owner. |
| `updateLeadStatus` | `app/(site)/admin/actions.ts` | `(leadId, status)` | `{ ok, success?, formError? }`. `status` is `new`, `contacted`, `qualified`, `onboarded`, or `closed`. Unknown status: `{ ok: false, formError: "Pick a lead status." }`. Missing lead: `{ ok: false, formError: "That lead is not in the inbox." }`. |
| `updateLeadNotes` | `app/(site)/admin/actions.ts` | `(leadId, notes)` | `{ ok, success?, formError? }`. Empty notes clear the column. Over 8000 characters: `{ ok: false, formError: "Keep notes under 8000 characters." }`. |

`listings.submitted_at` is stamped when a listing moves to `pending_review`. Existing pending rows were backfilled from `updated_at`.

## Deferred

Not in this schema:

- **Background checks.** No applicant, screening, or report tables.
- **Booking and calendar.** `availability_windows` is a confirmed range only. No reservations, leases, or nightly calendar.
- **Other feature flags.** Background checks and booking stay off. Until `STRIPE_SECRET_KEY` is set, checkout records a one-year waiver instead of charging. There is no feature-flag table.

Also later: re-review after an edit to an approved listing, and per-listing assignment of FurnishedKeys managers. `fk_managed` is a label. It does not grant every `manager` profile write access to that listing.
