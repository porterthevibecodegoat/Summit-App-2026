# Notifications

The notification delivery system is implemented but disabled by default. No attendee message can be sent until credentials are added and both delivery feature flags are deliberately enabled.

## Implemented Flow

1. Atomic schedule publication regenerates reminder jobs tied to the new revision.
2. The worker claims due jobs in the database so overlapping workers cannot send the same job.
3. Active device registrations are divided into Expo-supported batches of at most 100.
4. Every provider request and ticket is recorded in `notification_delivery_attempts`.
5. Ticket IDs are reconciled against Expo receipts in a separate pass.
6. Transient failures return to the queue with bounded retries and backoff.
7. Permanent invalid-device responses disable the affected registration.
8. Staff can inspect queued, claimed, sent, delivered, failed, cancelled, and dead-letter state without exposing provider credentials.

Relevant routes:

- `GET /api/notifications/jobs` for authenticated staff visibility.
- `POST /api/notifications/dispatch` for authenticated manual dispatch.
- `POST /api/notifications/receipts` for authenticated receipt reconciliation.
- `POST /api/cron/notifications` for a secret-authenticated scheduler.
- `POST /api/devices/register` for rate-limited attendee registration.

## Safety Gates

Push remains blocked unless all required server values are valid and both of these flags are true:

```txt
ENABLE_PUSH_DELIVERY=true
ENABLE_NOTIFICATION_DISPATCH=true
```

The EAS project ID may be public configuration. Apple credentials, Expo access tokens, cron secrets, service-role keys, and provider secrets are server-only.

## Credential-Last Validation

- Confirm iOS permission copy and opt-in behavior.
- Register at least two physical test devices.
- Publish a staging revision with known reminder times.
- Verify one send, one receipt, duplicate-worker safety, retry behavior, cancellation, and invalid-token disabling.
- Confirm every attempt and operator action appears in audit/history.
- Leave production flags off until stakeholder approval immediately before event operations.
