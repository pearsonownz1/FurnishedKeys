-- Central Oregon markets. sort_order feeds the Where dropdown.
-- parent_id is the county row a city belongs to. Deschutes County is the
-- region option and stays last. Crook and Jefferson have no county row.

alter table public.locations
  add column if not exists sort_order integer not null default 0;

alter table public.locations
  add column if not exists parent_id uuid references public.locations (id) on delete restrict;

alter table public.locations
  add column if not exists lat numeric(9, 6);

alter table public.locations
  add column if not exists lng numeric(9, 6);

comment on column public.locations.sort_order is
  'Where-dropdown order. Bend is 1. Deschutes County, the region option, is last.';
comment on column public.locations.parent_id is
  'County location this city belongs to. Null for a county row and for a city with no county row.';
comment on column public.locations.lat is
  'Map center latitude. Pair with lng.';
comment on column public.locations.lng is
  'Map center longitude. Pair with lat.';

alter table public.locations drop constraint if exists locations_center_pair;
alter table public.locations add constraint locations_center_pair check (
  (lat is null and lng is null) or (lat is not null and lng is not null)
);

alter table public.locations drop constraint if exists locations_lat_range;
alter table public.locations add constraint locations_lat_range check (
  lat is null or lat between -90 and 90
);

alter table public.locations drop constraint if exists locations_lng_range;
alter table public.locations add constraint locations_lng_range check (
  lng is null or lng between -180 and 180
);

alter table public.locations drop constraint if exists locations_parent_not_self;
alter table public.locations add constraint locations_parent_not_self check (
  parent_id is distinct from id
);

create index if not exists locations_active_sort_order_idx
  on public.locations (active, sort_order);

create index if not exists locations_parent_id_idx
  on public.locations (parent_id);

insert into public.locations (
  id, slug, name, region, state, country, active, sort, sort_order, parent_id, lat, lng
)
values
  (
    'c3a1e0b2-4d5f-4a6b-8c7d-111111111103',
    'redmond',
    'Redmond',
    'Deschutes County',
    'OR',
    'US',
    true,
    2,
    2,
    'c3a1e0b2-4d5f-4a6b-8c7d-111111111102',
    44.272621,
    -121.173921
  ),
  (
    'c3a1e0b2-4d5f-4a6b-8c7d-111111111104',
    'prineville',
    'Prineville',
    'Crook County',
    'OR',
    'US',
    true,
    3,
    3,
    null,
    44.299849,
    -120.834481
  ),
  (
    'c3a1e0b2-4d5f-4a6b-8c7d-111111111105',
    'madras',
    'Madras',
    'Jefferson County',
    'OR',
    'US',
    true,
    4,
    4,
    null,
    44.633452,
    -121.129494
  ),
  (
    'c3a1e0b2-4d5f-4a6b-8c7d-111111111106',
    'la-pine',
    'La Pine',
    'Deschutes County',
    'OR',
    'US',
    true,
    5,
    5,
    'c3a1e0b2-4d5f-4a6b-8c7d-111111111102',
    43.670398,
    -121.503064
  ),
  (
    'c3a1e0b2-4d5f-4a6b-8c7d-111111111107',
    'sisters',
    'Sisters',
    'Deschutes County',
    'OR',
    'US',
    true,
    6,
    6,
    'c3a1e0b2-4d5f-4a6b-8c7d-111111111102',
    44.290953,
    -121.549171
  ),
  (
    'c3a1e0b2-4d5f-4a6b-8c7d-111111111108',
    'sunriver',
    'Sunriver',
    'Deschutes County',
    'OR',
    'US',
    true,
    7,
    7,
    'c3a1e0b2-4d5f-4a6b-8c7d-111111111102',
    43.872349,
    -121.438171
  ),
  (
    'c3a1e0b2-4d5f-4a6b-8c7d-111111111109',
    'terrebonne',
    'Terrebonne',
    'Deschutes County',
    'OR',
    'US',
    true,
    8,
    8,
    'c3a1e0b2-4d5f-4a6b-8c7d-111111111102',
    44.353179,
    -121.178128
  ),
  (
    'c3a1e0b2-4d5f-4a6b-8c7d-111111111110',
    'tumalo',
    'Tumalo',
    'Deschutes County',
    'OR',
    'US',
    true,
    9,
    9,
    'c3a1e0b2-4d5f-4a6b-8c7d-111111111102',
    44.149557,
    -121.331428
  )
on conflict (slug) do update
set
  name = excluded.name,
  region = excluded.region,
  state = excluded.state,
  country = excluded.country,
  active = excluded.active,
  sort = excluded.sort,
  sort_order = excluded.sort_order,
  parent_id = excluded.parent_id,
  lat = excluded.lat,
  lng = excluded.lng;

update public.locations
set
  sort = 1,
  sort_order = 1,
  parent_id = 'c3a1e0b2-4d5f-4a6b-8c7d-111111111102',
  lat = 44.058172,
  lng = -121.315308,
  region = 'Deschutes County'
where slug = 'bend';

update public.locations
set
  sort = 10,
  sort_order = 10,
  parent_id = null,
  lat = 43.915000,
  lng = -121.300000,
  region = 'Central Oregon'
where slug = 'deschutes-county';
