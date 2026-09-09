# Roadmap To Live App

The Not Alone Summit product is now in **credential-ready staging**. The product workflows and safety boundaries are implemented; external account credentials, approved 2026 content, deployment, and real-device release validation remain deliberately last.

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

## Remaining Approved Content

- Final 2026 schedule and session descriptions.
- Approved speaker names, biographies, rights-cleared headshots, and sponsor/partner content.
- Approved venue map, room names, accessibility details, and emergency/help language.
- Final privacy-policy owner, support contacts, public URLs, and stakeholder sign-off.
- App Store listing copy, screenshots, age rating, privacy answers, and reviewer contact.

## Credentials-Last Activation

1. Deploy the staff portal/API to a public HTTPS staging domain.
2. Add the Supabase URL and publishable key to browser/mobile environments and the service-role key only to the server environment.
3. Configure Supabase Auth redirect URLs and create staff accounts/profile roles.
4. Point a staging iOS build at the deployed snapshot API and verify publish-to-device sync.
5. Add EAS/Apple push credentials, enable push flags, and validate delivery and receipts on physical devices.
6. Add the OpenAI key server-side, enable AI flags, and run structured-output evals before allowing staff use.
7. Load approved content, complete security/RLS review, and run accessibility/device testing.
8. Ship an internal TestFlight build, resolve findings, then submit for App Review.

See `docs/CREDENTIAL_LAST_HANDOFF.md` for the exact activation order and rollback rules.

## Definition Of Done

- Staff changes publish atomically and update attendee devices from the canonical snapshot.
- No AI, import, notification, or staff workflow can bypass review, authorization, audit, or publish confirmation.
- Essential event information remains usable offline and self-recovers when connectivity returns.
- Push is proven on physical devices and failure does not break core attendee information.
- Approved content, public policy URLs, App Store metadata, and stakeholder sign-off are complete.
- Required checks pass with zero known P0/P1 defects and evidence from browser, iOS Simulator, TestFlight, RLS, and recovery testing.
