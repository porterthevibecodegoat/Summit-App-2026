# Architecture

This is a pnpm workspace:

- `apps/mobile`: Expo React Native attendee app.
- `apps/web`: Next.js public website and responsive browser event companion.
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
- Mobile and public-web attendee reads use the same safe published read APIs/snapshots only.
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

Public experience boundaries:

- Summit and Awards are sections of one public site so navigation, search, accessibility, and brand ownership stay coherent.
- The browser event companion is a responsive route within `apps/web`; it is not an iframe or a copy of the native app.
- The native iOS app remains independently deployable, offline-capable, and free of embedded staff controls.
- Public website, mobile, and staff portal share schemas and canonical event data but not platform-specific UI components.
- Website deployment failure must not invalidate the mobile cache or the canonical published snapshot.
