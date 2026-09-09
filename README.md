# Not Alone Summit Platform

Official app platform for the 2026 Not Alone Summit, built as a production-oriented event system for Inspiring Children Foundation.

## Apps

- `apps/mobile`: Expo React Native attendee app.
- `apps/admin`: Next.js staff Event Control Portal.

## Commands

```bash
pnpm install
pnpm dev
pnpm dev:mobile
pnpm dev:admin
pnpm ios
pnpm mobile:web
pnpm mobile:preview
pnpm lint
pnpm typecheck
pnpm test
pnpm snapshot:pull
pnpm supabase:check
pnpm production:readiness
```

## Current Status

The staging backend and staff portal are live over HTTPS. Supabase Auth, invited-staff administrator activation, atomic schedule publishing, the public snapshot API, and native mobile refresh are connected. A controlled production-path verification published revision 3 and the running iOS app adopted the same 34-session revision without reinstalling.

Push delivery and external-model AI remain intentionally disabled until EAS/Apple credentials, physical-device validation, and an OpenAI server key are supplied. Final 2026 content, legal URLs, accessibility/device review, TestFlight, and App Store submission also remain release gates.

See `docs/PRODUCTION_READINESS_AUDIT.md` for the current verification record and release gates.

Production credentials are intentionally absent. Use `.env.example` as the contract for local, staging, and production configuration.

See `docs/PRODUCTION_BACKEND_SETUP.md` for the Supabase, staff auth, publish, AI, and notification setup path.

See `docs/ROADMAP_TO_LIVE_APP.md` for the remaining milestones to make the attendee app, staff portal, AI workflows, notifications, and App Store release fully production-ready.

See `docs/CREDENTIAL_LAST_HANDOFF.md` for the exact final activation order, credential boundaries, validation, and rollback steps.

See `docs/PRIVACY_DATA_INVENTORY.md` and `docs/APP_STORE_REVIEWER_NOTES.md` for release-policy working documents.

See `CONTRIBUTING.md` and `docs/COLLABORATION_WORKFLOW.md` before inviting collaborators or opening pull requests.
