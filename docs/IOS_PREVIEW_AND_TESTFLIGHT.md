# iOS Preview And TestFlight

Canonical laptop preview:

```bash
pnpm dev:mobile
pnpm ios
```

Browser-constrained development preview:

```bash
pnpm mobile:web
pnpm mobile:preview
```

The browser frame in `apps/mobile/preview/index.html` embeds the real Expo web output in an iPhone-sized viewport and is development-only.

The EAS project, bundle identifier, and public privacy/support URLs are configured:

- Apple bundle identifier: `org.inspiringchildren.notalonesummit`
- Expo owner/project: `inspiring-children-foundation/not-alone-summit`
- EAS project ID: `5a79b65b-7080-4c27-84e1-8eb5e9d119fd`
- Production API: `https://summit-app-2026-admin.vercel.app`

After Apple access is available:

1. Confirm active Apple Developer Program membership and the organization team.
2. Confirm or create the matching App ID and enable Push Notifications.
3. Run `pnpm dlx eas-cli@latest credentials --platform ios` from `apps/mobile` and connect credentials to that Apple team.
4. Run an internal iOS preview build, install it on approved physical devices, and verify schedule sync, offline cache, notification registration, and receipt handling.
5. Keep both push flags false until that physical-device evidence passes.
6. Create the App Store Connect record, produce a production EAS build, and promote it to internal TestFlight only after content, legal, privacy, and release-owner approval.

TestFlight readiness still requires Apple credentials, reviewer access instructions, final content/legal approval, and explicit release authorization.
