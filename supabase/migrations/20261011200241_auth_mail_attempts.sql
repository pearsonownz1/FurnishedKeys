-- Password-reset rate limit. Service role only, so the rows cannot be used
-- to learn which addresses have asked for a reset.

create table if not exists public.auth_mail_attempts (
  id uuid primary key default gen_random_uuid(),
  bucket text not null,
  subject text not null,
  created_at timestamptz not null default pg_catalog.now(),
  constraint auth_mail_attempts_bucket check (bucket in ('email', 'ip')),
  constraint auth_mail_attempts_subject_length check (char_length(subject) between 1 and 320)
);

create index if not exists auth_mail_attempts_lookup_idx
  on public.auth_mail_attempts (bucket, subject, created_at desc);

alter table public.auth_mail_attempts enable row level security;

revoke all on table public.auth_mail_attempts from public, anon, authenticated;
grant select, insert, delete on table public.auth_mail_attempts to service_role;

comment on table public.auth_mail_attempts is
  'Password-reset requests. Five per email and twenty per IP each hour. Service role only.';
