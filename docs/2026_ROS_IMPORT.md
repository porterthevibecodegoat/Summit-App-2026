# 2026 Program Replacement

Source reviewed September 16, 2026: Airtable base `app7BHptsc1bjc3DD`, Simplified ROS interface `pagFmzDhXfNK53eWY`. Read-only inspection; no Airtable changes. This is a reviewed import, not an automatic Airtable synchronization service.

The event owner confirmed that source times mean Las Vegas/Pacific time (`America/Los_Angeles`). Published instants are UTC. Midnight endings advance to the following day.

## Source accounting

- 32 ROS records inspected.
- 26 activities have complete start/end times and appear as timed schedule items.
- Five incomplete entries are published as explicit timing notes, not fabricated live sessions: AI relationships panel, Doors Open, Pre-Show, Tennis, High Tea.
- One internal Load Out record is excluded from attendee publication.
- Main summit dates remain November 2-4. Additional activities are November 1 and 5. Both attendee schedule surfaces expose all five dates.
- Only the November 1 sponsor/talent dinner and poker night list Margaux. All other room assignments remain unconfirmed. No venue map geometry was inferred.
- Special access is labeled where the activity title identifies its audience. Other access remains unconfirmed, not a promise that every ticket grants admission.
- No confirmed speaker-to-session assignments were invented. The panel's incomplete lineup remains unannounced.

The initial talent review showed 57 records in Confirmed Attendance: after excluding three TBC records and a duplicate DMC identity, 53 unique confirmed guests remained. A second read-only review on September 16 showed 56 records because the separate DMC duplicate had been removed from Airtable. The same 53 public confirmed names remain. Held or tentative records are not confirmation. Blank biographies and absent headshots stay blank rather than reusing unapproved historical claims.

## Producer credits

Original ICF Summit source: https://www.inspiringchildren.org/summit

- Producers: Trent Alenik, Aphrah Brokaw.
- Executive producers: Jewel, Ryan Wolfington, Trevor Short, Dr. George Rapier III.
- The 2026 directory includes only the independently confirmed attendees from that list. Dr. George Rapier III is not added to 2026 merely because of his historical credit.
- Staff publication rejects extra producer names/categories. The website's 2025 archive keeps the original credits, not the collaborator's expanded categories.

## Publication

Published revision 9 replaced revision 8 using `publish_event_snapshot_revision_v2` with an expected-revision guard. The full returned snapshot was checked against the submitted snapshot. The live public API was independently checked for revision 9, 26 timed activities, 53 guests, pending-date pages, and approved credits.

Previous published data and working drafts were backed up locally under ignored `work/acceptance/ros-2026`; Supabase revision history remains for audit/rollback. Historical data was removed from the active attendee publication, not destructively erased from audit history. The separate website 2025 archive remains historical.

No attendee push jobs were created. Push credentials, Apple signing, App Store submission, and OpenAI billing are not represented as completed by this import.

## Outstanding editorial facts

Complete the five incomplete timing records; approve remaining rooms, access rules, speaker assignments, biographies/headshots, and venue map. Update those through the owner-controlled publishing workflow. Do not silently infer them from 2025 or from collaborator role categories.

## Verification

- Workspace lint, type checking, unit tests, and both Next.js production builds passed. The original run contained 123 unit tests; three additional mobile release-URL regression tests also passed.
- Responsive suite: 439 passed, 54 skipped across 29 viewport configurations. Skipped checks are not verified coverage of physical devices.
- Staff acceptance: 19 checks passed, including real authentication, isolated-event edit/publish/rollback/content flows, authorization failures, audit records, worker retry handling, cleanup, and an unchanged production event after testing. No push was sent.
- Website acceptance passed route/overflow checks at 375, 768, and 1440 pixels, internal navigation checks, and manifest identity checks.
- Native iOS Simulator inspection confirmed the five-date agenda, pending Thursday timing, approved producer filter, and 2026-only awards program. Six native-cache comparisons matched live API revision 9 and all 26 timed entries.
- The native Release build succeeded. Its bundle scanner passed 17/18 checks: credentials were absent and production HTTPS/EAS settings were correct. The remaining literal-localhost check flags Expo Router's `getOriginFromConstants` vendor fallback, not the app's API endpoint; the generated JavaScript was inspected to identify that source. This scanner warning remains documented, not silently suppressed. Mobile API resolution now rejects loopback URLs outside development, with three regression tests.
- Apple signing, a physical-device build, push delivery, and App Store review remain separate gates. These results do not establish completion of those gates.

Do not run historical seed scripts against this populated production project. Routine changes must use guarded staff publishing; `scripts/publish-ros-2026.mjs` is a one-time import that requires the expected prior revision and intentionally refuses to repeat after revision 9.

## Native follow-up review

The second read-only ROS review matched all 32 source rows, including unchanged start/end times and the five incomplete entries. No new schedule revision was needed merely to repeat an identical import.

The native Ask AI fallback still contained a separate historical program/role description list. It has been removed. Both the staff-hosted attendee endpoint and the phone's offline fallback now call `@not-alone/domain/concierge`, using the same published snapshot. Current guest attendance does not imply an old host role or a new speaking slot. The fallback no longer asserts old Community Day activities, a closing concert, registration rooms, or historical sponsors. Published pending-timing notes remain available offline.

The native cache verifier now compares event information, full guest records, rooms, FAQs, sponsors, media, notices, and content-page text in addition to schedule identity/timing/revision checks.
