# Not Alone Summit Platform

Production-oriented event platform scaffold for Inspiring Children Foundation.

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
```

## Gate 0 Status

This repository starts with a real Expo mobile app, a separate Next staff portal, shared typed packages, centralized config, `.env.example` files, Supabase migration/seed files, and a dev-only browser frame for the real Expo web preview.

See `docs/GATE_0_REPORT.md` for the current verification record and environment blockers.

Production credentials are intentionally absent. Use `.env.example` as the contract for local, staging, and production configuration.

See `docs/PRODUCTION_BACKEND_SETUP.md` for the Supabase, staff auth, publish, AI, and notification setup path.

See `docs/ROADMAP_TO_LIVE_APP.md` for the remaining milestones to make the attendee app, staff portal, AI workflows, notifications, and App Store release fully production-ready.

See `CONTRIBUTING.md` and `docs/COLLABORATION_WORKFLOW.md` before inviting collaborators or opening pull requests.
