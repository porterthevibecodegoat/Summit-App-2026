# App Store Checklist

## Implemented In The Repository

- Native iOS app identity and bundle identifier are centralized in Expo configuration.
- Development, preview, and production EAS profiles exist.
- Premium 1024 px app icon and native launch artwork are installed.
- Notification permission rationale is declared.
- No unused camera, contacts, microphone, photo, or location permission is requested.
- Public privacy and support page drafts exist in the staff web application.
- Initial privacy data inventory and reviewer-notes templates exist in `docs/`.
- Expo Updates remains disabled without a valid EAS project ID, avoiding an invalid runtime configuration.

## Before TestFlight

- Confirm Apple Developer team, App Store Connect app record, certificates, provisioning, EAS project, and ownership.
- Replace prototype event content with approved 2026 facts and rights-cleared media.
- Publish privacy and support pages on durable public HTTPS URLs.
- Approve privacy disclosures, age rating, copyright, content rights, and export-compliance answers.
- Produce final screenshots for required iPhone sizes and approve listing copy, subtitle, keywords, category, and support contact.
- Verify production API URLs and confirm no local, staging, or secret value is embedded in the release bundle.
- Pass browser, Simulator, physical-device, accessibility, offline/recovery, RLS, push, and AI eval gates.

## Before App Review

- Promote a clean internal TestFlight build and resolve all P0/P1 findings.
- Confirm reviewer access instructions if staff-only or gated behavior must be inspected.
- Confirm account deletion requirements if attendee accounts are introduced later.
- Complete the reviewer notes in `docs/APP_STORE_REVIEWER_NOTES.md` with real URLs and contacts.
- Obtain product, event-operations, security/privacy, and executive release sign-off.
