# Not Alone Summit 2026 — Master Project Transfer and Exact Recreation Report

## Read this first

This project is **an exact continuation and recreation of an existing Not Alone Summit website and app**, not a new unrelated concept. The receiving account must preserve the existing design, content, routes, attendee classifications, photographs, biographies, awards pages, mobile app, staff portal, backend model, and Git history.

Do not recreate the project from memory, screenshots alone, or a blank template. Transfer and use the complete repository. The repository is the authoritative copy of every tracked source file and approved asset.

Current repository:

- GitHub owner: `porterthevibecodegoat`
- Repository: `Summit-App-2026`
- Branch: `main`
- Remote: `https://github.com/porterthevibecodegoat/Summit-App-2026.git`
- Required Node version: `>=22.13.0`
- Required package manager: `pnpm@11.19.0`

The receiving account must read `AGENTS.md`, `README.md`, this report, and the referenced documents before modifying the project.

## What “complete transfer” means

A complete transfer includes all of the following. Missing any one of these can produce an incomplete or nonfunctional recreation.

1. The entire Git repository, including every tracked branch, commit, tag, image, migration, script, package, and document.
2. The website in `apps/web`.
3. The native Expo/React Native attendee app in `apps/mobile`.
4. The staff Event Control Portal in `apps/admin`.
5. Every shared package under `packages`.
6. Every Supabase migration and seed file under `supabase`.
7. Every image and brand asset under `apps/web/public` and `apps/mobile/assets`.
8. The lockfile and workspace configuration so dependency versions remain reproducible.
9. Deployment projects, environment-variable names, and securely re-entered secret values.
10. Supabase database, authentication, RLS policies, storage, functions, and data.
11. Expo/EAS project ownership, build credentials, Apple Developer/App Store Connect access, and push-notification credentials where applicable.
12. Domain configuration for `notalonesummit.org` and permanent redirects from the existing Squarespace paths.
13. Verification of both 2025 and 2026 routes after transfer.

Never send passwords, personal access tokens, Supabase service-role keys, OpenAI keys, Apple credentials, webhook secrets, or Expo tokens in chat, email, a Git commit, or a source archive.

## Project architecture that must be preserved

This is a pnpm monorepo. Do not flatten it into a single site and do not replace the native attendee app with a WebView or PWA.

- `apps/web`: public Next.js summit website, directory, profiles, schedule, map, contact, donations, RSVP, messaging endpoints, AI page, and the 2025/2026 awards pages.
- `apps/mobile`: Expo Router React Native attendee app for iOS, Android, and a development web target.
- `apps/admin`: Next.js staff Event Control Portal.
- `packages/config`: validated shared environment and event configuration.
- `packages/design-tokens`: shared palette and typography values.
- `packages/domain`: schedule, time-zone, publication, and live-event rules.
- `packages/validation`: Zod schemas and shared contracts.
- `packages/api-client`: typed attendee snapshot client.
- `packages/test-fixtures`: validated demo event snapshot.
- `supabase/migrations`: canonical database, security, publishing, notifications, and ticket-reservation migrations.
- `supabase/seed`: development seed data.
- `scripts`: verification, snapshot, release, and local-development utilities.
- `docs`: production, privacy, App Store, backend, collaboration, and release documentation.

Canonical event data must continue to come from the published backend model. Staff drafts must not become visible to attendees until publication. Elevated credentials must remain server-side.

## Public website routes that must survive the transfer

- `/` — 2026 summit homepage.
- `/2025` — 2025 summit view.
- `/directory/[slug]` — individual profile with biography and messaging option.
- `/awards` — redirects to the current 2026 awards page.
- `/awards/2026` — default 2026 Not Alone Awards page.
- `/awards/2025` — preserved 2025 Awards page.
- `/schedule`
- `/map`
- `/contact`
- `/donate`
- `/ask-ai`
- `/api/ask-ai`
- `/api/messages`
- `/api/tickets`
- `/manifest.webmanifest`

