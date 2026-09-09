# Offline And Sync Behavior

The attendee app is offline-first for essential event information.

## Implemented

- A schema-validated bundled snapshot guarantees first-launch content.
- Remote snapshots are validated before activation and cached in SQLite transactionally.
- The newest valid cached snapshot hydrates before network synchronization finishes.
- Lower or duplicate revisions cannot overwrite newer local content.
- Corrupt cache rows are removed and the app falls back safely.
- Fetches use a timeout and failures do not break schedule, map, info, or help.
- Refresh runs on launch, foreground resume, a safe active interval, manual request, and notification open.
- Server time is recorded to correct device-clock drift in "Now" and "Next" calculations.
- Old cache rows are pruned after successful synchronization.
- My Schedule IDs persist locally and are pruned when published sessions are removed.

## Deliberate Product Boundary

My Schedule is device-local because attendee accounts are not required for this event app. Cross-device sync should only be added if the product adopts attendee identity, consent, account recovery, and deletion workflows.

Realtime may accelerate updates after deployment, but polling/foreground refresh and the SQLite cache remain the dependable source of recovery.

## Release Validation

Test airplane-mode launch, stale server data, malformed payloads, server timeout, clock drift, app termination, background/foreground, notification-open refresh, removed saved sessions, and recovery after connectivity returns.
