# Launch Acceptance Status - September 16, 2026

This is an evidence report, not a claim that the entire product is launch-approved.

## Verified In This Pass

- `pnpm lint` and `pnpm typecheck` passed.
- `pnpm test`: 102 unit tests passed. Added cases cover push transport failure, retry persistence, accepted-target deduplication, provider receipts, invalid device tokens, and notification destinations.
- `pnpm test:responsive`: 349 passed; 28 intentionally skipped duplicate recovery cases. The existing 348 layout/function checks cover 29 viewport configurations. One additional browser test proves cached schedule use during API outage, newer-revision recovery, and rejection of stale server revisions. These are Chromium viewport tests, not 29 physical devices or native OS versions.
- `pnpm test:staff-acceptance`: 19 checks passed twice against real Supabase using a disposable event and staff identity. Tested authentication callback, HttpOnly session, URL credential cleanup, draft save, review/publish, attendee snapshot update, rollback, content publication, cloud audit, session refresh, logout, due-job claiming, delayed retries, and the three-attempt limit.
- The staff test also exercised deployed HTTPS session exchange, authorized state reads, and logout. Mutating browser operations ran on a local production-mode server against the isolated cloud event, not against the public summit. Actual email delivery/link expiration is not covered by this callback test.
- Test events and identities were removed. Public summit revision 8 and its schedule were unchanged.
- `pnpm security:rls`: 17/17 live database access-control checks passed.
- `pnpm release:preflight`: 28/28 configuration, asset, HTTPS endpoint, and public-secret-boundary checks passed. This is not App Store approval.
- Admin and website production builds passed.
- `pnpm test:website-acceptance`: 12 routes at 375px, 768px, and 1440px rendered without horizontal overflow or page runtime errors. Mobile navigation closes after choosing a destination. All 66 discovered internal link destinations returned successful responses.
- Website desktop/mobile screenshots were inspected. Its header now uses the existing bundled logo instead of an external-image dependency.

## Fixes Made

- Staff sign-in now reloads protected content using the new cookie and a credential-free URL; Next router refresh could restore the original token fragment.
- Push attempt retries now upsert against the correct job/device conflict key. Expo requests have timeouts, and transport failures are recorded for retry.
- Notification taps have validated session routing, a schedule fallback for removed sessions, and rejection of other-event payloads. Foreground and cold-start response listeners are implemented. Device-level verification is still required.
- The notification jobs API reports actual delivery flags rather than always saying disabled. Dashboard wording distinguishes provider receipts from confirmed attendee reading.
- Website navigation closes after a selection. Metadata no longer declares every route canonical to an unconnected domain's homepage.

## Launch Transaction Decision

- Removed unconnected ticket and person-to-person messaging forms from public launch pages.
- Removed unverified free-ticket pricing, ticket quantity, and scarcity claims.
- Unconfigured submission APIs return 503 and explicitly state that nothing was reserved or sent.
- Contact navigation uses the official ICF contact website, not an unconnected message form.
- Historical Awards navigation leads to the archive, not a current RSVP.
- This does not implement payment processing or messaging delivery. Re-enabling either requires a separate integration and acceptance test.

## Still Required Before Launch

1. Apple account access, signing/APNs credentials, a signed build, and physical-iPhone push tests. Delivery remains disabled. Test scheduled reminders, permission denial, retries, receipts, cold-start opening, backgrounding, termination, and reconnect on real devices.
2. Verify an external scheduler calls the authenticated notification worker at the required cadence. The endpoint and database claiming are tested; an operational production scheduler is not established by those tests.
3. Complete push interruption recovery and general-purpose custom announcement composition if required at launch. Current scheduled push jobs are schedule-derived reminders, not a verified arbitrary-message broadcasting tool. A crashed worker can leave a job processing; reconcile uncertain deliveries before rescheduling. Push cannot promise exactly-once display.
4. Choose and connect the public website domain. `notalonesummit.org` still serves the older Squarespace site; no DNS change was made. The new website is available at https://not-alone-summit-web-rose.vercel.app/ and staff portal at https://summit-app-2026-admin.vercel.app/.
5. Restore OpenAI access/billing and run live-model grounding/safety evaluation when authorized. Deterministic fallback coverage is not proof of live-model behavior.
6. Obtain event-owner approval of final 2026 schedule, confirmations, venue/map, sponsor/speaker content, media rights, privacy/support text, and design. Automated checks cannot supply those approvals.
7. Run physical-device accessibility and release acceptance, then TestFlight/App Store submission. Neither submission nor Apple review occurred in this pass.

## Deferred By Owner

- Apple Developer authentication, signing, TestFlight, and App Store submission.
- OpenAI key changes and API billing.
- Push delivery must remain disabled until Apple credentials and physical-device tests are complete.

Unit tests and a matching simulator cache are not substitutes for the unproven end-to-end acceptance scenarios above. Do not label this project fully launch-approved based on this report.

## Evidence And Reproduction

Evidence artifacts are in ignored `work/acceptance/`: unit/typecheck/lint logs, staff-results.json, website-results.json, responsive.log, rls.log, preflight.log, and screenshots. The tracked acceptance scripts make the tests repeatable without publishing test data to the public event.

Build the admin before staff acceptance and website before website acceptance. Staff acceptance requires authorized server-side Supabase environment values; it creates and removes temporary cloud records. It never prints credentials. Keep `.env` and generated browser traces out of GitHub.