The website must preserve the pastel purple, cream, pink, and soft blue visual system; the Challenge favicon; the Not Alone Summit branding; the Inspiring Children Foundation footer; the Join the #NotAloneChallenge banner; the recap video followed by Jewel’s quote; the category navigation; four profile cards per desktop row; responsive layouts; profile biographies; and the ability to message a person.

The Awards routes must use the black Not Alone Awards logo as both the page logo and Awards favicon. The 2026 page is the default. The 2025 page remains separately selectable.

## Current approved directory rules

The receiving account must preserve these decisions unless the owner supplies a later correction:

- Jewel, Steve Wozniak, and Cherrial Odell are co-chairs. Kase Murray is not a co-chair or musician; he is an attendee.
- Loni Love is the Awards host and is described as a comedian.
- Melinda & Noah Springer are confirmed 2026 founders.
- Raquel Stevens and Margaret Hines are in Business Leaders & Philanthropists.
- Sarah Steil is a musician.
- Anthony Ramos is a musician and actor, not an Entertainers & Athletes entry.
- Brandon Saho is in Entertainers & Athletes.
- Dr. Caroline Silby is in Entertainers & Athletes.
- Lexi Hensler is described as `Social media influencer and Entrepreneur`.
- Mario Martinez and Alana Springsteen have been removed from the 2026 Entertainers & Athletes roster.
- Caroline Jones is a musician and sponsor. Nick Dana is a sponsor.
- The 2026 directory must not automatically inherit people from the 2025 Talent Information archive. A person appears in 2026 only when confirmed in the supplied 2026 attendance screenshots or explicitly added by the project owner.
- The shared Drive folder is a source of approved historical headshots, not authority to add every folder name to 2026.

The central public directory source is `apps/web/lib/people.ts`. The corresponding mobile presentation data is in `apps/mobile/app/(tabs)/people.tsx`. Update both when changing public roster facts.

## Recommended ownership transfer: transfer the existing GitHub repository

This is the best method because it preserves the code, Git history, issues, pull requests, releases, settings, and links.

The current repository owner should:

1. Open `https://github.com/porterthevibecodegoat/Summit-App-2026`.
2. Select **Settings**.
3. Under **General**, scroll to **Danger Zone**.
4. Select **Transfer ownership**.
5. Enter the exact new GitHub username or organization and confirm the repository name `Summit-App-2026`.
6. Complete GitHub’s confirmation prompts.
7. If transferring to a personal account, the receiving owner must accept GitHub’s email promptly; GitHub transfer invitations can expire.
8. After acceptance, verify that `main`, commit history, settings, issues, pull requests, releases, and collaborators are present.
9. Review branch protection, Actions permissions, environments, secrets, deploy keys, webhooks, GitHub Apps, Pages settings, and Dependabot settings. Re-authorize or recreate anything account-scoped.

After transfer, every local checkout must update its remote:

```bash
cd /path/to/Summit-App-2026
git remote set-url origin https://github.com/NEW_GITHUB_OWNER/Summit-App-2026.git
git fetch origin
git branch --set-upstream-to=origin/main main
git status
git log -1 --oneline
```

Do not paste a GitHub personal access token into a command, chat, screenshot, or remote URL. Use GitHub Desktop, SSH, or `gh auth login` through the receiving account.

## Alternate Git transfer when repository ownership cannot be transferred

Create a new empty repository under the receiving account. Do not add a README, license, or `.gitignore` during creation. Then use a mirrored transfer from an authenticated terminal:

```bash
git clone --mirror https://github.com/porterthevibecodegoat/Summit-App-2026.git
cd Summit-App-2026.git
git push --mirror https://github.com/NEW_GITHUB_OWNER/Summit-App-2026.git
cd ..
git clone https://github.com/NEW_GITHUB_OWNER/Summit-App-2026.git
```

