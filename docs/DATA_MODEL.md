# Data Model

Initial migration: `supabase/migrations/202608310001_gate0_schema.sql`.

Live operations migration: `supabase/migrations/202609030001_live_ops_architecture.sql`.

Staff auth/RLS hardening migration: `supabase/migrations/202609030002_staff_auth_and_live_ops_rls.sql`.

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

The live-ops migration also extends `notification_jobs` with source, payload, delivery, and supersession metadata, and adds `publish_event_snapshot_revision` as the first transactional publication function.

The staff auth/RLS migration adds helper functions for staff role lookup and policies for draft editing, proposal review, revision/audit reads, notification job management, and attendee device registration reads. Attendee device writes stay server-side through the admin API service role path.

The migrations enable RLS. Public attendee reads should use controlled published snapshot APIs rather than broad table access to revision history, because future revisions may include restricted event data.
