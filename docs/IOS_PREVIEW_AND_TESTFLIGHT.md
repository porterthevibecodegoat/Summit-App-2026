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

TestFlight readiness requires EAS project configuration, a real bundle identifier decision, Apple credentials, reviewer access instructions, privacy-policy/support URLs, and explicit authorization.