This moves every Git ref and every committed file. It does not automatically transfer GitHub issues, pull requests, repository secrets, webhooks, deployment projects, Supabase, Expo, Apple credentials, or domains. Those must be handled separately.

## Exact source verification

On the current machine before transfer:

```bash
git status --short
git rev-parse HEAD
git fsck --full
git ls-files
```

On the receiving account after cloning:

```bash
git status --short
git rev-parse HEAD
git fsck --full
git ls-files
```

The source and destination `git rev-parse HEAD` values must match. The destination working tree must be clean. `git fsck --full` must finish without corruption.

The optional `Summit-App-2026-transfer.bundle` created with this handoff is an offline Git backup containing all local branches and complete repository history. Restore it with:

```bash
git clone Summit-App-2026-transfer.bundle Summit-App-2026
cd Summit-App-2026
git remote set-url origin https://github.com/NEW_GITHUB_OWNER/Summit-App-2026.git
git push --all origin
git push --tags origin
```

The optional `Summit-App-2026-source.zip` is a clean snapshot of the committed files only. It is a backup, not the preferred transfer method, because it does not contain Git history.

## Fresh-machine setup

Install Git, Node.js 22.13 or newer, Corepack, and pnpm 11.19. For native app work, install Xcode and the current supported Expo/EAS tooling.

```bash
git clone https://github.com/NEW_GITHUB_OWNER/Summit-App-2026.git
cd Summit-App-2026
corepack enable
corepack prepare pnpm@11.19.0 --activate
pnpm install --frozen-lockfile
```

Public website:

```bash
pnpm --filter @not-alone/web dev
pnpm --filter @not-alone/web typecheck
pnpm --filter @not-alone/web build
```

The local public website is configured for `http://localhost:3001`.

Staff portal:

```bash
pnpm dev:admin
pnpm --filter @not-alone/admin typecheck
pnpm --filter @not-alone/admin build
```

Attendee app:

```bash
pnpm dev:mobile
pnpm ios
pnpm mobile:web
pnpm mobile:preview
```

