# Live Event Incident Response

## Severity

- `P0`: attendee safety issue, materially wrong emergency guidance, unauthorized access, or widespread app outage during the event
- `P1`: incorrect live schedule affecting a large audience, failed publish, notification sent to the wrong audience, or staff portal unavailable
- `P2`: isolated content, layout, delivery, or device issue with an available workaround

## First Actions

1. Name one incident lead and record the start time.
2. Preserve the last known good revision and relevant audit entries.
3. Stop additional staff publishing while facts are confirmed.
4. Keep attendee communication factual, brief, and approved by event operations.
5. Never paste credentials, attendee tokens, or private logs into chat or public tickets.

## Schedule Or Content Error

1. Open History and identify the last known good revision.
2. Use rollback, which creates a new audited revision rather than deleting history.
3. Confirm the HTTPS snapshot revision changed.
4. Confirm a native device refreshes to the same revision.
5. Send a correction only after audience, wording, and timing are approved.

## Push Incident

Set both server flags to false:

```txt
ENABLE_PUSH_DELIVERY=false
ENABLE_NOTIFICATION_DISPATCH=false
```

Cancel or supersede unsent jobs, preserve delivery attempts, and reconcile accepted Expo tickets before deciding whether a correction is needed. Schedule sync continues without push.

## AI Incident

Set `ENABLE_AI=false`. Deterministic attendee and staff fallback answers remain available. Review server logs for prompt, grounding revision, schema validation, and provider response without exposing sensitive content.

## Staff Access Incident

Disable or delete the Supabase Auth identity, remove its `staff_profiles` record, revoke active sessions, and rotate affected secrets if compromise is suspected. Review publication and audit history for that actor.

## Backend Or Hosting Outage

The attendee app should continue using its last valid SQLite snapshot. Restore Vercel/Supabase service, verify `/api/health` and `/api/snapshot`, then foreground a test device and confirm recovery before resuming staff changes.

## Closure

Record impact, timeline, affected revisions/jobs, decisions, recovery evidence, and follow-up owner. Rotate exposed credentials and add a regression test for any code defect before closing the incident.
