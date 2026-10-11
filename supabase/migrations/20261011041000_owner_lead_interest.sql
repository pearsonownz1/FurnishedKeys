-- Follow-up to 20261011033000_init.sql. Do not edit the init file.
-- owner_leads.interest is how an owner wants to list. Nullable, no default.
-- source stays text not null default 'web'. owner_leads_source_format is
-- source ~ '^[a-z0-9_-]{1,40}$', which already accepts 'letter' (and 'mailer').
-- It is a format check, not a closed value list, so this migration does not
-- replace it. Anon INSERT is a table-level grant plus a policy that only
-- requires status = 'new' and assigned_to is null, so interest and source
-- are both writable by anon.

do $$ begin
  create type public.owner_lead_interest as enum (
    'list_myself',
    'full_management',
    'not_sure'
  );
exception when duplicate_object then null;
end $$;

alter table public.owner_leads
  add column if not exists interest public.owner_lead_interest;

comment on column public.owner_leads.interest is
  'list_myself, full_management, or not_sure. Null when the form omits it. No default.';

comment on column public.owner_leads.source is
  'Acquisition slug. Default web. letter matches owner_leads_source_format.';
