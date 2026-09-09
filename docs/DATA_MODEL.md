# Data Model

Initial migration: `supabase/migrations/202608310001_gate0_schema.sql`.

Live operations migration: `supabase/migrations/202609030001_live_ops_architecture.sql`.

Staff auth/RLS hardening migration: `supabase/migrations/202609030002_staff_auth_and_live_ops_rls.sql`.

Atomic publication/function hardening: `supabase/migrations/202609090001_atomic_publish_and_function_security.sql`.

Notification delivery worker state: `supabase/migrations/202609090002_notification_delivery_worker.sql`.

Implemented starter tables:

- `events`
- `locations`
- `schedule_items`
- `announcements`
- `notification_jobs`
- `audit_logs`

Implemented live-ops foundation tables:

- `staff_profiles`
- `speakers`
- `schedule_drafts`
- `event_change_proposals`
- `document_import_jobs`
- `schedule_revisions`
- `production_audit_entries`
- `attendee_device_registrations`
- `notification_delivery_attempts`

The live-ops migration extends `notification_jobs` with source, payload, delivery, and supersession metadata. The atomic hardening migration replaces the early publication path with validated publish and rollback transactions that update the event, immutable revision, audit entry, and reminder jobs together.

The staff auth/RLS migration adds helper functions for staff role lookup and policies for draft editing, proposal review, revision/audit reads, notification job management, and attendee device registration reads. Attendee device writes stay server-side through the admin API service role path.

The delivery migration adds database-backed job claims, claim expiry, provider ticket tracking, receipt state, bounded retries, and attempt-level history.

The migrations enable RLS and revoke elevated function execution from anonymous/authenticated clients. Public attendee reads use the controlled published snapshot API rather than broad table access to revisions or operational tables, because those records may include restricted data.
