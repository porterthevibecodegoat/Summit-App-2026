# Contributing

This project is an iOS-first event platform with a separate staff control portal. Treat the existing architecture as the source of truth.

## Local Setup

```bash
pnpm install
pnpm snapshot:pull
pnpm lint
pnpm typecheck
pnpm test
```

For native iOS inspection:

```bash
pnpm ios
```

For staff portal inspection:

```bash
pnpm dev:admin
```

## Architecture Rules

- Keep `apps/mobile` as the Expo React Native attendee app.
- Keep `apps/admin` as the separate Next.js staff portal.
- Keep shared schemas, typed contracts, event data, and domain logic in `packages/*`.
- Do not duplicate schedule, notification, AI, or attendee data models inside individual apps.
- Store production secrets only in server-side environment variables.
- Do not expose service-role Supabase keys, OpenAI keys, Apple credentials, EAS tokens, or push credentials in mobile/browser bundles.

## Branch Workflow

- `main`: stable shared branch.
- `feature/mobile-*`: attendee app work.
- `feature/admin-*`: staff portal work.
- `feature/backend-*`: Supabase/API/auth/notification work.
- `fix/*`: focused bug fixes.
- `docs/*`: documentation-only updates.

Open a pull request before merging into `main`.

## Pull Request Standard

Every pull request should include:

- What changed.
- Why it changed.
- Screenshots or simulator evidence for UI changes.
- Any schema/API/data model impact.
- Any security/privacy impact.
- Checks run.
- Known limitations.

Required checks before merge:

```bash
pnpm lint
pnpm typecheck
pnpm test
```

Run native iOS Simulator inspection for mobile UI, navigation, config, or dependency changes.

## Product Quality Bar

- Attendee app should feel premium, iOS-native, calm, and easy to use.
- Staff portal should prioritize clarity, auditability, fast edits, safe publishing, and low-stress live-event operation.
- AI may propose or explain, but production mutation must require staff review, server validation, and audit records.
- Push notifications must be generated from published schedule revisions by the server, not from duplicated client-side state.

## Before App Store Or Production Work

Confirm the relevant docs first:

- `docs/ROADMAP_TO_LIVE_APP.md`
- `docs/APP_STORE_CHECKLIST.md`
- `docs/PRODUCTION_BACKEND_SETUP.md`
- `docs/SECURITY_AND_PRIVACY.md`
- `docs/NOTIFICATIONS.md`
