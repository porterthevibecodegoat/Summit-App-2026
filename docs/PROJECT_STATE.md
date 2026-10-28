## October 28 owner follow-up — current repository identified; access pending

The owner supplied a new production repository and latest commit/tag. Our existing GitHub account cannot yet read that source (404; no pending invitation). Exact private handoff coordinates remain in the owner workspace. This older repository and draft PR are references only: hold merging/deploying them while scoped wellness changes are prepared against the verified current website source. Preserve the newer website and Git history; inspect a file-level port after access is granted.

Nick resolved the programming question: Airtable is authoritative when in doubt. Tuesday Life Plan is 9:00–9:45 AM, “Life Plan Preparedness with DBT expert Dr. Blaise Aguirre.” Added that decision to both affected signup review notes without clearing history, changing states or rewriting original labels/times. Three guest links remain unverified; explaining the uncertainty was not identity confirmation. All SMS stays disabled.

## October 28 follow-up — IMPLEMENTED matching / PARTIAL booking cutover

Current Airtable copy: 19 selections, all 19 activity links verified and 16 guest links verified; 3 identity matches remain pending. Contact/programming review notes are retained. Scheduled run 18817d23e3a84f4088fe2c412612f349 succeeded after the 7 reviewed updates and preserved them. Public catalog exactly matches all 32 owner policy IDs. Production website deploy 6ae23014e7ddc521294941ac is CLI-published, while the shared production branch remains 39f561d; no current source commit is available yet. Initial booking cutover also needs a decision on 2 selections for 1 chiropractic place and a legacy no-signup disposition. All SMS remains disabled; no website or booking data was changed. `docs/WELLNESS_CUTOVER_REVIEW.txt` is the current readiness checklist.

## October 28 — IMPLEMENTED LIVE: automatic wellness data mirror

Owner-approved Make connection is granted for Main NA Summit 2026 only. Data-only scenario 6805809 is Active every 30 minutes, with complete/fresh/exact-target guards and source-ID upserts. Nineteen source selections are present: the original 12 plus 7 newer real selections. All 247 mapped values verified exactly; corrected retry preserved record IDs and all protected links/notes. Link Review: 9 Needs matching, 5 Needs review, 5 Linked. No sender/delete step, source mutation or website deployment; SMS scenario 6765208 stays Inactive. This supersedes historical pending grant/writer and empty-table statements. Booking/capacity rollout remains PARTIAL. See `docs/WELLNESS_AIRTABLE_SYNC.txt`.

## October 27 — LIVE read-only feed / PARTIAL automatic sync

Companion deploy `6ae1722358b471bf0feaa9f1` serves the approved read-only feed from source `986b1d3`. All 12 source IDs and private/no-store/auth failure behavior verified. Main website deployment unchanged. Deployment token revoked; Make's separate restricted feed connection passed a read-only test. Automatic Airtable writer is pending a new base-limited OAuth permission grant; all scheduling/SMS remain inactive. See `docs/WELLNESS_AIRTABLE_SYNC.txt`.

## October 27 Airtable migration — IMPLEMENTED snapshot / PARTIAL ongoing sync

Owner-approved existing-record import is verified: 12 unique wellness selections, 5 people, 12 activity links and 10 verified guest links; 2 guest links remain unmatched. Seven rows have review details for identity/contact or source schedule differences. Original source data is preserved; booking admission and texting are not activated. The earlier empty-table note is historical. Automatic Make sync still needs connection/review; no deployment or SMS.

## October 27 Airtable wellness — PARTIAL

Owner authorized preparing wellness signup storage in Airtable. New table Wellness Signups exists with no records; its links/schema were verified. Preview-only web/companion feed is implemented locally; no live sync, data import or booking changes. Netlify retains original submissions/waivers and atomic booking authority. Contact details remain in All Summit Data under the existing privacy workflow. No deployment or SMS. See `docs/WELLNESS_AIRTABLE_SYNC.txt`.

## October 27 yoga amendment — draft only

All three yoga sessions are now limited to 20 each in the owner decisions and disabled runtime draft. The older canonical catalog now has 20 matched limited policies, 8 unlimited policies and 2 unset retired IDs. No live record, deployment or sending setting changed.

## October 27 pickleball amendment — draft only

