# Production Backend Setup

The staff portal now has a storage adapter that uses local JSON during development and Supabase when server-side credentials are present. Supabase staging is connected and seeded; the next production-path step is deploying the staff portal/API to a public HTTPS staging URL.

Run the production readiness audit before calling the platform production-ready:

```sh
pnpm production:readiness
```

## Required Environment

Local development can run without Supabase:

- `LOCAL_STAFF_ROLE=ADMIN`
- `SUPABASE_SERVICE_ROLE_KEY` left blank

Supabase staging/production requires:

- `SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `EXPO_PUBLIC_API_BASE_URL`

Useful local checks:

```sh
pnpm supabase:check
pnpm supabase:seed
pnpm production:readiness
```

`pnpm supabase:check` validates key shape and remote table access without printing secrets.

Staging deployment is documented in `docs/STAGING_DEPLOYMENT.md`.

Push delivery additionally requires:

- real EAS project id in `apps/mobile/app.config.ts`
- Apple/Expo push credentials
- `ENABLE_PUSH_DELIVERY=true`
- server-side notification dispatch worker

AI features additionally require:

- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `ENABLE_AI=true`

App Store/TestFlight readiness additionally requires:

- `EXPO_PUBLIC_EAS_PROJECT_ID`
- `APP_STORE_PRIVACY_URL`
- `APP_SUPPORT_URL`
- Apple Developer account access
- EAS credentials configured for iOS builds and push notifications

## Migration Order

Run migrations in order:

1. `supabase/migrations/202608310001_gate0_schema.sql`
2. `supabase/migrations/202609030001_live_ops_architecture.sql`
3. `supabase/migrations/202609030002_staff_auth_and_live_ops_rls.sql`

## Staff Publishing Flow

1. Staff signs in.
2. Staff profile gives the user a role: `VIEWER`, `EDITOR`, `PUBLISHER`, or `ADMIN`.
3. Editors can save draft schedule changes.
4. Publishers/Admins can publish attendee-facing revisions.
5. Every publish validates a full event snapshot, writes a new revision, and recalculates notification job metadata.
6. The attendee app reads only `GET /api/snapshot`, never staff drafts.

## Still Required Before Real Event Use

- Deploy the staff portal/API to a staging HTTPS URL.
- Configure Supabase Auth redirect URLs for the staging domain.
- Run RLS tests against staging data.
- Replace placeholder EAS project id.
- Add server-side push worker and delivery audit.
- Add deployment-layer rate limits.
- Add a production privacy policy and App Store support URLs.
