# Original Site Restoration

Requested by the owner on September 16, 2026. The confirmed split is the original
Summit/Awards presentation with separate historical 2025 and approved 2026 content.

## Content provenance

- Source pages: `https://www.inspiringchildren.org/summit` and
  `https://www.inspiringchildren.org/awards`.
- `apps/web/lib/original-sites.json` records source URLs, capture date, source HTML
  SHA-256 hashes, full page copy, portrait names/affiliations, original image URLs,
  and profile destinations. It contains inert data, not executable copied HTML.
- `original-assets.json` maps 109 original image URLs to versioned local files.
  Rendering does not depend on the original site's image server. Fonts are also
  local, with their open-font license included.
- These live source pages already display some 2026 dates alongside their older
  rosters. Those dates are deliberately not treated as historical dates or proof
  of 2026 attendance. The archive is labeled 2025; expired RSVP flows are closed.
- The Summit archive preserves 66 directory portrait entries, five leadership/host
  entries and six production credits. The Awards archive preserves 75 portrait
  entries including its host, plus all 18 original award descriptions. These are
  entry counts, not counts of unique people.
- Original section order, branding, Poppins typography, black portrait captions,
  Summit artwork and black Awards presentation are restored. Year navigation and
  working links to the event companion are intentional adaptations.
- The foundation mission, partner credits, alumni, footer disclaimer and social
  destinations are retained. Business leaders are no longer grouped under Experts.
- A malformed original Rachel Platten image tag was recovered from its valid
  `srcset`; its name and image were not omitted.

## Year boundary

The 2026 directory reads only our canonical staff-published snapshot. It does not
fall back to the collaborator's handwritten profiles when publication is inactive,
withdrawn or unavailable. Historical award categories, broadcast claims, hosts,
Villa Bibbiani and unconfirmed production credits are not advertised as 2026 facts.
The original producer allowlist remains enforced. Airtable was not edited.

## Native app rollback boundary

Git author/history inspection identified the collaborator's native contributions in
`c28ebd4`, `75fc490`, `b2f328f` and `040f2bc`. The People/Awards tabs, their routes,
the later presentation component dependent on those routes, and 22 introduced
portrait assets were removed. Home, Schedule, Ask AI, Map and Info remain.

This is a scoped rollback, not a reset to an old repository commit. Our later
responsive work, cache recovery, security fixes, 2026 ROS and production API
configuration are retained. Applied database migrations and publication history
are not destructively rolled back.

## Access boundary

See `PROJECT_OWNERSHIP.md`. GitHub was rechecked: only the owner is a collaborator;
repository invitations and webhooks are empty. The earlier Supabase, Expo and
Vercel separation is documented there. Public forks/copies may continue to exist,
but they do not automatically merge into our repository.

The previously shared owner GitHub credential is still a separate revocation
gate. Do not claim complete credential isolation until revocation is verified.

## Verification commands

- `pnpm lint`, `pnpm typecheck`, `pnpm test`
- `pnpm --filter @not-alone/web build`
- `pnpm test:website-acceptance`
- `node scripts/verify-original-sites.mjs`
- `pnpm test:reviewed-content`
- `pnpm test:responsive`
- iOS Simulator Release build, five-tab inspection and `pnpm mobile:sync-verify`

Visual outputs and per-run results are stored under ignored `work/acceptance/`.
These checks do not represent physical-device push tests, Apple signing, App Store
approval or final editorial approval of still-incomplete 2026 facts.

## Verified results (September 16, 2026)

- Lint, typecheck, and all 130 unit tests passed; website and admin builds passed.
- Responsive suite: 378 passed and 28 intentionally skipped across 29 viewport
  configurations. The outage scenario runs on its representative viewport only.
- Original-site verification: all 16 route/viewport combinations passed, including
  image loading, source names, year separation, overflow and JavaScript errors.
- Website acceptance: 12 routes at three widths, mobile navigation and 63 internal
  link destinations passed. Reviewed-content publication/withdrawal checks passed.
- iOS Simulator Release build succeeded. The restored five-tab app was inspected;
  all six mobile sync checks passed against production revision 9 (26 sessions).
- The production staff browser required sign-in. Authenticated staff editing and
  publishing were not manually retested as part of this restoration.
