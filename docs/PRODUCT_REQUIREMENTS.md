# Product Requirements

The platform serves Not Alone Summit attendees and event staff with one canonical source of truth.

Current implementation status:

- App name, organization, event ID, API endpoint, environment, feature flags, bundle identifier, and event time zone are centralized in `packages/config`.
- Demo schedule/content is labeled as demo in `packages/test-fixtures`.
- Attendee app is Expo React Native with native stack navigation through Expo Router.
- Staff portal is a separate Next.js app.
- Phase 1 currently contains the first schedule vertical-slice foundation, not a production release.
