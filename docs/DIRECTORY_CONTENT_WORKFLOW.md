# Reviewed People And Awards Content

## Provenance Of The Existing Producer List

- The original ICF Summit page lists Trent Alenik and Aphrah Brokaw as producers, and Jewel, Ryan Wolfington, Trevor Short, and Dr. George Rapier III as executive producers: https://www.inspiringchildren.org/summit (checked September 16, 2026).
- Expanded producer-category assignments in `apps/web/lib/people.ts` originated in imported website commit `c28ebd4`. Git attributes that commit to Isabella Wolfington. This identifies the code's provenance, not who independently verified each role.
- The bundled 2026 roster records a read-only Airtable review of the Confirmed Attendance group on September 15. Attendance confirmation is not confirmation of a producer, host, sponsor, or other event role.
- The existing public producer categories must not be described as fully verified 2026 production credits. No Airtable records were edited during this work.

## Staff Workflow

1. Open Content Studio and review Speakers. Edit names, roles, biographies, headshots, and visibility.
2. Choose approved directory categories. Record an approval source for categorized roles. A URL, an identified event-team approval, or an approved source record can document provenance; entering text does not independently verify it.
3. In Event information, activate the reviewed people directory. Review & Publish writes the switch and people together in one canonical snapshot revision. This replaces the bundled directory, so review the entire list first.
4. Under Pages & Awards, add the 2026 Awards program, edit its title/body, and mark it visible only after approval. Publish using the same existing confirmation workflow.
5. Reload the public website; mobile receives the next published snapshot through its existing synchronization/cache path. New app code must first reach installed builds; an older binary does not gain these screens from a data-only publish.

No activation or real event-content publication is performed merely by deploying these code changes. The 2025 archive is unchanged.

## Behavior And Limits

- Unpublished profiles and wrong-event records are excluded. An intentionally empty activated directory remains empty; it does not fall back to old names.
- Uncategorized published people appear as Attendees. Categories are not inferred from attendance status or occupation.
- Profile links use stable record IDs after activation, so renaming a person does not change the new URL. Removed profiles return 404. Old name-based links are not automatically redirected after activation.
- The website reads the latest content on a new request; this is not a claim of automatic updates to an already-open browser tab. Backend failure withholds current directory content rather than restoring potentially withdrawn names.
- Mobile uses its existing snapshot cache during outages. A device cannot learn about a withdrawal while offline.
- Awards program publication currently supports plain text title/body, not a structured editor for every historical category or honoree. The existing 2025 archive remains separate.
- Approval-source text is part of the snapshot metadata. Do not enter secrets or private correspondence into that field.

## Verification

- `pnpm test`: shared selectors, publication validation, and website mapping.
- Build the admin, then run `pnpm test:staff-acceptance`: real Supabase publication against a disposable event, including directory categories/source and Awards content. It cleans up test users and records and verifies the public event is unchanged.
- Build the website, then run `pnpm test:reviewed-content`: isolated local snapshot server exercises current website profiles, withdrawals, Awards, and backend failure.
- `pnpm test:responsive`: includes reviewed content publication/removal at phone, tablet, and desktop sizes, plus the broader layout matrix.
- Do not rebuild the admin output while its acceptance-test server is running.