Pickleball is now 10 per Monday/Tuesday/Wednesday activity in the owner choices and applicable disabled runtime draft. No production publication, attendee record or sending setting changed.

## October 27 wellness settings — IMPLEMENTED draft / PARTIAL source sync

Owner choices are saved for all 32 sheet rows, including unlimited blank limits and Life Plan at 20 per session with later manual workbook review. Exact-ID matches update the disabled capacity draft. The shared GitHub production branch still has the older 30-session source, so publication remains blocked by an explicit activation hold. No new live record, setting, deployment or SMS changed. Details: `docs/WELLNESS_OWNER_CAPACITY_CHOICES_2026-10-27.txt`.

## October 26 wellness follow-up — IMPLEMENTED locally / PARTIAL rollout

The disabled booking flow now includes public signup binding, durable source-save recovery, private view/cancellation, automatic FIFO promotion, staff management/private backup, and read-only initial migration planning. Source review remains in draft PR #2; nothing is merged, deployed or live. Actual capacities, reviewed real-record migration, legacy link recovery, restore rehearsal, provider/Make reconciliation and Nick’s complete-process/build approval remain required. All SMS stays disabled. See `docs/WELLNESS_BOOKING_WORKFLOW.txt`; historical foundation-only statements below are superseded for this branch.

## October 26 wellness branch — local implementation, no publication

**IMPLEMENTED locally:** wellness-only authenticated feed/STOP port, shared companion build, canonical 30-session mapping, and an atomic capacity/waitlist/cancellation engine with disabled placeholder settings. **PARTIAL:** public booking/cancellation UI binding, existing-record migration and production rollout are not complete. Staff approval/confirmation code and all live data/settings remain unchanged. This dated update supersedes the historical migration-only task statement for this branch; historical records below are retained. See `docs/WELLNESS_REMINDER_REVIEW.txt`.

# Project State

Recorded September 18, 2026 during migration (capture 11:30 UTC). CURRENTLY VERIFIED locally: Git branch/HEAD/status and safe source inventory. Runtime results are LAST KNOWN, not rerun in migration. Latest 421 web tests passed following the September 18 cleanliness pass (around 00:26 America/New_York in preceding session); web TypeScript passed before final CSS/copy pass, isolated web build before final portrait/cleanliness refinements. Full September 17 baseline passed 649 workspace + 27 script tests, lint/typecheck and both builds. Exact dates/scopes matter: no fresh full-current-state build claim. Public endpoints LAST KNOWN inspected September 17 22:02 UTC. External auth/config/deployed commits/migrations/RLS and physical release remain unverified.

## Product Status

| Area | Status | Evidence / limitation |
| --- | --- | --- |
| Native iOS attendee app | IMPLEMENTED | Expo/React Native app with schedule, current/next state, map/info, local cache, published-snapshot client, and removed personal schedule/demo mode. Physical-device production path remains unproven. |
| Staff Event Control Portal | IMPLEMENTED | Draft/publish/rollback, content/schedule controls, audit and notification foundations exist. Cloud configuration and staff access must be verified before live operations. |
| Public Summit site | IMPLEMENTED | Historical 2025 and current 2026 routes/content architecture exist. Latest local visual/content work is not evidence of deployment. |
| Public Awards site | IMPLEMENTED | Dark compact awards direction, RSVP and iHeart callouts, historical 2025 material, and 2026 promotional model exist. Some source facts still await approval. |
| Canonical publish model | IMPLEMENTED | Shared validated snapshot, revisions, RLS migrations, and server-side publish functions are present. End-to-end cloud proof still required. |
| Airtable 2026 import | PARTIAL | Reviewed data was used read-only for the active 2026 schedule; incomplete facts are intentionally not invented. |
| Push notifications | PARTIAL | Job/delivery architecture and mobile registration foundation exist. APNs/EAS credentials, physical iPhone delivery, retries/receipts, and opening behavior are unproven. |
| AI | PARTIAL | Server-side adapters and guardrails exist. Current billing/credit, enabled state, production behavior, and evaluations require targeted verification. |
| App Store / TestFlight | PLANNED | Apple enrollment, signing, privacy/reviewer material, EAS credentials, and release proof are incomplete. |
| Public transactions / contact flows | PARTIAL | A separate RSVP deployment exists, but ownership, data sharing, phone requirement, privacy, and lifecycle require confirmation. Retired public submission flows must not be reintroduced casually. |

