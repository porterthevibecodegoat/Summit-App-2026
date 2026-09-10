# App Store Checklist

## Implemented In The Repository

- Native iOS app identity and bundle identifier are centralized in Expo configuration.
- Development, preview, and production EAS profiles exist in the native app workspace.
- Premium 1024 px app icon and native launch artwork are installed.
- Notification permission rationale is declared.
- No unused camera, contacts, microphone, photo, or location permission is requested.
- Public privacy and support page drafts exist in the staff web application.
- Public privacy and support pages are live over HTTPS.
- Initial privacy data inventory and reviewer-notes templates exist in `docs/`.
- App Store listing copy, keywords, version notes, privacy-answer draft, QA matrix, and reviewer notes are prepared.
- App icon is exactly 1024 by 1024 pixels with no alpha channel.
- Export-compliance declaration and native privacy manifest are present; unused Face ID permission copy is removed.
- `pnpm release:preflight` validates configuration, assets, policy URLs, live API behavior, and public-bundle secret boundaries.
- `pnpm mobile:release-verify` validates the compiled iOS app bundle, stripped development permissions, privacy manifest, version identity, and secret boundaries.
- The Expo project is owned by `inspiring-children-foundation`, linked to EAS project `5a79b65b-7080-4c27-84e1-8eb5e9d119fd`, and configured for runtime version `1.0.0`.

## Before TestFlight

- Confirm Apple Developer team, App Store Connect app record, certificates, provisioning, and signing ownership.
- Replace prototype event content with approved 2026 facts and rights-cleared media.
- Approve the published privacy/support language, privacy disclosures, age rating, copyright, content rights, and export-compliance answers.
- Produce final screenshots for required iPhone sizes and approve listing copy, subtitle, keywords, category, and support contact.
- Verify production API URLs and confirm no local, staging, or secret value is embedded in the release bundle.
- Pass browser, Simulator, physical-device, accessibility, offline/recovery, RLS, push, and AI eval gates.

## Before App Review

- Promote a clean internal TestFlight build and resolve all P0/P1 findings.
- Confirm reviewer access instructions if staff-only or gated behavior must be inspected.
- Confirm account deletion requirements if attendee accounts are introduced later.
- Complete the reviewer notes in `docs/APP_STORE_REVIEWER_NOTES.md` with real URLs and contacts.
- Obtain product, event-operations, security/privacy, and executive release sign-off.
