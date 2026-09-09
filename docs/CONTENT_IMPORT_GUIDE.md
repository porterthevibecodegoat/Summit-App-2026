# Content Import Guide

The import center accepts PDF, TXT, and CSV files up to 15 MB. Importing never changes the attendee app directly.

## Safe Workflow

1. Drop or choose one current schedule file in the staff Import Center.
2. The server verifies the declared type, file extension, size, and PDF signature where applicable.
3. Text is extracted and schedule-like rows are parsed into a staged import.
4. Staff review extracted rows, skipped lines, warnings, times, rooms, audiences, and day assignment.
5. Convert the accepted rows into the editable schedule draft.
6. Resolve every blocking quality issue and mark approved rows ready.
7. Save the draft, open Review & Publish, inspect the attendee-facing diff, and explicitly confirm publication.
8. Verify the new revision on a staging attendee device before event-wide use.

Import jobs and counts are retained for staff history and audit. A failed, partial, or suspicious import must remain staged and must not replace a known-good draft.

## File Guidance

- Prefer text-based PDFs or CSV exports with one session per row.
- Scanned-image PDFs require an approved OCR step before reliable import; the current parser reports rows it cannot confidently interpret rather than inventing data.
- Store final instants as UTC and render them in the event's IANA time zone.
- Keep final facts in the canonical snapshot, not in AI prompts or duplicated component data.
