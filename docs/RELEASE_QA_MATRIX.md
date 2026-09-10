# Release QA Matrix

Status reflects evidence available on 2026-09-10. Re-run the commands for every release candidate.

| Area | Current Evidence | Status |
| --- | --- | --- |
| Type safety and unit behavior | Lint, typecheck, and all 53 tests passed | Passed |
| Admin production compilation | Next.js production build passed | Passed |
| Dependency advisory scan | `pnpm audit --prod --audit-level moderate` found no known vulnerabilities | Passed |
| Public staging API | Health, snapshot revision 3, and protected readiness behavior verified | Passed |
| Release configuration and assets | `pnpm release:preflight` passed 27/27 checks | Passed |
| Supabase role/RLS boundaries | `pnpm security:rls` passed 17/17 checks; disposable records cleaned up | Passed |
| Portal publish to native cache | Revision 3 and all 34 sessions matched with `pnpm mobile:sync-verify` | Passed on Simulator |
| Native Release compilation | Xcode Release/Simulator build and Apple bundle validation passed | Passed |
| Compiled iOS bundle | `pnpm mobile:release-verify` passed 17/17 identity, privacy, permission, HTTPS, and secret-boundary checks | Passed |
| Opening-screen visual fit | Release build inspected on iPhone 17e, iPhone 17 Pro, and iPhone 17 Pro Max with no clipping or overlap | Passed on Simulator |
| Opening-screen accessible text | Accessibility Large plus Increase Contrast inspected on iPhone 17 Pro; fixed-format year and Enter labels remain legible without clipping | Passed on Simulator |
| Structured schedule import | Multipart CSV template upload parsed quoted fields and staged 2/2 rows with zero unmatched rows; PDF/TXT parser regression tests remain green | Passed locally |
| Staff responsive layout | Schedule Editor and Schedule Import inspected at 1440x900 and 390x844 with no document overflow or obstructed controls | Passed locally |
| Push registration and receipts | EAS project is linked; APNs credentials and physical devices remain | Blocked by Apple credentials |
| External-model AI | Requires server key and production eval run | Blocked by credentials |
| TestFlight install/upgrade | EAS account is linked; Apple Developer/App Store Connect access remains | Blocked by Apple credentials |
| Final content and media | Requires approved 2026 source of truth and rights | Owner input |
| Privacy and support legal approval | Public pages are live; approval remains | Owner input |

## iPhone Visual Matrix

The opening screen has been inspected on the available compact, Pro, and Pro Max Simulator sizes. Before TestFlight promotion, verify every primary screen for overlap, truncation, inaccessible controls, and hidden scroll targets.

- Small iPhone: iPhone 17e opening screen passed
- Standard iPhone: opening screen passed at standard and Accessibility Large text; full-screen walkthrough remains to be signed off
- Pro iPhone: iPhone 17 Pro opening screen passed
- Pro Max iPhone: iPhone 17 Pro Max opening screen passed

For each size, test standard text and at least one larger Dynamic Type setting. The app is portrait-only and iPad support is intentionally disabled.

## Accessibility Matrix

- VoiceOver order, labels, selected states, and button purpose
- Dynamic Type opening screen passed at Accessibility Large; remaining primary screens require sign-off
- Reduce Motion behavior for entrance and transition animation
- Increase Contrast opening screen passed; remaining primary screens require sign-off
- Minimum practical touch targets and keyboard accessibility in the staff portal
- Color is never the only indication of status

## Resilience Matrix

- First launch online
- First launch without network uses bundled snapshot
- Relaunch offline uses SQLite cache
- Stale or malformed remote revision is rejected
- Foreground recovery fetches the newest published revision
- Supabase or AI outage does not break Schedule, Map, Info, or Help
- Removed sessions are pruned from the device-local saved schedule
- Notification permission denial leaves the app fully usable

## Release Sign-Off

Do not promote to App Review with a known P0/P1 defect. Required approvers: product/event operations, engineering, privacy/legal, and executive release owner.
