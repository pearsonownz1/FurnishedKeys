# Furnished Keys

Marketplace for furnished monthly and extended-stay rentals — ADUs, apartments, rooms, and houses — launching in Bend and Deschutes County, Oregon, then across the Northwest.

**Furnished homes. Flexible stays.** Find a furnished place for your next chapter—or let us help manage yours.

Renters search and send an inquiry. Owners list a property for free, or ask for a management consultation. A commission on rented listings comes later. Listing submission lives under `app/api`. Booking is not built yet.

## Stack

- Next.js (App Router) + TypeScript + Tailwind CSS
- ESLint and Vitest
- `@supabase/ssr` browser and server clients

Design tokens live in `app/globals.css` (warm white background, pine `#2e4a3b`, clay only as a tiny accent, 2px radius). Instrument Serif and Inter load through `next/font`. The soft shadow is reserved for the search bar.

## Scripts

```bash
npm run dev
npm run lint
npm test
npm run build
```

## Environment

Copy `.env.example` for local work. Production values are set on the Vercel project `furnishedkeys`:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server only)
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, optional `STRIPE_LISTING_PRICE_ID` (without the secret key, checkout waives the fee for one year)
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (Embedded Checkout)

`lib/supabase/client.ts` is the browser client. `lib/supabase/server.ts` is the server client (cookie adapter, no session middleware yet).

## Locations

Markets come from `lib/locations.ts`, shaped like the `locations` table: `id`, `slug`, `name`, `region`, `state`, `country`, `active`, `sort`. The seed is Bend, then Deschutes County. Components read that module. Do not hard-code a city name in the UI.

## Homepage

The homepage is a full-bleed photo, a search bar, two paths, three demo listing cards, how monthly stays work, and an owner band. Search submits to `/rentals` with `where`, `move_in`, `stay_months`, and `budget_cents`.

Listing cards read `lib/listings.ts`. Fixtures use the same columns as `listings`, `listing_fees`, `listing_photos`, and `availability_windows`, every one flagged `is_demo`. Rent is separate from each fee. “Availability confirmed” comes from `last_confirmed_at`. Photos in `public/demo/` are AI stand-ins for development only, served with `next/image`.

## Backend boundary

Schema, RLS, generated types, and seeds belong to Backend:

- `supabase/`
- `lib/db/types.ts`

Do not add files at those paths from the front end. Listing fixtures in `lib/listings.ts` (homepage branch) match the listing tables so they can be swapped for a Supabase select later.

## Not in this version

Inquiry threads and booking. The yearly listing fee is `POST /api/listings/[id]/checkout` (Embedded Checkout).
