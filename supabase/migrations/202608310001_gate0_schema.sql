create extension if not exists "pgcrypto";

create table if not exists public.events (
  id text primary key,
  name text not null,
  organization_name text not null,
  time_zone text not null,
  starts_on date,
  ends_on date,
  demo boolean not null default true,
  content_revision integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.locations (
  id uuid primary key default gen_random_uuid(),
  event_id text not null references public.events(id) on delete cascade,
  name text not null,
  description text not null default '',
  map_x numeric not null check (map_x >= 0 and map_x <= 1),
  map_y numeric not null check (map_y >= 0 and map_y <= 1),
  published boolean not null default false,
  revision integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.schedule_items (
  id uuid primary key default gen_random_uuid(),
  event_id text not null references public.events(id) on delete cascade,
  title text not null,
  short_title text not null,
  summary text not null,
  description text not null,
  start_utc timestamptz not null,
  end_utc timestamptz not null,
  event_time_zone text not null,
  day_order integer not null,
  location_id uuid not null references public.locations(id),
  status text not null check (status in ('scheduled', 'delayed', 'moved', 'canceled', 'completed')),
  visibility_scope text not null,
  eligibility_scope text not null,
  notification_scope text not null,
  notification_offsets_minutes integer[] not null default '{}',
  featured boolean not null default false,
  published boolean not null default false,
  revision integer not null default 1,
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  check (end_utc > start_utc)
);

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  event_id text not null references public.events(id) on delete cascade,
  title text not null,
  body text not null,
  audience_scope text not null,
  urgency text not null check (urgency in ('routine', 'important', 'urgent')),
  published boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.notification_jobs (
  id uuid primary key default gen_random_uuid(),
  event_id text not null references public.events(id) on delete cascade,
  schedule_item_id uuid references public.schedule_items(id),
  schedule_revision integer,
  audience_scope text not null,
  send_after_utc timestamptz not null,
  status text not null check (status in ('queued', 'scheduled', 'processing', 'accepted', 'failed', 'canceled', 'superseded')),
  idempotency_key text not null unique,
  attempt_count integer not null default 0,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  event_id text not null references public.events(id) on delete cascade,
  actor_id uuid,
  action text not null,
  source text not null check (source in ('manual', 'ai_proposal', 'system')),
  before_value jsonb,
  after_value jsonb,
  created_at timestamptz not null default now()
);

alter table public.events enable row level security;
alter table public.locations enable row level security;
alter table public.schedule_items enable row level security;
alter table public.announcements enable row level security;
alter table public.notification_jobs enable row level security;
alter table public.audit_logs enable row level security;

create policy "published event metadata is readable"
  on public.events for select using (true);

create policy "published locations are readable"
  on public.locations for select using (published = true);

create policy "published public schedule is readable"
  on public.schedule_items for select using (published = true and visibility_scope = 'public');

create policy "published announcements are readable"
  on public.announcements for select using (published = true);
