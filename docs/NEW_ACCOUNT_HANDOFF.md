# New Account Handoff

Use this when moving the Not Alone Summit app to a new ChatGPT/Codex account or inviting a collaborator.

## What To Transfer

Transfer the project code through GitHub or a clean archive. Transfer the conversation context by sharing the chat or by starting the new account from the project docs.

Do not transfer production secrets through chat, email, or a zip file. Keep Supabase service-role keys, OpenAI keys, Apple credentials, EAS tokens, and push credentials in secure environment variables.

## Recommended GitHub Setup

From this project folder:

```bash
cd /Users/sethwinterton/Documents/Codex/2026-08-31/files-mentioned-by-the-user-not
git init
git add .
git commit -m "Initial Not Alone Summit platform"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/not-alone-summit.git
git push -u origin main
```

Then invite the collaborator or new account in GitHub:

1. Open the GitHub repo.
2. Go to Settings.
3. Go to Collaborators and teams.
4. Invite by username or email.
5. Grant Write access for app work, or Admin access only if they should manage repo settings.

After the first push, use `CONTRIBUTING.md` and `docs/COLLABORATION_WORKFLOW.md` for branches, pull requests, checks, and review rules.

## New Account Startup Prompt

After cloning the repo in the new account, start a new Codex task and paste:

```text
You are continuing the Not Alone Summit platform. Read AGENTS.md, README.md, docs/ROADMAP_TO_LIVE_APP.md, docs/PRODUCTION_BACKEND_SETUP.md, docs/STAFF_OPERATIONS_RUNBOOK.md, docs/APP_STORE_CHECKLIST.md, and docs/GATE_0_REPORT.md before making changes. Preserve the monorepo architecture: apps/mobile is the Expo React Native attendee app, apps/admin is the Next.js staff portal, and packages/* are shared typed contracts/data. Do not expose secrets in mobile/browser bundles. Continue toward the live app roadmap.
```

## Local Setup On New Machine

```bash
pnpm install
pnpm snapshot:pull
pnpm lint
pnpm typecheck
pnpm test
pnpm dev:admin
pnpm dev:mobile
```

For native iPhone work, install Xcode and run:

```bash
xcode-select --print-path
xcodebuild -version
xcrun simctl list devices available
pnpm ios
```

## Current Shareable Project Docs

- `README.md`
- `AGENTS.md`
- `docs/ROADMAP_TO_LIVE_APP.md`
- `docs/PRODUCTION_BACKEND_SETUP.md`
- `docs/STAFF_OPERATIONS_RUNBOOK.md`
- `docs/DATA_MODEL.md`
- `docs/SECURITY_AND_PRIVACY.md`
- `docs/NOTIFICATIONS.md`
- `docs/OFFLINE_SYNC.md`
- `docs/APP_STORE_CHECKLIST.md`
- `docs/GATE_0_REPORT.md`

## Current Limits

- Real app-wide updates require a deployed Supabase backend.
- Real push notifications require EAS project ID, Apple push credentials, attendee device registration, and a server dispatch worker.
- Real staff AI requires server-side OpenAI credentials and review/approval workflow.
- App Store/TestFlight requires Apple Developer account setup and production EAS profiles.