Repository gates:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm production:readiness
```

Read `docs/IOS_PREVIEW_AND_TESTFLIGHT.md`, `docs/APP_STORE_CHECKLIST.md`, and `docs/RELEASE_QA_MATRIX.md` before describing the mobile app as release-ready.

## Environment variables and secrets

The receiving account must copy the variable **names** from these files and securely re-enter the values in each new service:

- `.env.example`
- `apps/web/.env.example`
- `apps/admin/.env.example`
- `apps/mobile/.env.example`

Important groups include:

- Public app configuration: event ID, event name, organization, event time zone, API base URL, and environment name.
- Supabase public values: public URL and publishable/anonymous key.
- Supabase server-only value: service-role key.
- OpenAI server-only values: API key and selected model.
- Expo/EAS: project ID and access token.
- Push and notification switches and credentials.
- Web messaging webhook URL and secret.
- Ticket reservation webhook URL and secret.
- Cron secret.
- App Store privacy and support URLs.

Never copy production values into source control. Never expose server-only keys in a variable beginning with `NEXT_PUBLIC_` or `EXPO_PUBLIC_`. Rotate any credential that has ever appeared in chat, screenshots, a terminal transcript, or Git history.

## Supabase and data transfer

The repository contains schema and policy definitions, but the live database and authentication users are external state. They do not move just because GitHub moves.

1. Decide whether the existing Supabase project will remain owned by the current organization or move to a new organization.
2. If transferring the existing project, use Supabase organization/project ownership controls and verify billing and team membership.
3. If creating a replacement project, apply every migration under `supabase/migrations` in filename order.
4. Use `supabase/seed/demo.sql` only for development/demo environments.
5. Recreate secure server environment variables in the new Vercel projects.
6. Verify Auth redirect URLs, RLS policies, storage buckets, Edge Functions, cron jobs, and service-role access.
7. Run `pnpm supabase:check`, `pnpm security:rls`, and the documented staging verification before production cutover.

Read `docs/PRODUCTION_BACKEND_SETUP.md`, `docs/SUPABASE_STAGING_SETUP_CHECKLIST.md`, `docs/DATA_MODEL.md`, `docs/SECURITY_AND_PRIVACY.md`, and `docs/CREDENTIAL_LAST_HANDOFF.md` before changing backend ownership.

## Vercel transfer and website deployment

There are two distinct Next.js deployments:

- `apps/admin` — staff portal/backend surface.
- `apps/web` — public summit and awards website.

If an existing Vercel project is already live, transfer it instead of recreating it when possible:

1. The current Vercel project owner opens **Project → Settings → General**.
2. In **Transfer Project**, choose the receiving Vercel team.
3. Review the domains, aliases, and environment variables shown in the transfer dialog.
4. Complete the transfer.
5. Reinstall account-scoped integrations and verify any environment variables that Vercel did not carry over.
6. Verify the Git repository link now points to the receiving GitHub owner.

For a new public-web deployment, import the transferred GitHub repository into Vercel and set the project root directory to `apps/web`. Select Next.js and use the repository lockfile. Add all `apps/web/.env.example` variables that the production features actually require. Deploy to a temporary Vercel URL and fully test it before changing DNS.

Do not point the public domain at `localhost`, a preview-only URL, or an unverified build.

## GoDaddy instructions for the domain owner

The domain owner does **not** need to share a GoDaddy password. The safer options are either (a) the owner enters the records personally, or (b) the owner grants restricted delegate access to only the required domain with transfer permission disabled.

### Safest option: the owner enters the DNS records

Do this only after `apps/web` has a successful production deployment and the receiving Vercel project has both `notalonesummit.org` and `www.notalonesummit.org` added under **Project Settings → Domains**.

1. In Vercel, open the public website project, then **Settings → Domains**.
2. Add `notalonesummit.org` and `www.notalonesummit.org`.
3. Copy the exact A, CNAME, and any TXT verification records Vercel displays. The exact values shown in the project are authoritative.
4. The GoDaddy owner signs in and opens **Domain Portfolio → notalonesummit.org → DNS → Manage DNS**.
5. Export the DNS zone or take screenshots before changing anything.
6. Preserve all MX records and email-related TXT records, including SPF, DKIM, and DMARC. Do not change email records.
7. Remove the existing domain forwarding that sends `notalonesummit.org` to `inspiringchildren.org/summit`.
8. Replace only the conflicting website records for host `@` and `www` with the exact records Vercel supplied. If Vercel asks for a TXT ownership-verification record, add it exactly.
9. Keep a short TTL during cutover when practical, then save.
10. Return to Vercel and wait for both domains to show verified and for SSL to be issued.
11. Configure one canonical address and redirect the other, normally `www.notalonesummit.org` to `notalonesummit.org`.
12. Test the homepage, directory profiles, `/awards/2026`, `/awards/2025`, schedule, map, contact, donations, RSVP, and APIs before removing the old pages.

Vercel publishes general-purpose examples such as an apex A record and a `www` CNAME, but the owner must use the exact values displayed for this specific project because verification values can differ.

### Optional restricted GoDaddy delegate access

The owner can grant access without revealing credentials:

1. The owner opens GoDaddy **Delegate Access** and selects **Invite to Access**.
2. Enter the delegate’s name and email.
3. Select **Domains Only** access.
4. In GoDaddy **Domain Portfolio**, create or select a folder containing only `notalonesummit.org`.
5. Edit the folder permissions for the delegate.
6. Turn **Management Access** on for that folder.
7. Keep **Transfer Access** off. Transfer Access is not required to edit DNS and would allow materially broader actions.
8. Ensure the delegate does not retain management access to the **All Domains** folder if the owner wants access restricted to this single domain.
9. Remove delegate access after DNS and verification are complete.

## Redirecting the two existing Inspiring Children URLs

`https://www.inspiringchildren.org/summit` and `https://www.inspiringchildren.org/awards` are paths on the existing `inspiringchildren.org` website. They are not domains or DNS subdomains. GoDaddy DNS cannot redirect these two paths separately.

