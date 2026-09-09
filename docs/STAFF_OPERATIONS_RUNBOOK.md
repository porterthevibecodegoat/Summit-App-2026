# Staff Operations Runbook

Development workflow:

1. Start staff portal with `pnpm dev:admin`.
2. Open `http://localhost:3000`.
3. Use Overview for backend mode, revision, readiness, and operating lanes.
4. Use Schedule for draft editing, drag-and-drop or up/down ordering, quality review, State AI, and Official Change AI proposals.
5. Use Import to stage PDF, TXT, or CSV rows for review; imports never publish directly.
6. Use Review & Publish to inspect the attendee-facing diff, confirm, publish, or create a rollback revision.
7. Use Notifications to inspect queued jobs, delivery attempts, retries, and receipts. Delivery remains disabled without credentials and feature flags.
8. Use History for revision and operator audit context.

The same workflow runs in Supabase mode with authenticated staff roles, atomic publication, and durable audit records.

## Current Local Adapter

The staff portal now has a local live-ops adapter for development. It writes draft and published state to `work/live-ops-store.json`.

Available local endpoints:

- `GET /api/live-ops/state`: current draft sessions, published revision, notification job count, and registered device count.
- `POST /api/live-ops/publish-preview`: read-only diff preview for added, changed, removed, and unchanged attendee-facing schedule records.
- `POST /api/live-ops/draft`: saves draft agenda rows from the schedule workbench.
- `POST /api/live-ops/publish`: validates ready rows, publishes a new attendee snapshot revision, and recalculates reminder jobs.
- `POST /api/live-ops/rollback`: restores the previous published schedule by creating a new revision.
- `GET /api/snapshot`: attendee-safe published snapshot used by the mobile app sync path.
- `GET /api/notifications/jobs`: local reminder queue metadata.
- `POST /api/devices/register`: validates future attendee device registrations when push delivery is enabled.
- `GET /api/staff/me`: verifies the current browser session and authorized staff role.
- `POST` or `DELETE /api/staff/session`: exchanges/clears the HttpOnly staff session.
- `POST /api/notifications/dispatch`: claims and dispatches due jobs when production flags are enabled.
- `POST /api/notifications/receipts`: reconciles Expo tickets with provider receipts.
- `POST /api/cron/notifications`: secret-authenticated scheduled dispatch and receipt processing.

The admin API now selects storage automatically:

- Local mode: used when `SUPABASE_SERVICE_ROLE_KEY` is absent. Data is written to `work/live-ops-store.json`.
- Supabase mode: used when `SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are present. Staff mutating routes require an authenticated staff profile and role authorization.

Local mode proves the portal-to-app content loop without exposing credentials or pretending that cloud delivery is active.

Read-only staff pages and the attendee snapshot endpoint can show a degraded fallback if the configured live backend is unavailable. Mutating routes such as save, publish, rollback, and import still require the proper staff/backend path.

## Schedule Quality Gate

Before publication, the workbench checks:

- Every attendee-facing row is marked Ready.
- Every row has a title, valid start/end time, and real location.
- End times come after start times.
- Session IDs are unique.
- Same-day, same-room sessions do not overlap.
- Reminder offsets are parseable.
- Day labels are recognizable as Monday Nov 2, Tuesday Nov 3, or Wednesday Nov 4.

Blocking issues prevent publish. Warnings remain visible for staff judgment.

## Two-AI Operating Model

The staff portal separates AI into two roles:

1. State AI: read-only. It answers questions about the current draft schedule, published snapshot, notification readiness, audience rules, import status, and attendee sync health.
2. Official Change AI: mutation-capable only through a proposal workflow. It converts natural language or imported agenda files into structured proposed changes. Staff must review and apply the proposal before it can enter the publish queue.

Official changes must follow this path:

1. Staff edits draft data manually, by drag-and-drop, by file import, or by Official Change AI proposal.
2. The portal validates the draft against the shared event schema.
3. Staff reviews the publish preview to see added, changed, removed, and unchanged attendee-facing rows.
4. Authorized staff publishes a new snapshot revision through a transactional backend function.
5. The attendee app fetches or receives the new published snapshot.
6. Notification jobs are queued server-side using the published revision, schedule item IDs, audience scope, and notification offsets.

State AI must never publish, mutate, or send notifications. Official Change AI must never directly bypass review, audit, or server-side validation.

If a command cannot identify exactly one session with adequate confidence, Official Change AI must return no changes. Staff should identify the session by exact title, speaker, or unambiguous time and then regenerate the proposal.

## App-Wide Update Requirement

When production backend wiring is enabled, staff portal changes update the whole app by publishing a canonical event snapshot in Supabase. The mobile app must read that published snapshot rather than hardcoded demo data. Existing installed apps should receive the update through snapshot refresh/realtime sync, and push notifications should be dispatched only by the server notification worker.

Push delivery code is present but remains disabled until approved credentials, physical-device testing, and explicit production authorization are complete.

See `docs/PRODUCTION_BACKEND_SETUP.md` for the environment variables, migration order, and credential-dependent production steps.
