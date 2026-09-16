# Independent App and Website

Updated September 16, 2026 at the project owner's request.

## Our production boundary

- Repository: `porterthevibecodegoat/Summit-App-2026`. The public repository remains readable/forkable; third-party copies do not synchronize into ours automatically.
- Website: `not-alone-summit-web` on the owner's Vercel team.
- Staff portal/API: `summit-app-2026-admin` on the same team.
- Native app: Expo project `inspiring-children-foundation/not-alone-summit`.
- The website and native app consume our published API. They do not consume a collaborator's deployment.
- Supabase: project `svertlbvvhemqiqohzmq`, organization `Summit 2026 - ICF`.
- Airtable remains a read-only editorial source. Importing a record does not automatically approve its public role, producer credit, or attendance status.

## Access changes verified

- Removed the former collaborator's GitHub write access; only the repository owner remains a collaborator. No pending repository invitations, deploy keys, or repository webhooks were present.
- Canceled the former collaborator's expired Supabase organization invitation. Only the owner remains on the organization team.
- Canceled the former collaborator's pending Expo Developer invitation. The owner's membership and foundation account invitation were retained.
- Vercel membership showed only the owner, with no pending invitations. Both deployment projects are linked to the owner's repository.
- Supabase Auth and staff profiles contained only the owner's personal and foundation accounts, not the collaborator.
- Revoked the old manual Vercel deploy hook, removed its GitHub secret, and removed the now-unused hook workflow. Owner-authorized Git deployments remain connected.
- Protected `main` against force pushes and deletion and required code-owner review for non-admin pull requests. The owner retains administrative publishing access; `CODEOWNERS` names the owner.

## Contribution rules

Do not automatically merge, pull, cherry-pick, import, or deploy a collaborator's changes. External contributors may work in their own fork/clone and use their own deployments and backend credentials. Bring their changes into this repository only after the owner explicitly requests and reviews them.

Existing code history is preserved. This separation removes account-level shared write access; it does not claim to erase previously integrated code or revoke copies of public code.

The original Summit/Awards presentation has now been rebuilt from ICF's source
pages. The collaborator-added native People/Awards screens and portrait assets
were removed while retaining our later fixes and live 2026 publication. See
`ORIGINAL_SITE_RESTORATION.md` for the scoped rollback and content provenance.

The owner confirmed that a GitHub token was previously shared. Revocation is still pending owner confirmation. Membership removal alone does not invalidate a token belonging to the owner, so complete access isolation must not be claimed until that credential is revoked. Token details belong in private account settings, not this public repository.

Producer credits are restricted to the original ICF site list in `packages/config/src/producer-credits.ts`. Historical credits are not evidence of 2026 attendance.