The person with administrator access to the existing Squarespace site must create permanent URL mappings after the new website is live:

```text
/summit -> https://notalonesummit.org/ 301
/awards -> https://notalonesummit.org/awards/2026 301
```

In Squarespace:

1. Verify the new target pages are live and return successfully.
2. Change the old `/summit` and `/awards` pages so those old URLs no longer resolve to active pages. Archive, disable, delete, or change their slugs only after preserving any needed content.
3. Open **Settings → Developer Tools → URL Mappings**.
4. Add the two mappings above on separate lines.
5. Save and test both old URLs in a private/incognito window.
6. Keep these 301 redirects indefinitely so old links and search rankings transfer to the new pages.

Do not delete the entire Inspiring Children website. Only retire the two replaced paths after the new site and redirects have been verified.

## Ready-to-send message for the GoDaddy/Squarespace owner

```text
Thank you—you do not need to share the GoDaddy password. We are moving the existing Not Alone Summit experience to the new website, not creating an unrelated replacement.

First, we will deploy the complete new public website and add notalonesummit.org and www.notalonesummit.org in the new Vercel project. I will then send you the exact A, CNAME, and any TXT verification values displayed by Vercel.

In GoDaddy, please open Domain Portfolio → notalonesummit.org → DNS → Manage DNS. Before changing anything, export or screenshot the current DNS records. Please preserve every MX and email-related TXT record, including SPF, DKIM, and DMARC. Remove the current forwarding to https://www.inspiringchildren.org/summit, then replace only the conflicting website records for @ and www with the exact Vercel records I send. Please also add any Vercel TXT verification record exactly as shown. Do not change nameservers unless we explicitly agree to move the full DNS zone.

The old URLs /summit and /awards cannot be redirected through DNS because they are paths on inspiringchildren.org. In the existing Squarespace site, after the new pages are live, please retire those two old page URLs and add these permanent URL mappings under Settings → Developer Tools → URL Mappings:

/summit -> https://notalonesummit.org/ 301
/awards -> https://notalonesummit.org/awards/2026 301

Please leave the old site and all unrelated pages/domains untouched. We will verify SSL and every major new route before considering the cutover complete.
```

## Expo, EAS, Apple, and mobile-app ownership

GitHub ownership does not transfer the mobile application’s external accounts.

1. Confirm whether the Expo organization `inspiring-children-foundation` will remain the owner.
2. Add the receiving Expo account to that organization or deliberately transfer/relink the EAS project.
3. Preserve the EAS project ID unless a controlled migration requires a new one.
4. Re-enter EAS environment variables and secrets securely.
5. Verify iOS bundle identifier, Android package, app scheme, runtime version, update URL, and build profiles in `apps/mobile/app.config.ts` and `apps/mobile/eas.json`.
6. Add the receiving person to Apple Developer and App Store Connect with the minimum required role.
7. Confirm certificates, provisioning profiles, push keys, App Store listing, privacy answers, support URL, and privacy-policy URL.
8. Build and test on a physical iPhone before enabling push delivery or submitting to TestFlight/App Store.

Do not generate replacement signing credentials casually. Coordinate ownership and credential changes with the current Apple and Expo owners.

## Final recreation and cutover checklist

