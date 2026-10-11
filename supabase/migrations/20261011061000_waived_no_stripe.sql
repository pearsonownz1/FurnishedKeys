-- Placeholder listing fee used until Stripe is configured.
-- Does not edit earlier migrations.

alter table public.listing_payments drop constraint if exists listing_payments_status_value;
alter table public.listing_payments add constraint listing_payments_status_value check (
  status in (
    'paid',
    'payment_failed',
    'subscription_deleted',
    'cancel_scheduled',
    'cancel_cleared',
    'waived_no_stripe'
  )
);

comment on table public.listing_payments is
  'Stripe listing-fee events and the no-Stripe placeholder waiver, idempotent on stripe_event_id. Service role writes. Owner and admin read.';
