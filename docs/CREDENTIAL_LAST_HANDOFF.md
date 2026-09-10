# Credentials-Last Handoff

Use this sequence only after the non-secret build and approved event content are ready. Never send secrets in chat, commit them, or place server values in `NEXT_PUBLIC_*` or `EXPO_PUBLIC_*` variables.

## 1. Deploy The Safe Baseline

Status: completed for staging on 2026-09-09. The portal/API is live over HTTPS, Supabase credentials are configured in their correct client/server boundaries, Auth redirects target the deployed portal, invite-only staff activation grants `ADMIN`, and publish-to-native snapshot sync has been verified through revision 3.

- Apply all five Supabase migrations to staging.
- Deploy the staff portal/API over HTTPS with AI and push flags false.
- Configure client-safe URLs/keys and server-only Supabase service credentials in the host secret store.
- Configure Supabase Auth redirects, create staff users, assign least-privilege roles, and require MFA for publisher/admin accounts.
- Verify route authorization, RLS, atomic publish, rollback, history, and attendee snapshot sync.

Rollback: disable the deployment or restore the previous host release. Published attendee data remains in the last valid revision.

## 2. Activate Push Separately

- EAS project creation and organization ownership are complete; confirm Apple push credential ownership.
- The public EAS project ID is in client-safe build configuration; add Expo/Apple credentials and `CRON_SECRET` only to server/provider stores.
- Keep `ENABLE_NOTIFICATION_DISPATCH=false` while validating device registration.
- Enable delivery in staging, send only to approved physical test devices, reconcile receipts, and validate retries/cancellation.
- Enable dispatch for event audiences only after sign-off.

Rollback: set both push flags false. Existing schedule sync continues without notifications.

## 3. Activate OpenAI Separately

- Status: server-only `OPENAI_API_KEY`, model configuration, and `ENABLE_AI=true` are deployed in Vercel; no key is present in the repository, browser bundle, or mobile bundle.
- Structured-output validation, strict proposal matching, ambiguous-command refusal, rate limits, and provider-failure fallback are implemented and covered by automated tests.
- Add provider account credits, then run the attendee, State AI, and Official Change AI live-model evaluation set before production sign-off.
- Review provider retention settings and approve production data-handling policy before event use.

Rollback: set `ENABLE_AI=false`. Deterministic attendee/staff fallbacks remain available.

## 4. Release Credentials

- Sign in to the organization-owned Apple Developer team and confirm active Apple Developer Program membership.
- Register or confirm the App ID `org.inspiringchildren.notalonesummit`, with Push Notifications enabled.
- Connect EAS project `5a79b65b-7080-4c27-84e1-8eb5e9d119fd` to the same Apple team and let EAS manage the distribution certificate, provisioning profile, and APNs key unless the organization has an established credential-management policy.
- Build an internal TestFlight release, inspect the signed bundle/environment, and complete physical-device and accessibility testing.
- Submit only after final policy URLs, content rights, privacy answers, reviewer notes, and stakeholder sign-off are complete.

## Final Secret Checklist

- Supabase server URL and service-role key.
- Supabase publishable key and public URL.
- Expo access token for automated EAS operations; the public EAS project ID is already configured.
- Apple Developer/App Store Connect signing and push credentials.
- Cron/scheduler secret.
- OpenAI API key and approved model.
- Hosting account/deployment access and production domain configuration.

Rotate credentials after setup, staff departures, suspected exposure, and according to the organization's security policy.
