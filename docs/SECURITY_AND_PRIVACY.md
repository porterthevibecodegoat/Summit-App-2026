# Security And Privacy

Current controls:

- `.env.example` documents placeholders without committing secrets.
- Elevated Supabase, OpenAI, Apple, and push credentials are not present.
- Staff portal and mobile app are separate apps.
- Supabase migration enables RLS on exposed tables.
- Published read policies only expose published/public data in the starter schema.

Before staging/production:

- Staff role schemas and server-side route checks exist for local/Supabase live-ops APIs.
- Supabase staff RLS helper functions and policies are defined in `supabase/migrations/202609030002_staff_auth_and_live_ops_rls.sql`.
- Add production MFA policy before real staff rollout.
- Complete staged Supabase RLS tests before production data is connected.
- Add rate limits for auth, AI, and notification endpoints.
- Maintain an App Store privacy/data inventory.
