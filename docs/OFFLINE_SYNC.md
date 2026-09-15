# Offline And Sync Behavior

The attendee app is offline-first for essential event information.

## Implemented

- A schema-validated bundled snapshot guarantees first-launch content.
- Remote snapshots are validated before activation and cached in device AsyncStorage.
- The newest valid cached snapshot hydrates before network synchronization finishes.
- Lower or duplicate revisions cannot overwrite newer local content.
- Corrupt cache rows are removed and the app falls back safely.
- Fetches use a timeout and failures do not break schedule, map, info, or help.
- Refresh runs on launch, foreground resume, a safe active interval, manual request, and notification open.
- Server time is recorded to correct device-clock drift in "Now" and "Next" calculations.
- The cached snapshot is replaced only by a valid current or newer revision.

## Deliberate Product Boundary

The attendee app does not require accounts or offer personal schedules. Cross-device identity should only be added if the product later adopts consent, account recovery, deletion, moderation, and support workflows.

Realtime may accelerate updates after deployment, but polling/foreground refresh and the AsyncStorage cache remain the dependable source of recovery.

## Release Validation

Test airplane-mode launch, stale server data, malformed payloads, server timeout, clock drift, app termination, background/foreground, notification-open refresh, and recovery after connectivity returns.
