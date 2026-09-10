# Production Readiness Audit

Current status: **LIVE STAGING BACKEND, NOT RELEASE-READY**

The staff portal/API is deployed over HTTPS and connected to Supabase. Staff authentication, atomic publishing, the public snapshot API, and native mobile refresh are active. Push and external-model AI remain safely disabled until their separate credentials and validation gates are complete.

```sh
pnpm production:readiness
node scripts/production-readiness.mjs --strict
```

The authenticated staff API exposes the same report at `GET /api/production/readiness`.

## Implemented

- Native Expo iOS attendee app and responsive Next.js staff portal.
- Supabase schema, RLS, staff roles, staging seed, atomic publish/rollback functions, revisions, audit records, import records, attendee devices, notification jobs, and delivery attempts.
- HttpOnly staff sessions, server route guards, bearer-token compatibility for native/server clients, rate limits, and redacted public health responses.
- Schedule editing, quality gates, drag/drop and accessible reordering, safe review/publish, revision history, and rollback.
- Deterministic State AI, attendee concierge, and Official Change AI fallback behavior without external model calls.
- Strict target matching for Official Change AI; ambiguous or missing sessions produce no mutation proposal.
- PDF/TXT/CSV extraction and staged import review with file-size/type safeguards and no automatic publishing.
- Header-aware CSV ingestion with quoted-field support, deterministic duplicate handling, schema validation, and a downloadable staff template.
- Mobile SQLite cache, resilient synchronization, event-clock correction, refresh triggers, stale data rejection, and local My Schedule persistence.
- Durable push dispatcher and receipt reconciliation code with database claims, retries, attempt audit, and invalid-token handling.
- Premium app icon/launch art, public privacy/support drafts, and initial reviewer documentation.
- Invite-only staff sign-in with automatic `ADMIN` activation for approved invited identities.
- Deployed Supabase publish-to-mobile proof completed on 2026-09-09: canonical revision 3, HTTPS snapshot revision 3, and native SQLite cache revision 3 with 34 schedule items.
- Live disposable-identity RLS matrix passes 17/17 checks across anonymous, viewer, editor, publisher, admin, and protected publish-RPC boundaries, with automatic cleanup.
- Public privacy and support pages are live; App Store metadata, privacy-answer draft, QA matrix, and incident response runbook are prepared.
- Release preflight passes configuration, asset, policy URL, live API, and secret-boundary checks.
- Credential-free native Release compilation and Apple bundle validation pass; compiled-bundle verification is repeatable with `pnpm mobile:release-verify`.
- Production dependency advisory scan reports no known vulnerabilities.
- Staff portal desktop and narrow layouts have no document overflow; mobile staff status remains in page flow instead of obstructing controls.
- Opening-screen fixed-format controls pass Accessibility Large and Increase Contrast inspection without clipped labels.

## Active Staging Services

- Public HTTPS staff portal and API deployment.
- Supabase client/server environment, Auth redirects, staff sessions, publish RPC, audit trail, and public snapshot reads.
- Mobile preview/production API configuration targeting the deployed HTTPS service.
- Organization-owned EAS project and Expo Updates identity for runtime version `1.0.0`.

## Intentionally Inactive Until Credentials

- Apple/APNs credentials, push feature flags, and physical-device delivery.
- OpenAI server key, model configuration, AI feature flag, and production eval sign-off.
- App Store Connect/TestFlight submission credentials and release actions.

## Pending Non-Secret Inputs

- Approved 2026 schedule, speakers, biographies, headshots, venue/map data, FAQs, contacts, and emergency copy.
- Legal approval of the published privacy/support language and proposed retention policy.
- Final App Store metadata, screenshots, privacy declarations, age rating, and reviewer contact.

## Release Gates

- All `pnpm` quality gates pass and the production-readiness audit passes in strict mode.
- RLS/role tests prove viewer, editor, publisher, admin, anonymous, and service-role boundaries.
- Staff publish is visible in a deployed iOS staging build and remains available offline.
- Push send, receipt, retry, cancellation, and invalid-device behavior is proven on physical devices.
- AI evals pass and no elevated credential appears in a browser or mobile bundle.
- Browser, small/standard/Pro/Pro Max iPhone, VoiceOver, Dynamic Type, reduced-motion, and recovery testing are signed off.
- Zero known P0/P1 defects before TestFlight promotion or App Review.
