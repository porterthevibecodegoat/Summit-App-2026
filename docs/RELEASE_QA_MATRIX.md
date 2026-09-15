# Release QA Matrix

Status reflects evidence available on 2026-09-15. Re-run the commands for every release candidate.

| Area | Current Evidence | Status |
| --- | --- | --- |
| Type safety and unit behavior | Lint, typecheck, and all 86 tests passed | Passed |
| Admin production compilation | Next.js production build passed with 26 application/API routes | Passed |
| Dependency advisory scan | `pnpm audit --prod --audit-level moderate` found no known vulnerabilities | Passed |
| Public staging API | Supabase health, snapshot revision 4, 34 sessions, and protected readiness behavior verified | Passed |
| Release configuration and assets | `pnpm release:preflight` passed 28/28 checks | Passed |
| Supabase role/RLS boundaries | `pnpm security:rls` passed 17/17 checks; disposable records cleaned up | Passed |
| Portal publish to native cache | Revision 4, all 34 sessions, 12 locations, and 3 content pages matched with `pnpm mobile:sync-verify` on 2026-09-15 | Passed on current Simulator cache |
| Native Release compilation | Xcode Release build and Apple bundle validation passed for an explicit arm64 Simulator destination | Passed |
| Compiled iOS bundle | `pnpm mobile:release-verify` passed 18/18 identity, privacy, permission, HTTPS, router-hardening, and secret-boundary checks | Passed |
| Native attendee visual fit | Release build inspected on iPhone 17 Pro and iPad mini across Home, Schedule, Ask AI, Map, Info, and session detail with no clipping or overlap | Passed on Simulator |
| Responsive web fit | 348 Playwright checks passed across 29 phone, tablet, split-view, desktop, and TV-browser profiles | Passed |
| Opening-screen accessible text | Accessibility Large plus Increase Contrast inspected on iPhone; fixed-format year and Enter labels remain legible without clipping | Passed on Simulator |
| Structured schedule import | Multipart CSV template upload parsed quoted fields and staged 2/2 rows with zero unmatched rows; PDF/TXT parser regression tests remain green | Passed locally |
| Staff responsive layout | Schedule Editor and Schedule Import inspected at 1440x900 and 390x844 with no document overflow or obstructed controls | Passed locally |
| Removed-feature and editorial residue | Attendee source scan found no Demo Mode, personal schedule, reminder, preview, or editorial-placeholder controls/copy | Passed |
| Session-link recovery | Invalid or stale session links show a concise recovery state; valid published links render current sanitized content | Passed on Simulator |
| Push registration and receipts | EAS project is linked; APNs credentials and physical devices remain | Blocked by Apple credentials |
| External-model AI | Server key, model, feature flag, structured outputs, rate limits, and deterministic fallback are deployed; live endpoint correctly falls back while provider credits are exhausted | Blocked by provider billing and final live-model eval |
| TestFlight install/upgrade | EAS account is linked; Apple Developer/App Store Connect access remains | Blocked by Apple credentials |
| Final content and media | Requires approved 2026 source of truth and rights | Owner input |
| Privacy and support legal approval | Public pages are live; approval remains | Owner input |

## Device Visual Matrix

The native Release build has been inspected on iPhone and iPad. The production web export is also covered by an automated 29-profile matrix spanning legacy and current phone classes, tablets, split view, desktop, and large TV-browser dimensions.

- Compact/legacy iPhone classes: automated portrait and landscape checks passed
- Standard, Plus, Pro, and Pro Max iPhone classes: automated portrait and landscape checks passed
- iPhone 17 Pro native Release build: all primary attendee screens passed visual inspection
- iPad mini native Release build: Home and Schedule passed visual inspection
- iPad split view, tablet portrait, and tablet landscape: automated checks passed
- Desktop and TV-browser dimensions: automated checks passed

The responsive checks validate nonblank rendering, viewport containment, primary navigation, isolated schedule days, grouped simultaneous sessions, attendee-only controls, concise session detail, concierge interaction, and opening-artwork coverage.

The native app supports iPhone and iPad with adaptive orientation. Before TestFlight promotion, repeat a human walkthrough on physical hardware at standard text and at least one larger Dynamic Type setting.

## Accessibility Matrix

- VoiceOver order, labels, selected states, and button purpose
- Dynamic Type opening screen passed at Accessibility Large; remaining primary screens require sign-off
- Reduce Motion behavior for entrance and transition animation
- Increase Contrast opening screen passed; remaining primary screens require sign-off
- Minimum practical touch targets and keyboard accessibility in the staff portal
- Color is never the only indication of status

## Resilience Matrix

- First launch online
- First launch without network uses the bundled snapshot
- Relaunch offline uses the persistent native AsyncStorage cache
- Stale or malformed remote revision is rejected
- Foreground recovery fetches the newest published revision
- Supabase or AI outage does not break Schedule, Map, Info, or Help
- Stale session deep links recover without crashing or exposing raw identifiers
- Notification permission denial leaves the app fully usable

## Native Build Note

Xcode 26 must target an explicit Simulator and active architecture when compiling source-built Hermes. The verified command used the iPhone 17 Pro destination with `ONLY_ACTIVE_ARCH=YES`; a generic universal Simulator destination can incorrectly combine arm64 and x86_64 SDK assumptions.

## Release Sign-Off

Do not promote to App Review with a known P0/P1 defect. Required approvers: product/event operations, engineering, privacy/legal, and executive release owner.
