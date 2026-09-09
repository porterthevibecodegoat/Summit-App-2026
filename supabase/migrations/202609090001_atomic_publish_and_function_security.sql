-- Publish a complete event revision in one transaction and keep privileged
-- functions unavailable to browser/mobile clients.

alter function public.current_staff_role()
  set search_path = public, pg_temp;

alter function public.current_staff_has_role(text[])
  set search_path = public, pg_temp;

revoke all on function public.current_staff_role() from public, anon;
revoke all on function public.current_staff_has_role(text[]) from public, anon;
grant execute on function public.current_staff_role() to authenticated, service_role;
grant execute on function public.current_staff_has_role(text[]) to authenticated, service_role;

alter function public.publish_event_snapshot_revision(text, integer, jsonb, text, integer, integer)
  set search_path = public, pg_temp;

revoke all on function public.publish_event_snapshot_revision(text, integer, jsonb, text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.publish_event_snapshot_revision(text, integer, jsonb, text, integer, integer)
  to service_role;

create or replace function public.publish_event_snapshot_revision_v2(
  p_event_id text,
  p_expected_previous_revision integer,
  p_snapshot jsonb,
  p_source text,
  p_changes_count integer,
  p_notification_jobs jsonb,
  p_notify_attendees boolean,
  p_actor_id uuid,
  p_actor_role text,
  p_rollback_of_revision integer
)
returns public.schedule_revisions
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_revision integer;
  next_revision integer;
  inserted_revision public.schedule_revisions;
  requested_job_count integer;
  inserted_job_count integer;
begin
  if p_actor_role not in ('PUBLISHER', 'ADMIN') then
    raise exception 'Publishing requires PUBLISHER or ADMIN role';
  end if;

  if p_source not in ('MANUAL_EDITOR', 'OPERATOR_AI', 'DOCUMENT_IMPORT', 'EMERGENCY_ALERT', 'SYSTEM') then
    raise exception 'Unsupported publication source: %', p_source;
  end if;

  if jsonb_typeof(p_snapshot) <> 'object' then
    raise exception 'Published snapshot must be a JSON object';
  end if;

  if jsonb_typeof(coalesce(p_notification_jobs, '[]'::jsonb)) <> 'array' then
    raise exception 'Notification jobs must be a JSON array';
  end if;

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

  if coalesce(p_snapshot ->> 'revision', '') !~ '^[0-9]+$'
     or (p_snapshot ->> 'revision')::integer <> next_revision then
    raise exception 'Snapshot revision must equal next event revision %', next_revision;
  end if;

  requested_job_count := jsonb_array_length(coalesce(p_notification_jobs, '[]'::jsonb));

  insert into public.schedule_revisions (
    event_id,
    revision,
    previous_revision,
    rollback_of_revision,
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
    p_rollback_of_revision,
    p_source,
    greatest(p_changes_count, 0),
    requested_job_count,
    p_snapshot,
    p_actor_id
  )
  returning * into inserted_revision;

  update public.events
    set content_revision = next_revision,
        updated_at = now()
    where id = p_event_id;

  update public.notification_jobs
    set status = 'superseded',
        updated_at = now()
    where event_id = p_event_id
      and status in ('queued', 'scheduled');

  insert into public.notification_jobs (
    id,
    event_id,
    schedule_item_id,
    schedule_revision,
    audience_scope,
    send_after_utc,
    status,
    idempotency_key,
    source,
    payload
  )
  select
    (job ->> 'id')::uuid,
    p_event_id,
    case
      when exists (
        select 1
        from public.schedule_items item
        where item.id = (job ->> 'schedule_item_id')::uuid
          and item.event_id = p_event_id
      ) then (job ->> 'schedule_item_id')::uuid
      else null
    end,
    next_revision,
    job ->> 'audience_scope',
    (job ->> 'send_after_utc')::timestamptz,
    'scheduled',
    job ->> 'idempotency_key',
    p_source,
    coalesce(job -> 'payload', '{}'::jsonb) || jsonb_build_object(
      'revision', next_revision,
      'scheduleItemId', job ->> 'schedule_item_id',
      'notifyAttendees', p_notify_attendees
    )
  from jsonb_array_elements(coalesce(p_notification_jobs, '[]'::jsonb)) as job
  on conflict (idempotency_key) do nothing;

  get diagnostics inserted_job_count = row_count;

  update public.schedule_drafts
    set status = 'PUBLISHED',
        updated_by = p_actor_id,
        updated_at = now()
    where event_id = p_event_id
      and status <> 'ARCHIVED';

  insert into public.production_audit_entries (
    event_id,
    actor_id,
    actor_role,
    source,
    action,
    previous_value,
    new_value,
    publication_revision,
    notification_consequences
  )
  values (
    p_event_id,
    p_actor_id,
    p_actor_role,
    p_source,
    case when p_rollback_of_revision is null
      then 'PUBLISH_EVENT_SNAPSHOT_REVISION'
      else 'ROLLBACK_EVENT_SNAPSHOT_REVISION'
    end,
    jsonb_build_object('revision', current_revision),
    jsonb_build_object(
      'revision', next_revision,
      'changesCount', greatest(p_changes_count, 0),
      'rollbackOfRevision', p_rollback_of_revision
    ),
    next_revision,
    jsonb_build_array(jsonb_build_object(
      'requestedJobs', requested_job_count,
      'insertedJobs', inserted_job_count,
      'notifyAttendees', p_notify_attendees
    ))
  );

  return inserted_revision;
end;
$$;

revoke all on function public.publish_event_snapshot_revision_v2(
  text, integer, jsonb, text, integer, jsonb, boolean, uuid, text, integer
) from public, anon, authenticated;

grant execute on function public.publish_event_snapshot_revision_v2(
  text, integer, jsonb, text, integer, jsonb, boolean, uuid, text, integer
) to service_role;
