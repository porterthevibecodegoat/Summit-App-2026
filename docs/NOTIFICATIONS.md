# Notifications

Expo notification packages and EAS configuration are present in the mobile app. Push delivery is disabled by default through config.

The starter Supabase migration includes `notification_jobs` with idempotency keys, schedule revision linkage, status, attempts, and error fields.

The local staff portal adapter recalculates reminder job metadata whenever a reviewed draft schedule is published through `POST /api/live-ops/publish`. Those jobs are visible in the staff portal at `http://localhost:3000/notifications` and through `GET /api/notifications/jobs`.

The mobile app includes a guarded Expo push token registration path. It only runs when `ENABLE_PUSH_DELIVERY=true`, validates registrations through `POST /api/devices/register`, and requires a real EAS project id.

No real push notification is sent by this scaffold. Production dispatch requires explicit credentials, a server-side Expo/APNs worker, Supabase audit records, opt-in/permission handling, retries, and explicit authorization.

## Dispatch Preflight

The staff API includes `POST /api/notifications/dispatch` as a guarded production preflight.

It intentionally returns `BLOCKED` unless all of the following are true:

- `ENABLE_PUSH_DELIVERY=true`
- `ENABLE_NOTIFICATION_DISPATCH=true`
- Real EAS project ID is configured
- Expo/APNs credentials are configured
- Server dispatch worker implementation has been completed and tested

This prevents accidental attendee notifications during prototype work.
