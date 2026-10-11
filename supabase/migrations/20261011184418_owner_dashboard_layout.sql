-- Designer layout follow-up: declined inquiries, per-event mail toggles,
-- and a message flag set only after Resend accepts the send.
-- inquiry_status gains 'declined'. The new value is not used in this file.
-- Anon inserts still require status = 'new'.

alter type public.inquiry_status add value if not exists 'declined';

alter table public.messages
  add column if not exists emailed boolean not null default false;

comment on column public.messages.emailed is
  'True only after Resend accepts the email to the other party. Stays false when the send is skipped or fails. Owners cannot set it.';

-- Signed-in inserts always store emailed = false. Only the service role
-- (and other guard bypass roles) can set it after the send is accepted.
create or replace function private.enforce_message_emailed()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if private.listing_guard_bypass() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.emailed := false;
    return new;
  end if;

  if new.emailed is distinct from old.emailed then
    raise exception 'Only the server can mark a message emailed'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists messages_enforce_emailed on public.messages;
create trigger messages_enforce_emailed
  before insert or update on public.messages
  for each row
  execute function private.enforce_message_emailed();

revoke all on function private.enforce_message_emailed() from public;
grant execute on function private.enforce_message_emailed() to anon, authenticated, service_role;

alter table public.profiles
  add column if not exists notify_new_inquiry boolean not null default true,
  add column if not exists notify_new_message boolean not null default true,
  add column if not exists notify_listing_status boolean not null default true;

comment on column public.profiles.notify_new_inquiry is
  'When false, skip new-inquiry emails to this owner.';

comment on column public.profiles.notify_new_message is
  'When false, skip renter-message emails to this owner.';

comment on column public.profiles.notify_listing_status is
  'When false, skip listing approved, changes-requested, and rejected emails.';

-- Copy the old single toggle, then drop it. A false notify_email turns all three off.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'notify_email'
  ) then
    update public.profiles
    set
      notify_new_inquiry = notify_email,
      notify_new_message = notify_email,
      notify_listing_status = notify_email;
    alter table public.profiles drop column notify_email;
  end if;
end $$;
