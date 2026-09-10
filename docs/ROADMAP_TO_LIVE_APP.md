# Roadmap To Live App

The Not Alone Summit product now has a **live HTTPS staging backend**. Supabase, staff authentication, atomic publishing, the public snapshot API, and native iOS snapshot refresh are connected. Push credentials, external-model AI, approved 2026 content, and release validation remain deliberately last.

Run the machine-readable audit with:

```sh
pnpm production:readiness
```

## Completed Product Foundation

- Native iOS-first Expo attendee app and separate Next.js staff portal.
- One shared, Zod-validated published event snapshot for mobile, staff preview, AI grounding, maps, and notifications.
- Staff authentication and role enforcement through Supabase Auth, HttpOnly cookies, route guards, RLS, and server-side publishing functions.
- Editable schedule workbench with drag-and-drop plus keyboard-friendly move controls, quality checks, draft save, review, explicit publish confirmation, history, and rollback.
- Read-only State AI and review-required Official Change AI. The deterministic no-key mode refuses ambiguous edits rather than guessing.
- PDF, TXT, and CSV import staging with validation, skipped-row reporting, import history, and no direct-to-publish path.
- Atomic publish transaction, immutable revisions, audit records, notification job regeneration, and restricted database function privileges.
- SQLite mobile snapshot cache, stale-revision protection, server-clock offset, launch/foreground/interval/manual refresh, notification-open refresh, and corrupt-cache recovery.
- Local My Schedule persistence with automatic pruning when sessions disappear.
- Durable push dispatch and receipt worker: guarded claims, retries, Expo batching, delivery attempts, receipt reconciliation, and invalid-device disabling.
- Premium icon and launch artwork, public privacy/support drafts, responsive staff portal, and attendee information links.
- HTTPS staff portal/API deployment backed by the staging Supabase project.
- Invite-only staff sign-in; authenticated invited staff are automatically activated as `ADMIN` by the current product policy.
- Production-path sync proof: an unchanged staff publish advanced the canonical snapshot to revision 3, the HTTPS API returned revision 3, and the running iOS Simulator app refreshed its SQLite cache from revision 2 to revision 3 with all 34 sessions.

## Remaining Approved Content

- Final 2026 schedule and session descriptions.
- Approved speaker names, biographies, rights-cleared headshots, and sponsor/partner content.
- Approved venue map, room names, accessibility details, and emergency/help language.
- Final privacy-policy owner, support contacts, public URLs, and stakeholder sign-off.
- App Store listing copy, screenshots, age rating, privacy answers, and reviewer contact.

## Credentials-Last Activation

Completed:

- Deploy the staff portal/API to a public HTTPS staging domain.
- Configure Supabase client/server environments and Auth redirects.
- Activate invite-only staff accounts as administrators.
- Point mobile preview/production configuration at the HTTPS snapshot API and verify publish-to-Simulator sync.

Remaining:

1. Add Apple push credentials, enable push flags, and validate delivery and receipts on physical devices.
2. Add the OpenAI key server-side, enable AI flags, and run structured-output evals before allowing staff use.
3. Load approved content and run accessibility, recovery, and physical-device testing; repeat the completed RLS matrix before release.
4. Ship an internal TestFlight build, resolve findings, then submit for App Review.

See `docs/CREDENTIAL_LAST_HANDOFF.md` for the exact activation order and rollback rules.

## Definition Of Done

- Staff changes publish atomically and update attendee devices from the canonical snapshot.
- No AI, import, notification, or staff workflow can bypass review, authorization, audit, or publish confirmation.
- Essential event information remains usable offline and self-recovers when connectivity returns.
- Push is proven on physical devices and failure does not break core attendee information.
- Approved content, public policy URLs, App Store metadata, and stakeholder sign-off are complete.
- Required checks pass with zero known P0/P1 defects and evidence from browser, iOS Simulator, TestFlight, RLS, and recovery testing.
