# Gate 0 Report

Date: 2026-09-02

## Gate 0 Status

PASS

Gate 0 is approved to proceed by user direction on 2026-09-02 after the native iOS Simulator launch succeeded. Phase 1 professional app foundation work has begun; production credentials, push delivery, App Store submission, and paid/external resources remain gated.

## Architecture Summary

- `apps/mobile` is a React Native + Expo + TypeScript attendee app using Expo Router and native iOS Simulator development builds.
- `apps/admin` is a separate Next.js + TypeScript staff Event Control Portal.
- `packages/*` owns shared config, validation, domain logic, API contracts, design tokens, and schema-validated demo fixtures.
- Both apps consume the same canonical demo event snapshot from `@not-alone/test-fixtures`.
- Staff controls remain outside the attendee app.
- No production secrets are embedded in mobile or browser bundles.

## iOS Simulator Verification

- Xcode developer directory: `/Applications/Xcode.app/Contents/Developer`.
- Xcode version: Xcode 26.6, build 17F113.
- iOS runtime: iOS 26.5.
- Canonical simulator: iPhone 17 Pro.
- Simulator UDID: `54962C19-2228-43CB-A242-DBEAA2D13FC1`.
- Bundle identifier: `org.inspiringchildren.notalonesummit`.
- Expo SDK package: `57.0.19`.
- React Native: `0.86.3`.
- Build/launch command used from user Terminal:

```bash
pnpm --filter @not-alone/mobile exec expo run:ios --device "iPhone 17 Pro" --port 8081
```

Native result:

- Build succeeded with `0 error(s), and 1 warning(s)`.
- App installed on iPhone 17 Pro.
- App opened through `exp+not-alone-summit://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8081`.
- iOS bundle completed successfully through Expo Router entry.
- Initial attendee screen rendered shared demo event schedule data.
- Portrait iPhone layout and safe-area behavior were visually inspected from the running Simulator.

Evidence:

- `docs/evidence/gate-0-ios-simulator.png`
- The evidence file was copied from the visible iOS Simulator screenshot supplied during verification because the Codex sandbox still cannot call `xcrun simctl io booted screenshot` directly.

## Metro Watch Mode

- Initial failure: normal Metro watch mode hit macOS watcher limits with `EMFILE: too many open files, watch`.
- Resolution path:
  - Installed Watchman through Homebrew.
  - Added `.watchmanconfig`.
  - Tightened mobile Metro configuration to explicit shared package watch folders.
  - Excluded generated native build directories such as `ios/Pods` and `ios/build`.
  - Launched native Expo development build from user Terminal with Metro on `127.0.0.1:8081`.
- Fast Refresh is expected through the normal Expo development-build session. The running Simulator should update ordinary JavaScript/TypeScript screen edits without rebuilding; rebuilds are only required for native dependency/config changes.

## Expo Native Configuration

- `expo-dev-client` is installed and configured for development builds.
- `app.config.ts` defines app name, slug, scheme, portrait orientation, iOS bundle identifier, Expo Updates config, runtime version, and iOS notification usage text.
- `apps/mobile/eas.json` contains development, preview, and production profiles in the Expo app root.
- `runtimeVersion` is pinned to `0.1.0`, which is compatible with the generated native/bare workflow.
- Native dependencies passed Expo SDK alignment check using Expo's local dependency map.
- `updates.url` and `extra.eas.projectId` now target the organization-owned Not Alone Summit EAS project.

## Shared Demo Data

- `packages/test-fixtures` validates `demoSnapshot` with Zod before export.
- `pnpm snapshot:pull` exports the same snapshot to `apps/mobile/assets/demo-snapshot.json`.
- Staff API `/api/snapshot` serves the same event model.
- The model includes event ID, UTC schedule times, IANA event time zone, locations, visibility, eligibility, notification offsets, publication state, and revision metadata.

## Commands Run

- `pnpm install`: passed.
- `pnpm peers check`: passed.
- `pnpm snapshot:pull`: passed.
- `pnpm lint`: passed.
- `pnpm typecheck`: passed.
- `pnpm test`: passed.
- `pnpm --filter @not-alone/mobile exec expo install --check`: passed offline against Expo's local SDK map.
- `pnpm --filter @not-alone/admin build`: passed.
- `pnpm --filter @not-alone/mobile exec expo export --platform web`: passed.
- Staff portal local probe: passed.
- Staff `/api/snapshot` probe: passed.
- Development-only iPhone browser frame probe: passed.
- Native iOS development build from user Terminal: passed.

## Warnings

- Codex's sandbox cannot reliably talk to CoreSimulatorService, so native `simctl` commands must be run from the user's normal Terminal when direct simulator control is needed.
- Expo logged a non-blocking UIKit focus warning from `RCTScrollViewComponentView`.
- Expo Dev Launcher reported an ambiguous build-script dependency warning; the build still succeeded.
- Production EAS project identity is configured. App Store credentials, final content, and delivery credentials remain pending.

## Files Changed During Gate 0 / Early Phase 1

- `.node-version`
- `.watchmanconfig`
- `apps/admin/next.config.ts`
- `apps/admin/package.json`
- `apps/admin/app/page.tsx`
- `apps/admin/app/schedule/page.tsx`
- `apps/admin/app/styles.css`
- `apps/mobile/app.config.ts`
- `apps/mobile/metro.config.js`
- `apps/mobile/package.json`
- `apps/mobile/tsconfig.json`
- `apps/mobile/app/_layout.tsx`
- `apps/mobile/app/(tabs)/*`
- `apps/mobile/app/session/[id].tsx`
- `apps/mobile/assets/icon.png`
- `apps/mobile/assets/splash.png`
- `apps/mobile/ios/*`
- `packages/design-tokens/src/index.ts`
- `package.json`
- `pnpm-lock.yaml`
- `pnpm-workspace.yaml`
- `docs/evidence/gate-0-ios-simulator.png`

## Remaining Non-Blocking Notes

- The app is now past the rough scaffold and has a native tab foundation, but final brand assets, approved event data, production backend wiring, and App Store/TestFlight setup are still future phases.
- No real push notifications, email delivery, AI calls, or production publishing have been enabled.
