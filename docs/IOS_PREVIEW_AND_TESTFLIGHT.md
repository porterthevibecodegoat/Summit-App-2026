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

The EAS project, bundle identifier, and public privacy/support URLs are configured. TestFlight readiness still requires Apple credentials, reviewer access instructions, and explicit release authorization.
