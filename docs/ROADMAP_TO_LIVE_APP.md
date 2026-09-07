# Roadmap To Live App

This is the practical path from the current development build to a fully usable Not Alone Summit attendee app, staff control portal, and App Store-ready release.

Current production readiness is tracked in `docs/PRODUCTION_READINESS_AUDIT.md` and can be checked with `pnpm production:readiness`.

## Current Foundation

- The repo is a true monorepo with `apps/mobile`, `apps/admin`, shared typed packages, and Supabase migrations.
- The attendee app runs as a native Expo development build and reads the same validated event snapshot model as the staff portal.
- The staff portal has a local live-ops adapter, drag-and-drop schedule workbench, State AI preview, Official Change AI proposal workflow, import staging, publish confirmation, publish diff preview, rollback controls, notification job visibility, and activity history.
- Staff portal navigation now covers the major operating lanes: overview, schedule, Ask AI, make changes, import, notifications, emergency, history, and settings.
- Schedule quality gates detect not-ready rows, missing titles/locations, bad times, duplicate session IDs, missing reminder offsets, unclear day labels, and same-room overlaps.
- The shared demo snapshot export is schema-validated before the mobile app consumes it.
- Supabase-ready server code exists for drafts, revisions, audit records, attendee device registrations, and notification jobs.
- Supabase staging is connected, seeded, and readable by the staff portal API.
- Codex-assisted development is intended to operate through the GitHub/repo workflow, while event staff operate through the deployed staff portal.

## Next Product Milestones

1. Deploy staging staff portal/API.
   - Use the connected Supabase staging project.
   - Deploy the Next.js staff portal/API to a public HTTPS staging URL.
   - Configure Supabase Auth redirect URLs for that staging domain.
   - Point staging mobile builds at the deployed `/api/snapshot` endpoint.
   - Run RLS tests against staging data.

2. Formalize Codex collaboration workflow.
   - Push the current monorepo to the canonical GitHub repository.
   - Use Codex tasks/branches/pull requests for app-code changes.
   - Keep staff portal content publishing separate from code deployment.
   - Require checks and review before merging Codex-generated production code.
   - Use the staff portal for live schedule/content changes after deployment.

3. Finish production staff operations.
   - Replace local role fallback with real staff sign-in.
   - Add import job history for uploaded PDFs and spreadsheets.
   - Add approval/rejection workflow for AI-generated proposals.
   - Expand rollback with named restore points, operator notes, and per-revision comparison.

4. Finish app-wide sync.
   - Point the mobile app at the deployed snapshot API.
   - Add realtime or interval refresh for published revisions.
   - Keep offline cache fallback for schedule, map, help, and event info.
   - Show a quiet “updated” state when the app receives a new revision.
   - Move My Schedule from local persistence to account/device synced persistence once attendee accounts are introduced.

5. Finish push notifications.
   - Configure EAS project ID and Apple push credentials.
   - Enable attendee device registration only in production/staging builds.
   - Build the server-side notification dispatch worker.
   - Add delivery logs, retry status, and cancel/reschedule behavior.
   - Test notifications on real devices before App Store submission.

6. Finish real AI.
   - Add server-side OpenAI credentials.
   - Ground State AI in published snapshots, drafts, audit logs, notification jobs, and import jobs.
   - Ground Official Change AI in the same data, but require staff review before mutation.
   - Add evals for schedule edits, time changes, speaker swaps, audience changes, and notification safety.

7. Professionalize final attendee UX.
   - Replace all placeholder event facts with approved content.
   - Add final speaker images, venue maps, FAQ/help copy, sponsor/partner copy, and accessibility review.
   - Tune iPhone layouts across current small, standard, Pro, and Pro Max devices.
   - Complete a no-warning native simulator pass and real-device TestFlight pass.

8. Prepare App Store release.
   - Replace app icon and splash assets.
   - Add privacy policy, support URL, data inventory, and reviewer notes.
   - Configure EAS production build profiles.
   - Submit to TestFlight first, then App Review after stakeholder sign-off.

## Definition Of Done

- Staff can safely update schedule, speakers, locations, visibility, event info, map data, and notifications from the portal.
- Published changes update every attendee app through the canonical published snapshot.
- Push notifications are sent only by the server worker and are tied to published revision IDs.
- AI can explain current state and propose official changes, but cannot bypass staff review, audit logs, or publish confirmation.
- The iOS app works offline for essential event information and refreshes cleanly when connectivity returns.
- The release has zero known P0/P1 defects, passes required checks, and has native iPhone evidence before App Store submission.
