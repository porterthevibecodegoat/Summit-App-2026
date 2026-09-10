# Staging Deployment

The staging staff portal/API is deployed at `https://summit-app-2026-admin.vercel.app`. It is the public HTTPS bridge between Supabase and the attendee app.

## Recommended Host

Use a Next.js-capable host such as Vercel for staging.

Create one project for the staff portal/API:

- Project root: `apps/admin`
- Install command: `cd ../.. && pnpm install --frozen-lockfile`
- Build command: `cd ../.. && pnpm --filter @not-alone/admin build`
- Framework: Next.js

The app includes `apps/admin/vercel.json` with the same command contract.

## Required Staging Environment Variables

Set these on the deployed admin project. Do not expose server-only values in the mobile app or browser bundles.

```sh
APP_ENV=staging
EVENT_ID=not-alone-summit-2026-prototype
EVENT_NAME=Not Alone Summit
ORGANIZATION_NAME=Inspiring Children Foundation
EVENT_TIME_ZONE=America/Los_Angeles

SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<supabase-publishable-key>
SUPABASE_SERVICE_ROLE_KEY=<supabase-secret-service-role-key>

EXPO_PUBLIC_API_BASE_URL=https://<staging-admin-domain>

ENABLE_ATTENDEE_ACCESS=false
ENABLE_AI=false
ENABLE_PUSH_DELIVERY=false
ENABLE_NOTIFICATION_DISPATCH=false
OPENAI_API_KEY=
OPENAI_MODEL=
EXPO_ACCESS_TOKEN=
CRON_SECRET=<long-random-server-only-value>
```

Public release URLs are now available:

```sh
APP_STORE_PRIVACY_URL=https://summit-app-2026-admin.vercel.app/privacy
APP_SUPPORT_URL=https://summit-app-2026-admin.vercel.app/support
```

The public EAS project identity is configured:

```sh
EXPO_PUBLIC_EAS_PROJECT_ID=5a79b65b-7080-4c27-84e1-8eb5e9d119fd
```

## Supabase Auth Redirect URLs

In Supabase Auth URL configuration, allow:

```txt
http://localhost:3000
http://localhost:3000/*
https://<staging-admin-domain>
https://<staging-admin-domain>/*
```

Production should add the final staff/admin domain before launch.

## Verification

After deployment, run:

```sh
STAGING_ADMIN_URL=https://<staging-admin-domain> pnpm staging:verify
```

Expected staging result:

- `/api/health` returns `ok: true`
- `backendMode` is `supabase`
- event id is `not-alone-summit-2026-prototype`
- published revision is at least `2`
- published schedule contains prototype sessions

The OpenAI key, model, and staging feature flag are configured server-side. Live-model responses remain blocked by provider account credits, while deterministic fallbacks stay operational. Apple/APNs credentials, legal approval, approved content, physical-device push testing, accessibility review, AI evaluation, and TestFlight evidence remain release gates.

## What This Unlocks

Once staging is live:

1. Staff can open the portal from a real HTTPS URL.
2. Supabase Auth invite links can return to the deployed portal.
3. The attendee app can point at `https://<staging-admin-domain>/api/snapshot`.
4. We can test staff publish to Supabase to attendee app refresh end to end.
5. The already-implemented push and AI server paths can be activated independently against a deployed server surface.

Keep the push and AI flags false for the first deployment. Activate one external service at a time, verify it, and roll its flags back to false if its validation fails.

## Codex Development Workflow

Codex should not edit production event content directly inside Supabase. Codex should change app code, staff portal code, shared types, tests, docs, and deployment configuration through the repository.

Use this split:

- Code changes: Codex task -> Git branch or pull request -> checks -> deploy.
- Event content changes: staff portal -> Supabase draft -> review -> publish.
- Emergency/event-day updates: staff portal only, with audit history and role checks.

This keeps fast iteration possible while preserving a reliable App Store and live-event deployment path.
