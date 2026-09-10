# Product Requirements

The platform serves Not Alone Summit attendees and event staff with one canonical source of truth.

Current implementation status:

- App name, organization, event ID, API endpoint, environment, feature flags, bundle identifier, and event time zone are centralized in `packages/config`.
- Demo schedule/content is labeled as demo in `packages/test-fixtures`.
- Attendee app is Expo React Native with native stack navigation through Expo Router.
- Staff portal is a separate Next.js app.
- The HTTPS staging portal, Supabase publishing path, public snapshot API, offline native cache, day-separated schedule, session details, map, information, deterministic concierge, and staff operating workflows are implemented.
- Credential-independent release preflight, live RLS verification, policy pages, App Store metadata drafts, and incident/rollback procedures are implemented.
- EAS/Apple physical-device delivery, external-model AI, approved 2026 content, TestFlight, and App Review remain release gates.
