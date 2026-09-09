# Privacy Data Inventory

This is a working engineering inventory, not final legal advice. Legal/privacy owners must approve it before App Store submission.

| Data | Purpose | Location | Linked To Identity | Retention / Control |
| --- | --- | --- | --- | --- |
| Published event snapshot | Offline schedule, map, info, help | App SQLite cache | No | Replaced/pruned by newer revisions; removed with app data |
| Saved session IDs | My Schedule | App SQLite database | No account currently | User-editable; removed with app data |
| Expo push token | Operational event notifications | Supabase server tables | Pseudonymous device registration | Disable on invalid token; define post-event deletion window |
| Device platform/app version/access group | Routing and delivery diagnostics | Supabase server tables | Associated with push registration | Same retention as push token |
| Concierge question | Answer an attendee request | Server request processing/provider when AI enabled | Not intentionally linked | Do not store by default; provider calls use minimal retention configuration |
| Staff identity/email | Portal authentication and authorization | Supabase Auth/profile | Yes | Organization staff lifecycle and offboarding policy |
| Staff actions/proposals/imports | Safety, accountability, rollback | Supabase audit/live-ops tables | Yes | Define operational/legal retention before launch |
| Notification tickets/receipts/errors | Delivery reliability and troubleshooting | Supabase delivery attempts | Pseudonymous registration/job | Define post-event deletion window; redact payloads from general logs |
| Service logs/rate-limit state | Security and reliability | Hosting/server runtime | May contain IP or request metadata | Minimize, redact, access-control, and set host retention |

## Not Requested By The App

Contacts, photos, camera, microphone, precise location, health records, payment information, and advertising identifiers are not required by the current product.

## Decisions Before Release

- Name the data controller and privacy contact.
- Approve push/device and audit retention periods.
- Confirm OpenAI/provider data-processing and retention settings.
- Confirm whether host logs collect IP addresses and disclose as required.
- Complete App Store privacy labels from the shipped production behavior, not prototype assumptions.
- Add account deletion only if attendee accounts are introduced.
