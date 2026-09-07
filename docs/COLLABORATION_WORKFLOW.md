# Collaboration Workflow

Use GitHub as the source of truth for code and docs. Use Codex/ChatGPT for assisted implementation, review, and planning.

The deployed staff portal is the source of truth for live event content operations. Do not treat staff portal edits and code edits as the same workflow.

## Recommended Setup

1. Keep `main` stable.
2. Create feature branches for each focused workstream.
3. Open pull requests into `main`.
4. Require CI to pass before merge.
5. Use screenshots or simulator evidence for UI changes.

## Codex And Staff Portal Split

- Use Codex for app code, staff portal code, shared packages, tests, deployment configuration, and documentation.
- Use the staff portal for schedule edits, speaker changes, map/content updates, emergency alerts, and approved event-day publishing.
- Do not let Codex-generated code bypass pull request review before production deployment.
- Do not let staff portal content changes require an App Store rebuild unless the app shell itself changes.
- Keep production secrets in hosting/Supabase/OpenAI/Apple dashboards, not in prompts or committed files.

## Suggested Workstreams

- `feature/mobile-home-polish`: attendee home, schedule, map, help, and session detail polish.
- `feature/admin-live-ops`: schedule workbench, publishing, history, and notification controls.
- `feature/backend-supabase-staging`: Supabase project, migrations, RLS, staff auth, and API deployment.
- `feature/push-notifications`: EAS project ID, APNs credentials, device registration, dispatch worker, and delivery audit.
- `feature/ai-operator`: State AI, Official Change AI, proposal approval, evals, and audit logging.
- `feature/app-store-readiness`: icons, splash, privacy policy, reviewer notes, TestFlight, and release checklist.

## Pull Request Review Checklist

- Architecture still follows `AGENTS.md`.
- Mobile and staff read from shared contracts where appropriate.
- Event facts remain centralized and schema-validated.
- Production credentials are not committed.
- Staff mutations are validated server-side.
- AI cannot bypass staff review or publish confirmation.
- Notification logic is tied to published revision IDs.
- Essential attendee information still works if AI, analytics, or push delivery fails.

## Branch Protection Recommendations

Configure these in GitHub after the repo is pushed:

- Require pull request before merging.
- Require status checks to pass.
- Require branches to be up to date before merging.
- Require conversation resolution before merging.
- Restrict force pushes on `main`.
- Require linear history if the team prefers clean history.

## Codex Handoff Prompt

Use this in new Codex tasks:

```text
Read AGENTS.md, README.md, CONTRIBUTING.md, docs/COLLABORATION_WORKFLOW.md, docs/ROADMAP_TO_LIVE_APP.md, docs/PRODUCTION_BACKEND_SETUP.md, docs/STAFF_OPERATIONS_RUNBOOK.md, and docs/GATE_0_REPORT.md first. Continue from the existing monorepo. Do not rebuild the app from scratch. Keep apps/mobile as the Expo React Native attendee app, apps/admin as the Next.js staff portal, and packages/* as shared typed contracts/data/domain logic.
```
