-- Owner dashboard backend: renter thread tokens, draft step, notify preference.
-- Renter links rotate. Only the sha256 of the raw token is stored. Each owner
-- reply replaces the hash, so an older /inquiry/<token> link stops working.
-- Renters never touch messages or inquiries directly. The server checks the
-- hash with the service role, then inserts the renter message.

alter table public.messages
  add column if not exists sender_role text not null default 'owner';

alter table public.messages
  drop constraint if exists messages_sender_role_check;

alter table public.messages
  add constraint messages_sender_role_check
  check (sender_role in ('owner', 'renter'));

comment on column public.messages.sender_role is
  'owner for a signed-in reply. renter only when the service role inserts after the token hash matches.';

comment on column public.messages.sender_id is
  'Owner profile for an owner reply. Null for a renter reply. Already nullable.';

alter table public.inquiries
  add column if not exists renter_token_hash text,
  add column if not exists last_message_at timestamptz,
  add column if not exists owner_unread integer not null default 0,
  add column if not exists renter_unread integer not null default 0;

alter table public.inquiries
  drop constraint if exists inquiries_renter_token_hash_format;

alter table public.inquiries
  add constraint inquiries_renter_token_hash_format
  check (renter_token_hash is null or renter_token_hash ~ '^[0-9a-f]{64}$');

alter table public.inquiries
  drop constraint if exists inquiries_owner_unread_nonnegative;

alter table public.inquiries
  add constraint inquiries_owner_unread_nonnegative
  check (owner_unread >= 0);

alter table public.inquiries
  drop constraint if exists inquiries_renter_unread_nonnegative;

alter table public.inquiries
  add constraint inquiries_renter_unread_nonnegative
  check (renter_unread >= 0);

create unique index if not exists inquiries_renter_token_hash_key
  on public.inquiries (renter_token_hash);

comment on column public.inquiries.renter_token_hash is
  'sha256 hex of the current renter link token. The raw token is only in the latest owner reply email.';

update public.inquiries
set last_message_at = created_at
where last_message_at is null;

update public.inquiries
set owner_unread = 1
where status = 'new' and owner_unread = 0;

create index if not exists messages_inquiry_created_idx
  on public.messages (inquiry_id, created_at);

-- Owners may mark a thread read and the server may bump unread counts.
-- They cannot change the token hash. Service role bypasses this.
create or replace function private.enforce_inquiry_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if private.listing_guard_bypass() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.owner_unread := 1;
    new.renter_unread := 0;
    new.last_message_at := pg_catalog.now();
    return new;
  end if;

  if new.renter_token_hash is distinct from old.renter_token_hash then
    raise exception 'Only the server can rotate the renter link'
      using errcode = '42501';
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

drop trigger if exists inquiries_enforce_insert on public.inquiries;
create trigger inquiries_enforce_insert
  before insert on public.inquiries
  for each row
  execute function private.enforce_inquiry_update();

-- Signed-in users insert owner replies only. Renter rows are service role.
drop policy if exists messages_insert on public.messages;
create policy messages_insert
  on public.messages
  for insert
  to authenticated
  with check (
    sender_role = 'owner'
    and sender_id = (select auth.uid())
    and (select private.can_read_inquiry(inquiry_id))
  );

revoke all on table public.messages from anon;

alter table public.listings
  add column if not exists setup_step text;

alter table public.listings
  drop constraint if exists listings_setup_step_check;

alter table public.listings
  add constraint listings_setup_step_check
  check (
    setup_step is null
    or setup_step in (
      'basics',
      'rooms',
      'photos',
      'description',
      'goodFor',
      'amenities',
      'rent',
      'availability',
      'rules',
      'review'
    )
  );

comment on column public.listings.setup_step is
  'Wizard step last saved. Resume links use /owners/listings/<id>/setup?step=<setup_step>.';

grant select (setup_step) on table public.listings to authenticated;

alter table public.profiles
  add column if not exists notify_email boolean not null default true;

comment on column public.profiles.notify_email is
  'When false, skip inquiry notices and renter-message notices to this owner. Review mail still sends.';

-- After the owner confirms a new auth email, keep the profile address in step.
create or replace function private.sync_profile_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email is distinct from old.email then
    update public.profiles
    set email = new.email
    where id = new.id;
  end if;
  return new;
end;
$$;

revoke all on function private.sync_profile_email() from public;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'supabase_auth_admin') then
    grant execute on function private.sync_profile_email() to supabase_auth_admin;
  end if;
end $$;

drop trigger if exists sync_profile_email on auth.users;
create trigger sync_profile_email
  after update of email on auth.users
  for each row
  execute function private.sync_profile_email();
