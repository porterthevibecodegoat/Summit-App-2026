create or replace function public.current_staff_role()
returns text
language sql
stable
security definer
as $$
  select role
  from public.staff_profiles
  where user_id = auth.uid()
  limit 1
$$;

create or replace function public.current_staff_has_role(allowed_roles text[])
returns boolean
language sql
stable
security definer
as $$
  select coalesce(public.current_staff_role() = any(allowed_roles), false)
$$;

drop policy if exists "staff can read own profile" on public.staff_profiles;
create policy "staff can read own profile"
  on public.staff_profiles for select
  using (user_id = auth.uid());

drop policy if exists "admins can manage staff profiles" on public.staff_profiles;
create policy "admins can manage staff profiles"
  on public.staff_profiles for all
  using (public.current_staff_has_role(array['ADMIN']))
  with check (public.current_staff_has_role(array['ADMIN']));

drop policy if exists "staff can read schedule drafts" on public.schedule_drafts;
create policy "staff can read schedule drafts"
  on public.schedule_drafts for select
  using (public.current_staff_has_role(array['VIEWER', 'EDITOR', 'PUBLISHER', 'ADMIN']));

drop policy if exists "editors can write schedule drafts" on public.schedule_drafts;
create policy "editors can write schedule drafts"
  on public.schedule_drafts for insert
  with check (public.current_staff_has_role(array['EDITOR', 'PUBLISHER', 'ADMIN']));

drop policy if exists "editors can update schedule drafts" on public.schedule_drafts;
create policy "editors can update schedule drafts"
  on public.schedule_drafts for update
  using (public.current_staff_has_role(array['EDITOR', 'PUBLISHER', 'ADMIN']))
  with check (public.current_staff_has_role(array['EDITOR', 'PUBLISHER', 'ADMIN']));

drop policy if exists "staff can read change proposals" on public.event_change_proposals;
create policy "staff can read change proposals"
  on public.event_change_proposals for select
  using (public.current_staff_has_role(array['VIEWER', 'EDITOR', 'PUBLISHER', 'ADMIN']));

drop policy if exists "editors can create change proposals" on public.event_change_proposals;
create policy "editors can create change proposals"
  on public.event_change_proposals for insert
  with check (public.current_staff_has_role(array['EDITOR', 'PUBLISHER', 'ADMIN']));

drop policy if exists "publishers can review change proposals" on public.event_change_proposals;
create policy "publishers can review change proposals"
  on public.event_change_proposals for update
  using (public.current_staff_has_role(array['PUBLISHER', 'ADMIN']))
  with check (public.current_staff_has_role(array['PUBLISHER', 'ADMIN']));

drop policy if exists "staff can read document imports" on public.document_import_jobs;
create policy "staff can read document imports"
  on public.document_import_jobs for select
  using (public.current_staff_has_role(array['VIEWER', 'EDITOR', 'PUBLISHER', 'ADMIN']));

drop policy if exists "editors can create document imports" on public.document_import_jobs;
create policy "editors can create document imports"
  on public.document_import_jobs for insert
  with check (public.current_staff_has_role(array['EDITOR', 'PUBLISHER', 'ADMIN']));

drop policy if exists "staff can read schedule revisions" on public.schedule_revisions;
create policy "staff can read schedule revisions"
  on public.schedule_revisions for select
  using (public.current_staff_has_role(array['VIEWER', 'EDITOR', 'PUBLISHER', 'ADMIN']));

drop policy if exists "staff can read production audit entries" on public.production_audit_entries;
create policy "staff can read production audit entries"
  on public.production_audit_entries for select
  using (public.current_staff_has_role(array['VIEWER', 'EDITOR', 'PUBLISHER', 'ADMIN']));

drop policy if exists "staff can read notification jobs" on public.notification_jobs;
create policy "staff can read notification jobs"
  on public.notification_jobs for select
  using (public.current_staff_has_role(array['VIEWER', 'EDITOR', 'PUBLISHER', 'ADMIN']));

drop policy if exists "publishers can manage notification jobs" on public.notification_jobs;
create policy "publishers can manage notification jobs"
  on public.notification_jobs for all
  using (public.current_staff_has_role(array['PUBLISHER', 'ADMIN']))
  with check (public.current_staff_has_role(array['PUBLISHER', 'ADMIN']));

drop policy if exists "server can register attendee devices" on public.attendee_device_registrations;

drop policy if exists "staff can read attendee device registrations" on public.attendee_device_registrations;
create policy "staff can read attendee device registrations"
  on public.attendee_device_registrations for select
  using (public.current_staff_has_role(array['PUBLISHER', 'ADMIN']));
