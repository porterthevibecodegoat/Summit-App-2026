# Not Alone Summit Engineering Rules

This repository contains two connected products for Inspiring Children Foundation:

- `apps/mobile`: iOS-first React Native attendee app built with Expo, Expo Router, and TypeScript.
- `apps/admin`: separate responsive Next.js staff Event Control Portal.
- `apps/web`: independently deployed public website, connected to the same owner-controlled API as the attendee app.
- `packages/*`: shared source of truth for config, schemas, domain logic, API contracts, design tokens, and fixtures.
- `supabase/*`: database migrations, local seed data, and future Edge Function code.

Non-negotiables:

- Never replace the attendee app with a website, PWA, WebView wrapper, Capacitor app, or desktop-first React app.
- Keep final event facts centrally configurable. Demo records must remain clearly labeled until approved content is supplied.
- Store event instants as UTC and render event-local time using an IANA time zone.
- Staff controls must remain outside the attendee app.
- Mobile and staff surfaces must read from the same canonical published event model.
- Keep this owner-controlled app, website, backend, and deployments independent of collaborator forks. Do not automatically import or merge external collaborator updates; obtain an explicit owner request before integrating them. See `docs/PROJECT_OWNERSHIP.md`.
- Airtable is read-only. Attendance confirmation is not role approval. Producer credits must remain within the original ICF site list in `packages/config/src/producer-credits.ts`.
- Do not duplicate schedules for AI, notifications, "Now", mobile, or staff preview.
- Keep all elevated credentials server-side. Never expose service-role Supabase credentials, OpenAI keys, Apple credentials, or push credentials in mobile/browser bundles.
- Enforce access and publishing rules server-side with Supabase RLS and transactional application functions as the production path.
- AI, notifications, analytics, and realtime failures must not break cached schedule, map, or essential event information.
- Use strict TypeScript, Zod validation, testable modules, and conservative mature dependencies.
- Push delivery, production publishing, App Store/TestFlight submission, and paid/external resources require explicit authorization.
- The release rule is zero known P0/P1 defects, supported by tests, runtime inspection, auditability, and documented limitations.

Required quality gates:

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- Mobile iOS Simulator/development-build inspection before release-ready status.
- Staff portal browser inspection.
- Database migration/RLS review before connecting staging or production data.

## Owner vision and factual provenance

- Follow the owner's original product requirements and pre-collaboration design intent, plus later changes explicitly requested by the owner. The approved read-only 2026 Airtable replacement remains in scope; this instruction does not restore the old active agenda.
- Do not introduce new features, roles, biographies, sponsors, attendance claims, session assignments, times, rooms, or event policies merely because they appeared in collaborator-authored code or notes. Existing code is not independent evidence that a fact is true.
- Use the original ICF source content for the historical archive, reviewed 2026 Airtable records for current event facts, and explicit owner instructions for approved exceptions. Keep those sources and their years distinct. Missing or conflicting facts must remain unconfirmed, not filled in with plausible copy.
- Do not infer a speaking slot, award, host role, or access entitlement from attendance alone. Preserve original production/chair credits only within the scope the owner explicitly approved; do not expand that list.
- Do not reintroduce removed demo mode, personal schedules, collaborator-added native navigation, or retired submission flows without a new explicit owner request.
- Before reverting work, inspect its provenance. Changes from another owner-authorized task are not collaborator changes. Preserve approved security, reliability, and 2026 publishing work; report any remaining uncertainty instead of claiming a complete historical reset or complete credential isolation.
