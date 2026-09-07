# Production Readiness Audit

Current status: **BLOCKED**

The local product foundation is active and Supabase staging is connected, but deployed HTTPS hosting, push delivery, OpenAI services, and App Store submission cannot be completed until the remaining external credentials and account decisions are supplied.

Run the audit any time with:

```sh
pnpm production:readiness
```

The staff API also exposes the same report at:

```txt
GET /api/production/readiness
```

Use strict mode in CI when the project is expected to be production-ready:

```sh
node scripts/production-readiness.mjs --strict
```

## Completed Locally

- Attendee app has native Expo/iOS development-build foundation.
- Attendee app reads a validated event snapshot and polls `EXPO_PUBLIC_API_BASE_URL/api/snapshot`.
- Staff portal has a drag-and-drop schedule workbench.
- Staff portal can save draft schedule rows through `/api/live-ops/draft`.
- Staff portal can publish reviewed rows through `/api/live-ops/publish`.
- Staff portal shows a publish diff preview through `/api/live-ops/publish-preview`.
- Staff portal can roll back to the previous published schedule by creating a new revision through `/api/live-ops/rollback`.
- Staff portal exposes real workflow pages for Ask AI, Make Changes, Import, Emergency, History, Notifications, and Settings.
- Staff session status verifies against `/api/staff/me` instead of only checking for a browser token.
- Schedule quality gates detect duplicate IDs, invalid/missing fields, unclear days, missing reminders, and same-room overlaps.
- Read-only staff pages and `/api/snapshot` can degrade to a local fallback with a redacted backend warning if the configured live backend is unavailable.
- Published local snapshots are served through `/api/snapshot`.
- Notification reminder jobs are recalculated as metadata on publish.
- Device registration route validates future Expo push token registrations.
- State AI is deterministic, read-only, and can answer current local backend, sync, review, import, and notification status.
- Official Change AI creates deterministic reviewed proposals for schedule edits without mutating production directly.
- The attendee concierge has a future server endpoint at `POST /api/ai/attendee`; it currently returns deterministic no-key answers.
- Notification dispatch has a guarded preflight endpoint at `POST /api/notifications/dispatch`; it intentionally refuses to send in prototype mode.
- Attendee Ask AI has temporary no-key answers from the published schedule and approved public summit context.
- Attendee My Schedule selections now persist locally across app restarts using secure local storage.
- Supabase migrations define staff roles, schedule drafts, revisions, proposals, imports, audit entries, device registrations, notification metadata, and RLS policies.
- Supabase staging is connected, seeded, and readable by the staff portal API.
- Staff Auth accounts and `ADMIN` staff profiles are active for staging.

## Blocked By Missing External Setup

- Deployed HTTPS staff/API environment.
- `EXPO_PUBLIC_API_BASE_URL` pointing at that deployed API.
- Real EAS project ID.
- Apple Developer account and push credentials.
- Real device push testing.
- Server-side notification dispatch worker activation.
- OpenAI API key and model choice.
- Server-side attendee concierge endpoint.
- Server-side staff State AI and Official Change AI endpoints using structured OpenAI outputs.
- Production PDF parser and import job processing.
- Account-backed attendee identity and synced My Schedule.
- Final 2026 event schedule, speaker content, headshots, map, privacy policy, support URL, App Store reviewer notes, TestFlight, and App Review.

## Current Rule

Local mode is allowed to prove workflow shape. It must not be presented as production cloud sync or live push delivery.

Production PASS requires:

- Supabase mode active.
- Staff auth and roles active.
- Mobile app pointed at a deployed HTTPS API.
- Published changes visible on a device/simulator from the deployed API.
- Push delivery tested on real devices.
- OpenAI calls executed only server-side.
- RLS and route authorization verified.
- App Store assets and policy URLs finalized.
