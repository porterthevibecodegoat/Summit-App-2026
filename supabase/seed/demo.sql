insert into public.events (id, name, organization_name, time_zone, starts_on, ends_on, demo, content_revision)
values ('not-alone-summit-2026-demo', 'Not Alone Summit', 'Inspiring Children Foundation', 'America/Los_Angeles', '2026-11-02', '2026-11-06', true, 1)
on conflict (id) do nothing;

insert into public.locations (id, event_id, name, description, map_x, map_y, published)
values
  ('65f7e5d1-01bc-4495-813b-929f86503fcf', 'not-alone-summit-2026-demo', 'Grand Ballroom', 'DEMO location placeholder for the primary stage.', 0.48, 0.42, true),
  ('8abdc397-e741-405a-82b0-458ab6b6fb1b', 'not-alone-summit-2026-demo', 'Founders Salon', 'DEMO restricted-area placeholder.', 0.71, 0.35, true)
on conflict (id) do nothing;

insert into public.schedule_items (
  id, event_id, title, short_title, summary, description, start_utc, end_utc,
  event_time_zone, day_order, location_id, status, visibility_scope, eligibility_scope,
  notification_scope, notification_offsets_minutes, featured, published, published_at
) values
  (
    '78f7af0b-9146-4d65-b848-4105f6a5b209',
    'not-alone-summit-2026-demo',
    'Steve Wozniak Speaker Panel',
    'Speaker Panel',
    'DEMO session label for schedule and notification testing.',
    'DEMO content. Final speaker, timing, and venue details require approval.',
    '2026-11-02T18:00:00Z',
    '2026-11-02T19:00:00Z',
    'America/Los_Angeles',
    1,
    '65f7e5d1-01bc-4495-813b-929f86503fcf',
    'scheduled',
    'public',
    'all_attendees',
    'all_attendees',
    array[60],
    true,
    true,
    now()
  )
on conflict (id) do nothing;
