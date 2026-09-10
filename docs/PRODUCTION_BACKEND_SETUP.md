# Production Backend Setup

The server repository selects a local JSON adapter when Supabase server credentials are absent and the Supabase adapter when they are valid. The same repository contract powers staff drafts, published snapshots, imports, history, notification metadata, and attendee synchronization.

## Credential Classes

Client-safe configuration:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `EXPO_PUBLIC_API_BASE_URL`
- `EXPO_PUBLIC_EAS_PROJECT_ID`

Server-only secrets:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- `EXPO_ACCESS_TOKEN`
- `CRON_SECRET`
- hosting and Apple signing credentials

Feature gates stay false until their credential-last validation step:

```txt
ENABLE_AI=false
ENABLE_PUSH_DELIVERY=false
ENABLE_NOTIFICATION_DISPATCH=false
```

## Migration Order

1. `202608310001_gate0_schema.sql`
2. `202609030001_live_ops_architecture.sql`
3. `202609030002_staff_auth_and_live_ops_rls.sql`
4. `202609090001_atomic_publish_and_function_security.sql`
5. `202609090002_notification_delivery_worker.sql`

The final two migrations make publish/rollback atomic, narrow function execution, and add durable delivery claiming and receipt history. Apply migrations to staging before configuring the deployed application.

## Staff Publishing Contract

1. Supabase Auth establishes identity.
2. `staff_profiles` assigns `VIEWER`, `EDITOR`, `PUBLISHER`, or `ADMIN`.
3. Editors can save drafts and imports.
4. Publishers/Admins can invoke reviewed atomic publication and rollback.
5. Every publication validates data, increments the revision, stores an immutable snapshot, appends audit history, and regenerates notification jobs in one transaction.
6. Attendee clients read only the attendee-safe published snapshot API.

## Verification Commands

```sh
pnpm supabase:check
pnpm snapshot:pull
pnpm production:readiness
pnpm security:rls
pnpm release:preflight
pnpm mobile:sync-verify
```

Never print server keys. Verify key shape, table access, function privileges, RLS, and route authorization through pass/fail tests.

## Current Activation

The HTTPS staging portal, Supabase Auth redirects, invite-only administrator activation, atomic publication, public snapshot API, and Simulator sync are active. Remaining activation is limited to EAS/Apple physical-device delivery, external-model AI credentials/evals, final approved content, and App Store release ownership.
