# Architecture

This is a pnpm workspace:

- `apps/mobile`: Expo React Native attendee app.
- `apps/admin`: Next.js staff portal.
- `packages/config`: centrally validated environment/config values.
- `packages/validation`: Zod schemas and TypeScript contract types.
- `packages/domain`: schedule visibility, now/upcoming, grouping, event-time rendering, and live-ops publication safety logic.
- `packages/api-client`: typed snapshot fetcher.
- `packages/design-tokens`: shared non-component design values.
- `packages/test-fixtures`: schema-validated demo event snapshot.
- `supabase`: migrations and demo seed for the intended shared backend.

Production path:

- Supabase Postgres/Auth/RLS/Storage/Edge Functions owns canonical data.
- Staff writes go through server-side transactions and audit logs.
- Attendee reads use safe published read APIs/snapshots only.
- AI and notification systems are server-side adapters and must not block offline schedule/map/info access.

Live operations addendum:

- The App Store binary is not the authoritative source of event content.
- The backend owns canonical published event snapshots and revision history.
- Draft staff changes must remain invisible to attendees until an authorized publish.
- Current-State AI is read-only and can only answer from structured data.
- Event Operator AI creates structured proposals only; it cannot directly write production data.
- Document imports create extracted draft diffs, never blind overwrites.
- Publication must be atomic: either a complete revision publishes or production remains unchanged.
- Notification jobs derive from event IDs, event times, audience scope, and notification offsets.
- Mobile clients validate downloaded snapshots before replacing the last valid local snapshot.
