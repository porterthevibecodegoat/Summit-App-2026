# Security And Privacy

## Implemented Controls

- Elevated Supabase, OpenAI, Apple, Expo, and cron credentials are excluded from browser/mobile configuration and source control.
- Staff and attendee products are separate applications with separate authorization boundaries.
- Staff authentication uses Supabase Auth and an HttpOnly, secure, same-site session cookie; temporary URL fragments and legacy browser tokens are cleared after exchange.
- Protected pages are server-gated, and protected APIs verify staff roles server-side.
- RLS is enabled on exposed Supabase tables with explicit viewer/editor/publisher/admin boundaries.
- Publishing and rollback use security-definer database functions with fixed search paths, explicit validation, atomic writes, and service-role-only execution.
- Public snapshot reads expose only attendee-safe published fields.
- Public health responses are redacted; operational readiness and notification state require staff authorization.
- Attendee AI and device-registration routes are rate-limited; provider credentials never reach clients.
- Imports validate type, size, content signature, and extracted rows, and cannot publish directly.
- Notification delivery uses idempotent jobs, guarded database claims, bounded retries, and delivery-attempt audit records.
- AI change proposals require human review and cannot publish directly.

## Data Minimization

The attendee app does not currently require an account. My Schedule remains on the device, reducing identity and deletion obligations. Device push tokens are pseudonymous operational identifiers and should be retained only while useful for the event.

See `docs/PRIVACY_DATA_INVENTORY.md` for the working disclosure inventory.

## Before Production

- Require MFA for publisher/admin roles and document recovery/offboarding.
- Keep `pnpm security:rls` passing against staging. It uses disposable identities and records, verifies the role matrix and protected publish function, and cleans up afterward.
- Rotate all credentials after initial setup and after staff/offboarding events.
- Configure hosting headers, request logging/redaction, alerting, backups, and retention.
- Complete dependency, secret, abuse, privacy, and incident-response reviews.
- Obtain legal approval for public privacy/support pages and App Store disclosures.
- Confirm no production credential or attendee data appears in logs, client bundles, screenshots, or repository history.
