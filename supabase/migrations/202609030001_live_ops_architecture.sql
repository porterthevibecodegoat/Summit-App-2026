create table if not exists public.staff_profiles (
  user_id uuid primary key,
  display_name text not null default '',
  role text not null check (role in ('VIEWER', 'EDITOR', 'PUBLISHER', 'ADMIN')),
  emergency_broadcast_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.speakers (
  id uuid primary key default gen_random_uuid(),
  event_id text not null references public.events(id) on delete cascade,
  name text not null,
  role text not null default '',
  bio text not null default '',
  headshot_url text,
  published boolean not null default false,
  revision integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.schedule_drafts (
  id uuid primary key default gen_random_uuid(),
  event_id text not null references public.events(id) on delete cascade,
  base_revision integer not null,
  title text not null,
  status text not null check (status in ('DRAFT', 'NEEDS_REVIEW', 'VALIDATED', 'PUBLISHED', 'ARCHIVED')),
  working_snapshot jsonb not null,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.event_change_proposals (
  id uuid primary key default gen_random_uuid(),
  event_id text not null references public.events(id) on delete cascade,
  draft_id uuid references public.schedule_drafts(id) on delete set null,
  source text not null check (source in ('MANUAL_EDITOR', 'OPERATOR_AI', 'DOCUMENT_IMPORT', 'EMERGENCY_ALERT', 'SYSTEM')),
  ai_system text check (ai_system in ('CURRENT_STATE_AI', 'EVENT_OPERATOR_AI', 'IMPORT_AI')),
  command_text text,
  operations jsonb not null default '[]'::jsonb,
  validation_messages jsonb not null default '[]'::jsonb,
  notification_impact jsonb not null default '[]'::jsonb,
  status text not null check (status in ('DRAFT', 'NEEDS_REVIEW', 'VALIDATED', 'REJECTED', 'PUBLISHED')),
  requires_human_approval boolean not null default true check (requires_human_approval = true),
  created_by uuid,
  reviewed_by uuid,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create table if not exists public.document_import_jobs (
  id uuid primary key default gen_random_uuid(),
  event_id text not null references public.events(id) on delete cascade,
  file_name text not null,
  file_type text not null check (file_type in ('PDF', 'DOCX', 'XLSX', 'CSV', 'TXT', 'IMAGE', 'UNKNOWN')),
  storage_path text not null,
  status text not null check (status in ('UPLOADED', 'READING', 'EXTRACTING', 'READY_FOR_REVIEW', 'FAILED', 'PUBLISHED')),
  detected_event_count integer not null default 0,
  added_count integer not null default 0,
  modified_count integer not null default 0,
  removed_count integer not null default 0,
  requires_review_count integer not null default 0,
  extracted_snapshot jsonb,
  diff jsonb not null default '{}'::jsonb,
  error_message text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.schedule_revisions (
  id uuid primary key default gen_random_uuid(),
  event_id text not null references public.events(id) on delete cascade,
  revision integer not null,
  previous_revision integer,
  rollback_of_revision integer,
  source text not null check (source in ('MANUAL_EDITOR', 'OPERATOR_AI', 'DOCUMENT_IMPORT', 'EMERGENCY_ALERT', 'SYSTEM')),
  changes_count integer not null default 0,
  notification_jobs_updated integer not null default 0,
  snapshot jsonb not null,
  published_by uuid,
  published_at timestamptz not null default now(),
  unique (event_id, revision)
);

create table if not exists public.production_audit_entries (
  id uuid primary key default gen_random_uuid(),
  event_id text not null references public.events(id) on delete cascade,
  actor_id uuid,
  actor_role text not null check (actor_role in ('VIEWER', 'EDITOR', 'PUBLISHER', 'ADMIN')),
  source text not null check (source in ('MANUAL_EDITOR', 'OPERATOR_AI', 'DOCUMENT_IMPORT', 'EMERGENCY_ALERT', 'SYSTEM')),
  action text not null,
  previous_value jsonb,
  new_value jsonb,
  proposal_id uuid references public.event_change_proposals(id) on delete set null,
  document_import_id uuid references public.document_import_jobs(id) on delete set null,
  publication_revision integer,
  notification_consequences jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.attendee_device_registrations (
  id uuid primary key default gen_random_uuid(),
  event_id text not null references public.events(id) on delete cascade,
  attendee_id uuid,
  expo_push_token text not null,
  audience_groups text[] not null default '{}',
  platform text not null check (platform in ('ios', 'android')),
  app_version text not null,
  last_seen_at timestamptz not null default now(),
  disabled_at timestamptz,
  unique (event_id, expo_push_token)
);

alter table public.notification_jobs
  add column if not exists supersedes_job_id uuid references public.notification_jobs(id),
  add column if not exists delivered_at timestamptz,
  add column if not exists payload jsonb not null default '{}'::jsonb,
  add column if not exists source text not null default 'SYSTEM'
    check (source in ('MANUAL_EDITOR', 'OPERATOR_AI', 'DOCUMENT_IMPORT', 'EMERGENCY_ALERT', 'SYSTEM'));

alter table public.staff_profiles enable row level security;
alter table public.speakers enable row level security;
alter table public.schedule_drafts enable row level security;
alter table public.event_change_proposals enable row level security;
alter table public.document_import_jobs enable row level security;
alter table public.schedule_revisions enable row level security;
alter table public.production_audit_entries enable row level security;
alter table public.attendee_device_registrations enable row level security;

create policy "published speakers are readable"
  on public.speakers for select using (published = true);

create or replace function public.publish_event_snapshot_revision(
  p_event_id text,
  p_expected_previous_revision integer,
  p_snapshot jsonb,
  p_source text,
  p_changes_count integer,
  p_notification_jobs_updated integer
)
returns public.schedule_revisions
language plpgsql
security definer
as $$
declare
  current_revision integer;
  next_revision integer;
  inserted_revision public.schedule_revisions;
begin
  select content_revision
    into current_revision
    from public.events
    where id = p_event_id
    for update;

  if current_revision is null then
    raise exception 'Event % not found', p_event_id;
  end if;

  if current_revision <> p_expected_previous_revision then
    raise exception 'Revision conflict: expected %, found %', p_expected_previous_revision, current_revision;
  end if;

  next_revision := current_revision + 1;

  insert into public.schedule_revisions (
    event_id,
    revision,
    previous_revision,
    source,
    changes_count,
    notification_jobs_updated,
    snapshot,
    published_by
  )
  values (
    p_event_id,
    next_revision,
    current_revision,
    p_source,
    p_changes_count,
    p_notification_jobs_updated,
    p_snapshot,
    null
  )
  returning * into inserted_revision;

  update public.events
    set content_revision = next_revision,
        updated_at = now()
    where id = p_event_id;

  insert into public.production_audit_entries (
    event_id,
    actor_role,
    source,
    action,
    previous_value,
    new_value,
    publication_revision
  )
  values (
    p_event_id,
    'PUBLISHER',
    p_source,
    'PUBLISH_EVENT_SNAPSHOT_REVISION',
    jsonb_build_object('revision', current_revision),
    jsonb_build_object('revision', next_revision),
    next_revision
  );

  return inserted_revision;
end;
$$;
