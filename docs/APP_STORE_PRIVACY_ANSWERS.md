# App Store Privacy Answers Draft

Complete App Store Connect from the exact production behavior. This is the engineering draft for the current build and requires legal/privacy approval.

## Tracking

- Does this app track users across apps or websites? `No`
- Does this app use advertising identifiers? `No`
- Does this app contain third-party advertising? `No`

## Attendee Identity

- Attendee account required: `No`
- Name, email, phone, contacts, photos, precise location, payment, health records: `Not collected by the app`
- Saved sessions: stored only on the device and not linked to an identity
- Published event content: cached only to support offline use

## Notifications

When an attendee opts into notifications, the service stores an Expo push token, platform, app version, event ID, and audience group. Treat the token as a pseudonymous device identifier used only for app functionality and operational messaging.

Proposed retention: disable invalid registrations immediately and delete remaining attendee push registrations 30 days after the event unless legal or operational owners approve a shorter period.

## Concierge

Questions are sent to the Not Alone Summit server when server AI is enabled. The app instructs attendees not to submit sensitive information. Questions are not intentionally linked to an attendee identity and are not stored by the application by default.

Before approving external-model AI for production event use, confirm provider retention settings, `store: false`, regional/data-processing terms, and production log redaction. The staging server integration is active with deterministic fallback while provider credits are unavailable.

## Diagnostics And Security

Hosting and infrastructure providers may process IP address, request metadata, error details, and security logs. Configure minimum practical retention and disclose the final provider behavior if App Store definitions require it.

## Proposed Operational Retention

- Attendee device registrations: through 30 days after the event
- Notification delivery attempts: through 90 days after the event
- Staff publication/audit history: 12 months after the event
- Concierge questions: not stored by the application
- Saved schedule and snapshot cache: until the user deletes the app or app data

## Final Approval Questions

- Confirm Inspiring Children Foundation as data controller.
- Confirm privacy contact and deletion-request workflow.
- Confirm Supabase, Vercel, Expo, Apple, and OpenAI production retention terms.
- Confirm whether infrastructure IP logs meet Apple's definition of collected diagnostics or identifiers.
- Reconcile this draft with the privacy report generated from the final signed Xcode archive.