- The GitHub repository has transferred and the destination HEAD matches the source HEAD.
- The receiving clone has a clean working tree.
- `pnpm install --frozen-lockfile` succeeds.
- The public website type-check and production build succeed.
- The staff portal type-check, tests, and production build succeed.
- Mobile dependencies install and mobile type-check/tests succeed.
- The 2026 homepage and every required route render.
- The 2025 and 2026 Awards pages remain separate and selectable.
- The 2026 directory contains only screenshot-confirmed people plus later explicit additions.
- All approved local profile assets load in website and app.
- Profiles open, biographies display, search/category navigation works, and messaging behavior is configured.
- RSVP uses a real atomic backend limit before claiming a 1,000-ticket capacity.
- Donation checkout uses a real payment provider before accepting money; the UI alone is not a payment system.
- Supabase migrations, RLS, Auth, storage, functions, and data are present.
- Vercel environment variables are recreated without exposing secrets.
- Expo/EAS and Apple access are confirmed.
- `notalonesummit.org` and `www.notalonesummit.org` verify with SSL.
- `/summit` permanently redirects to `https://notalonesummit.org/`.
- `/awards` permanently redirects to `https://notalonesummit.org/awards/2026`.
- Email DNS records were preserved.
- The old pages are retained until the new production site passes verification.
- A rollback copy of the old DNS records and the Git bundle exists.

## Mandatory startup prompt for a new coding account

Paste this into the new coding account after cloning the complete repository:

```text
You are continuing and exactly recreating an existing production-oriented project: the Not Alone Summit 2026 website, native attendee app, staff portal, and backend architecture. This is not a greenfield redesign. Do not start from a blank template and do not replace the Expo native app with a website, PWA, WebView, or desktop-first React app.

Before changing anything, read AGENTS.md, README.md, MASTER_PROJECT_TRANSFER_REPORT.md, apps/web/AGENTS.md, docs/ARCHITECTURE.md, docs/ROADMAP_TO_LIVE_APP.md, docs/PRODUCTION_BACKEND_SETUP.md, docs/STAFF_OPERATIONS_RUNBOOK.md, docs/APP_STORE_CHECKLIST.md, docs/RELEASE_QA_MATRIX.md, docs/SECURITY_AND_PRIVACY.md, and docs/CREDENTIAL_LAST_HANDOFF.md. Inspect the current source and preserve its architecture, routes, visual identity, data model, local assets, 2025/2026 separation, and Git history.

The complete transferred Git repository is the source of truth. Preserve apps/web as the public Next.js site, apps/mobile as the Expo React Native attendee app, apps/admin as the separate Next.js staff portal, packages/* as shared contracts and logic, and supabase/* as the database/security source. Keep production secrets out of source and client bundles. Update both web and mobile when public roster facts or approved assets change. Do not add archived 2025 Talent Information folder names to the 2026 roster unless they are confirmed by the supplied 2026 screenshots or explicitly approved later.

Verify the existing project before altering it. Install with pnpm 11.19.0 on Node 22.13 or newer, run the relevant type-checks/tests/builds, and report real blockers. Never claim the domain, payments, ticket cap, notifications, AI, Supabase, TestFlight, or App Store release is complete without verifying the corresponding external service.
```

## Documents that remain authoritative

- `AGENTS.md`
- `README.md`
- `CONTRIBUTING.md`
- `docs/ARCHITECTURE.md`
- `docs/ROADMAP_TO_LIVE_APP.md`
- `docs/PRODUCTION_BACKEND_SETUP.md`
- `docs/STAFF_OPERATIONS_RUNBOOK.md`
- `docs/DATA_MODEL.md`
- `docs/SECURITY_AND_PRIVACY.md`
- `docs/NOTIFICATIONS.md`
- `docs/OFFLINE_SYNC.md`
- `docs/APP_STORE_CHECKLIST.md`
- `docs/APP_STORE_METADATA.md`
- `docs/APP_STORE_PRIVACY_ANSWERS.md`
- `docs/APP_STORE_REVIEWER_NOTES.md`
- `docs/RELEASE_QA_MATRIX.md`
- `docs/PRIVACY_DATA_INVENTORY.md`
- `docs/CREDENTIAL_LAST_HANDOFF.md`

This report intentionally repeats critical boundaries. Transfer the complete repository. Preserve the existing architecture. Re-enter secrets securely. Transfer external services separately. Deploy before DNS cutover. Preserve email records. Redirect the two old Squarespace paths with permanent 301 mappings. Verify every stage before deleting or retiring anything.
