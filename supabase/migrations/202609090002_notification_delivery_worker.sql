create table if not exists public.notification_delivery_attempts (
  id uuid primary key default gen_random_uuid(),
  event_id text not null references public.events(id) on delete cascade,
  notification_job_id uuid not null references public.notification_jobs(id) on delete cascade,
  device_registration_id uuid not null references public.attendee_device_registrations(id) on delete cascade,
  attempt_number integer not null check (attempt_number > 0),
  status text not null check (status in ('accepted', 'delivered', 'failed')),
  expo_ticket_id text,
  error_code text,
  error_message text,
  accepted_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (notification_job_id, device_registration_id)
);

create index if not exists notification_delivery_attempts_pending_receipt_idx
  on public.notification_delivery_attempts (status, accepted_at)
  where status = 'accepted' and expo_ticket_id is not null;

create index if not exists notification_jobs_dispatch_idx
  on public.notification_jobs (event_id, status, send_after_utc, attempt_count);

alter table public.notification_delivery_attempts enable row level security;

drop policy if exists "staff can read notification delivery attempts"
  on public.notification_delivery_attempts;
create policy "staff can read notification delivery attempts"
  on public.notification_delivery_attempts for select
  using (public.current_staff_has_role(array['VIEWER', 'EDITOR', 'PUBLISHER', 'ADMIN']));

create or replace function public.claim_due_notification_jobs(
  p_event_id text,
  p_now timestamptz,
  p_limit integer
)
returns setof public.notification_jobs
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  return query
  with claimable as (
    select job.id
    from public.notification_jobs job
    where job.event_id = p_event_id
      and job.send_after_utc <= p_now
      and (
        job.status = 'scheduled'
        or (
          job.status = 'failed'
          and job.attempt_count < 3
          and job.updated_at <= p_now - interval '2 minutes'
        )
      )
    order by job.send_after_utc asc
    for update skip locked
    limit greatest(least(p_limit, 100), 1)
  )
  update public.notification_jobs job
    set status = 'processing',
        attempt_count = job.attempt_count + 1,
        last_error = null,
        updated_at = p_now
    from claimable
    where job.id = claimable.id
    returning job.*;
end;
$$;

revoke all on function public.claim_due_notification_jobs(text, timestamptz, integer)
  from public, anon, authenticated;
grant execute on function public.claim_due_notification_jobs(text, timestamptz, integer)
  to service_role;
