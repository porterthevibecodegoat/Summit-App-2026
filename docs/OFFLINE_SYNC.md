# Offline Sync

Current foundation:

- Demo snapshot is schema-validated in `packages/test-fixtures`.
- `pnpm snapshot:pull` exports a bundled snapshot to `apps/mobile/assets/demo-snapshot.json`.
- Mobile UI can fetch a published snapshot from `EXPO_PUBLIC_API_BASE_URL` and keeps using the bundled validated fallback if synchronization fails.
- Remote snapshots are parsed through the shared Zod event snapshot schema before becoming active app data.
- Successful remote snapshots are cached in secure local storage and reused on relaunch before the next network sync finishes.
- Snapshot fetches have a timeout so the app falls back quickly when the API is unreachable.
- The app refreshes on launch, foreground resume, and a safe active-use interval.
- My Schedule selections persist locally across app restarts while account/device sync is still pending.
- The staff portal local adapter publishes attendee-safe snapshots through `GET /api/snapshot`, so Expo web/native development can verify the app reads the same published revision as the portal.

Next production steps:

- Hydrate SQLite from the bundled snapshot on first launch.
- Store incremental sync payloads transactionally.
- Track server time and clock offset for reliable "Now" calculations.
- Add manual refresh and relevant push-notification-open refresh.
- Move My Schedule from local persistence to account/device synced persistence once attendee identity exists.
- Realtime subscriptions may speed up updates but must not be the only synchronization path.
