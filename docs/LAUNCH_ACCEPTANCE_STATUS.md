# Launch Acceptance Status - September 16, 2026

This is an evidence report, not a claim that the entire product is launch-approved.

## Follow-Up: Reviewed Directory And Awards

- Added optional staff-reviewed people publication shared by website and mobile, using the existing snapshot/speaker records rather than a second roster. Activation is explicit and has not been enabled on the public event.
- Staff can assign directory categories, record the role approval source, edit profiles, and publish visibility changes. Attendance confirmation is not treated as role approval. The API rejects categorized published people without a recorded source when the reviewed directory is activated.
- Added a Pages & Awards editor and connected the published `awards-2026-program` title/body to the website and mobile. This is a plain-text program editor, not a complete structured honoree/category CMS. The 2025 archive remains unchanged.
- Removed stale website concierge claims about attendee messaging forms. Directory category jump buttons now correspond to visible sections.
- Latest unit suite: 111 passed. Latest responsive suite: 439 passed, 54 intentionally skipped duplicated content/recovery cases across 29 viewport configurations. Reviewed-content rendering/removal runs at phone, tablet, and desktop sizes.
- Updated real-Supabase staff acceptance passed all 19 checks, now including directory activation, role-source metadata, and Awards content. Test records were deleted; public revision and schedule were unchanged. An earlier attempt collided with a rebuild during server startup; a second caught an unstable textarea accessible name, which was fixed before the passing run.
- Website production build and the 12-route/66-link browser acceptance passed. A separate isolated browser test verifies reviewed profile links, Awards publication, withdrawal, backend failure, and truthful messaging status. No live event content is modified by these tests.
- The follow-up native Release build succeeded, passed 18 bundle checks, and was installed in the simulator. The nonactivated People screen was visually inspected; native cache comparison passed 6/6 at revision 8. The newly activated content path was exercised through Expo web, not by activating the real event on a physical iPhone.
- See `DIRECTORY_CONTENT_WORKFLOW.md` for producer-list provenance, activation instructions, and compatibility limits. Until staff activates reviewed publication, the existing bundled directory remains in use; its producer assignments have not thereby become verified.

## Verified In This Pass

- `pnpm lint` and `pnpm typecheck` passed.
- `pnpm test`: 102 unit tests passed. Added cases cover push transport failure, retry persistence, accepted-target deduplication, provider receipts, invalid device tokens, and notification destinations.
- Final responsive suite: 436 passed; 28 intentionally skipped duplicate recovery cases, using `pnpm exec playwright test --config playwright.mobile.config.ts --workers=2` after rebuilding the admin and exporting mobile web. The layout/function checks cover 29 viewport configurations, including People and Awards. One additional browser test proves cached schedule use during API outage, newer-revision recovery, and rejection of stale server revisions. These are Chromium viewport tests, not 29 physical devices or native OS versions.
- An earlier full run alongside native compilation had one session-navigation timeout (435 passed). The complete lower-concurrency rerun and ten additional repetitions of that exact session-navigation test passed without changes to navigation code; the exact cause of the earlier timeout was not isolated. This is a test-stability caveat, not evidence that all possible timing defects are excluded.
- `pnpm test:staff-acceptance`: 19 checks passed twice against real Supabase using a disposable event and staff identity. Tested authentication callback, HttpOnly session, URL credential cleanup, draft save, review/publish, attendee snapshot update, rollback, content publication, cloud audit, session refresh, logout, due-job claiming, delayed retries, and the three-attempt limit.
- The staff test also exercised deployed HTTPS session exchange, the browser callback with credential cleanup, authorized state reads, and logout. Mutating browser operations ran on a local production-mode server against the isolated cloud event, not against the public summit. Actual email delivery/link expiration is not covered by this callback test. One extra rerun timed out during publishing under concurrent native-build load; the subsequent full rerun passed and both runs cleaned up their test data.
- Test events and identities were removed. Public summit revision 8 and its schedule were unchanged.
- `pnpm security:rls`: 17/17 live database access-control checks passed.
- `pnpm release:preflight`: 28/28 configuration, asset, HTTPS endpoint, and public-secret-boundary checks passed. This is not App Store approval.
- Admin and website production builds passed.
- `pnpm test:website-acceptance`: 12 routes at 375px, 768px, and 1440px rendered without horizontal overflow or page runtime errors. Mobile navigation closes after choosing a destination. All 66 discovered internal link destinations returned successful responses.
- Website desktop/mobile screenshots were inspected. Its header now uses the existing bundled logo instead of an external-image dependency.
- Native Release build succeeded for the arm64 iPhone Simulator. The initial universal-simulator build hit a Hermes/CMake architecture mismatch; targeting the actual arm64 simulator resolved that build-tool issue.
- Compiled iOS bundle checks passed 18/18, including HTTPS API configuration, privacy manifest, and excluded elevated credentials.
- The rebuilt app was installed and inspected in iPhone 17 Pro Simulator. Verified opening greeting, Home, day selection in Schedule, People filtering/empty state, separate Awards years, and Info rendering. Native cache verification passed 6/6: revision 8, 34 sessions, and matching identities, titles, times, locations, and status.
- Commit `1feb24e` deployed successfully to both Vercel projects. Live health/snapshot, staff authentication boundary, security headers, website logo/navigation markup, and manifest were verified afterward.

## Fixes Made

- Staff sign-in now reloads protected content using the new cookie and a credential-free URL; Next router refresh could restore the original token fragment.
- Push attempt retries now upsert against the correct job/device conflict key. Expo requests have timeouts, and transport failures are recorded for retry.
- Notification taps have validated session routing, a schedule fallback for removed sessions, and rejection of other-event payloads. Foreground and cold-start response listeners are implemented. Device-level verification is still required.
- The notification jobs API reports actual delivery flags rather than always saying disabled. Dashboard wording distinguishes provider receipts from confirmed attendee reading.
- Website navigation closes after a selection. Metadata no longer declares every route canonical to an unconnected domain's homepage.
- Compact native tab labels no longer truncate Schedule. People cards no longer advertise nonfunctional "View bio / Connect" actions; category tabs expose selection state and empty categories have an explicit message.
- The additional People category test initially failed in all 29 browser viewports because React Native Web did not expose the native accessibility selected state. An explicit `aria-selected` attribute fixes that browser accessibility gap; native selection state is retained.

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
8. Review and activate the new published people directory after approving the complete roster, role sources, and imagery. Deliver the updated mobile binary before relying on that path on installed phones. Approve/publish the 2026 Awards program; structured category/honoree editing and historical archive editing remain outside the new plain-text program editor. Not every visible marketing or archive field is staff-editable.

## Deferred By Owner

- Apple Developer authentication, signing, TestFlight, and App Store submission.
- OpenAI key changes and API billing.
- Push delivery must remain disabled until Apple credentials and physical-device tests are complete.

Unit tests and a matching simulator cache are not substitutes for the unproven end-to-end acceptance scenarios above. Do not label this project fully launch-approved based on this report.

## Evidence And Reproduction

Evidence artifacts are in ignored `work/acceptance/`: unit/typecheck/lint logs, staff-results.json, website-results.json, responsive-final.log, rls.log, preflight.log, native build/bundle/cache logs, and screenshots. Earlier responsive.log retains the prior timeout. The tracked acceptance scripts make the tests repeatable without publishing test data to the public event.

Build the admin before staff acceptance and website before website acceptance. Staff acceptance requires authorized server-side Supabase environment values; it creates and removes temporary cloud records. It never prints credentials. Keep `.env` and generated browser traces out of GitHub.