## Current Content Rules

- 2025 is a historical archive drawn from original ICF material.
- 2026 is current event content drawn only from reviewed Airtable records and explicit owner decisions.
- Live API revision 9 was checked on September 17 around 22:02 UTC: 26 timed activities, 53 guest records, and five incomplete entries represented in pending-program notes. The preserved local operational store also has revision 9, 26 sessions, and 53 guests.
- Current local reviewed config/fixtures contain 51 guests, excluding Steven Cohen and Alexandra Cohen from attendance while retaining the foundation credit. This follows an existing recorded source review, not a new Airtable inspection in this task. Local filtering and live publication are not synchronized; reconcile approved source data through the staff workflow before making a cross-platform count claim.
- The local Awards UI uses the approved 7:00 PM pre-show correction; the inspected live Awards page and API still say 7:30 PM. No publication occurred in this baseline task.
- Incomplete 2026 details must stay "to be confirmed" rather than receiving invented ends, rooms, speakers, roles, access rules, or biographies.
- Producer/chair credits follow the original ICF allowlist, not Airtable attendance or collaborator lists.
- **IMPLEMENTED locally:** Cherrial Odell's co-chair credit now appears on both current Awards and Summit pages under explicit owner approval on September 17. Her existing original ICF portrait and "Inspiring Children Alumna" credit are reused. Guest counts, canonical API data and the 2025 archive are unchanged; no deployment or mobile/staff roster mutation was performed. Those apps have no separate co-chair presentation to update.

## Local Worktree

**IMPLEMENTED locally / PARTIAL content (September 18):** Summit centered navigation (Awards tab added Sept 18), short 9-18s video loop/direct full-film link, reference-site periwinkle/lavender/pink palette with heart-hands header logo (Sept 18, replaced plum/pearl/mint), simplified categorized gallery, Partners/Venue pages and final cleanliness pass. Awards approved layout retained. Both current contexts share Wolfington and Springer couple cards/photos/profiles; Caroline face crop, Lexi full portrait and distinct Bryan photos implemented. Additional partner logos blocked by interface-only Airtable access. See CURRENT_WORK and SUMMIT_REFRESH. No deploy/publication.

The worktree is intentionally dirty with accumulated owner-authorized changes across mobile, admin, web, shared packages, scripts, tests, documentation, and assets. Do not clean, reset, or bulk-revert it. Inspect provenance before changing files; no claim of collaborator removal should erase later owner-authorized reliability, security, or 2026 work.

CURRENTLY VERIFIED HEAD `a60ba26ce4cc70e11f54cb150d5777bcaebdb03f`, branch `codex/awards-2026-polish`; origin https://github.com/porterthevibecodegoat/Summit-App-2026.git. Migration start: 68 modified tracked, 135 individual untracked, zero staged. Migration adds/updates documentation only; exact final file lists in MIGRATION_STATE.json and transfer integrity/GIT_STATE.json. Existing modifications span mobile/admin/web/packages/scripts/tests/docs/assets and appear intended; next-env.d.ts is generated but tracked and byte-preserved, not cleaned. Frozen CODEX_PROJECT_HANDOFF is duplicate historical provenance, retained/superseded. Known local upstream origin/codex/awards-2026-polish shows 0 ahead/0 behind; no fetch so actual remote freshness UNKNOWN. No checkpoint commit.

Protected earlier recovery checkpoint exists at the active task outputs/Summit-App-2026-recovery-20260917T224459Z, with a tar.gz and dated offline verification. It predates later UI changes and is not imported because it includes operational recovery data. Migration is a newer safe-source transfer, not a sensitive-data/full-history backup.

## Recent Local Verification

Fresh September 17 checks passed in an isolated copy of the exact current source: `pnpm lint`, `pnpm typecheck`, 649 workspace tests, 27 additional HTTP-audit script tests, and both web/admin production builds using default Turbopack. Node 24.19.0 and pnpm 11.19.0 were used. Lint currently runs TypeScript checks, not a separate lint engine. No failures or repairs occurred. Original source, private configuration, and local operational data were preserved. This is local verification, not production or physical-device release approval.
