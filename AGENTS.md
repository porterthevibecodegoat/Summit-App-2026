# Not Alone Summit Engineering Rules

This repository contains two connected products for Inspiring Children Foundation:

- `apps/mobile`: iOS-first React Native attendee app built with Expo, Expo Router, and TypeScript.
- `apps/admin`: separate responsive Next.js staff Event Control Portal.
- `packages/*`: shared source of truth for config, schemas, domain logic, API contracts, design tokens, and fixtures.
- `supabase/*`: database migrations, local seed data, and future Edge Function code.

Non-negotiables:

- Never replace the attendee app with a website, PWA, WebView wrapper, Capacitor app, or desktop-first React app.
- Keep final event facts centrally configurable. Demo records must remain clearly labeled until approved content is supplied.
- Store event instants as UTC and render event-local time using an IANA time zone.
- Staff controls must remain outside the attendee app.
- Mobile and staff surfaces must read from the same canonical published event model.
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

