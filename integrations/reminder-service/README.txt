SHARED WELLNESS REMINDER COMPANION SERVICE

IMPLEMENTED locally. This folder builds the same wellness-only feed and STOP handlers as apps/web. The source is now versioned with the production website instead of referring to the older external website snapshot. No scheduler or outbound SMS sender is included.

From repository root with the pinned Node and pnpm dependencies installed:
  node integrations/reminder-service/build.mjs
  pnpm exec tsc --project integrations/reminder-service/tsconfig.json
Output: integrations/reminder-service/dist (ignored by Git), containing netlify.toml, public/, netlify/functions/ and a source-hash manifest. Building does not deploy. Upload the functions with the Netlify CLI/API only after review; the main website does not need replacement.

SMS HOLD: No SMS, including tests, until Nick approves the complete process and build. The source defaults to preview-only: sendApproval=pending, previewJobs populated, reminderJobs empty. INTEGRATION_SMS_SEND_APPROVED must remain unset/false. Reviews, merges, deployment and test success are not permission to enable sending. Keep Make scenarios inactive.

Required server-only provider settings (names only; no secrets in source):
  INTEGRATION_SMS_SEND_APPROVED: leave unset/false until explicit complete-process/build approval.
  INTEGRATION_FEED_TOKEN: independent random secret, minimum 32 characters.
  WELLNESS_AIRTABLE_FEED_TOKEN: separate private preview-feed bearer secret, minimum 32 characters; not yet provisioned.
  WELLNESS_AIRTABLE_SOURCE_MODE: test (default) or explicitly live for this read-only endpoint only. Does not change the reminder rehearsal/STOP source. Source writes are always disabled for this connection.
  CLICKSEND_INBOUND_SECRET: different random secret, minimum 32 characters.
  CLICKSEND_DEDICATED_NUMBER: dedicated sender/destination number.
  CLICKSEND_EXPECTED_USER_ID: account ID verified from provider callbacks.
  CLICKSEND_EXPECTED_SUBACCOUNT_ID: additional account check where configured.
  SOURCE_NETLIFY_SITE_ID: dca09595-b5fa-4210-9d36-010bccfb903c.
  SOURCE_NETLIFY_TOKEN: protected source-site credential, only in encrypted provider settings.
  REMINDER_SOURCE_MODE: test (default) or live.
  INTEGRATION_TEST_STORE_PREFIX: nas-reminders-test-<unique-suffix>, mandatory in test; forbidden in live.
  REMINDER_SOURCE_WRITES_ENABLED: live inbound STOP writes require true explicitly.

Optional isolated rehearsal settings:
  INTEGRATION_TEST_ACTIVITIES_JSON: at most four TEST-labelled fictional wellness-test IDs; requires isolated test mode. It cannot override real sessions.

Future capacity connection:
  WELLNESS_BOOKING_ENABLED: leave unset/false. When true, the code requires an approved complete capacity configuration and reads an already initialized booking ledger. Unset limits or missing ledger return 503. The reminder service cannot initialize or write the booking ledger. The web app now contains disabled signup/cancellation/recovery wiring; see docs/WELLNESS_BOOKING_WORKFLOW.txt. Initial live migration is still not included. The companion only reads booking state and cannot initialize or mutate it. Explicit synthetic test-capacity settings are allowed only with isolated test source mode/prefix; they cannot satisfy the live gate.

API:
  GET /api/integrations/agenda — feed bearer auth; private/no-store; 401 before source access; 503 for incomplete required data.
  GET /api/integrations/wellness-airtable — separate bearer auth; private operational preview, no phone/email/signatures; previewRecords only, records=[]; no Airtable writes. See docs/WELLNESS_AIRTABLE_SYNC.txt.
  POST /api/integrations/clicksend-inbound — separate callback auth; JSON/form; exact opt-out commands; durable save before acknowledgment.

Allowed source reads: workshop (wellness-filtered), textPreference, programApproval; optional read-only wellness/ledger-v1.json. Only generated no/stop-reply preferences may be written; all deletes and other writes are denied. Source clients are fresh per request and strongly consistent. No automatic deployment, attendee sending or credential provisioning occurs.

See docs/WELLNESS_REMINDER_REVIEW.txt and docs/WELLNESS_CAPACITY_PLACEHOLDERS.txt for implementation boundaries, remaining migration/UI work and launch review.
