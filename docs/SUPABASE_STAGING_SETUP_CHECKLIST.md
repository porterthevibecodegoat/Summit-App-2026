# Supabase Staging Setup Checklist

Project ref: `svertlbvvhemqiqohzmq`

Project URL:

```txt
https://svertlbvvhemqiqohzmq.supabase.co
```

## 1. Copy Keys

In Supabase Dashboard:

```txt
Project Settings -> API Keys
```

Copy:

- Publishable key, usually starting with `sb_publishable_`, into:
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
  - `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- Secret/service-role key, usually starting with `sb_secret_`, into:
  - `SUPABASE_SERVICE_ROLE_KEY`

Keep the secret/service-role key server-side only. Never put it in `EXPO_PUBLIC_*`, mobile code, screenshots, GitHub, or chat.

After editing `.env`, run:

```sh
pnpm supabase:check
```

The check intentionally prints only key shape/line metadata, never key values.

## 2. Run Migrations

Open:

```txt
Supabase Dashboard -> SQL Editor
```

Run these files in order:

1. `supabase/migrations/202608310001_gate0_schema.sql`
2. `supabase/migrations/202609030001_live_ops_architecture.sql`
3. `supabase/migrations/202609030002_staff_auth_and_live_ops_rls.sql`
4. `supabase/migrations/202609090001_atomic_publish_and_function_security.sql`
5. `supabase/migrations/202609090002_notification_delivery_worker.sql`

If Supabase says `Success. No rows returned`, the schema statement ran. It does not by itself prove seed data, RLS boundaries, or function privileges; complete the verification steps below.

## 3. Seed Prototype Event Content

After migrations and real `.env` keys are in place:

```sh
pnpm supabase:seed
pnpm supabase:check
```

This loads the current prototype event id, published snapshot, and staff draft schedule into Supabase from the repo-local canonical data.

## 4. Configure Auth

In:

```txt
Authentication -> Providers
```

Enable email sign-in.

In:

```txt
Authentication -> URL Configuration
```

Add local URLs:

```txt
http://localhost:3000
http://localhost:3000/auth/callback
```

After deployment, add the production staff portal URL and callback URL too.

## 5. Create Staff Users

In:

```txt
Authentication -> Users -> Add user -> Send invitation
```

Invite approved staff emails.

## 6. Seed Staff Roles

After a user accepts the invitation, copy their Supabase Auth user ID and run:

```sql
insert into public.staff_profiles (
  user_id,
  display_name,
  role,
  emergency_broadcast_enabled
)
values (
  'PASTE_USER_ID_HERE',
  'Staff Name',
  'ADMIN',
  true
);
```

Role options:

- `VIEWER`
- `EDITOR`
- `PUBLISHER`
- `ADMIN`

Recommended first account:

- Seth: `ADMIN`

## 7. Verify Local Supabase Mode

After `.env` has the real keys:

```sh
pnpm production:readiness
pnpm dev:admin
```

The staff portal should report `supabase` mode once `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are present.

Also verify:

- Anonymous and authenticated roles cannot execute atomic publish/rollback functions.
- Only service-role server code can execute those functions.
- Viewer cannot edit; editor cannot publish; publisher/admin can publish.
- Public snapshot access cannot reveal drafts, staff profiles, audit entries, device registrations, or delivery attempts.

## 8. What This Unlocks

- Staff portal can read/write real Supabase drafts.
- Reviewed publish actions create atomic revision, audit, and notification-job records.
- Audit/history can use production tables.
- Device registrations can be stored server-side.
- Notification delivery attempts and receipt state can be tracked durably.

Push delivery, OpenAI AI, and App Store/TestFlight still require their own credentials.
