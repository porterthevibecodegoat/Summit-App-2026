import { readFileSync } from "node:fs";
import { capacityRules, draftCapacityRules } from "../apps/web/lib/wellness-booking/capacity";
import { planWellnessMigration } from "../apps/web/lib/wellness-booking/migration";
import type { WorkshopSubmission } from "../apps/web/lib/staff/store";

// Local, read-only initial migration planning. This script has no provider
// client, import/apply flag, ledger write, credential or SMS-sending operation.
const [input, capacityFile, ...extra] = process.argv.slice(2);
if (!input || extra.length) {
  console.error("Usage: node --import tsx scripts/plan-wellness-migration.ts <private-staff-backup.json> [capacity-policy.json]");
  process.exitCode = 1;
} else {
  try {
    const backup = JSON.parse(readFileSync(input, "utf8"));
    if (backup.ledger || !Array.isArray(backup.workshop)) throw new Error();
    const rows = backup.workshop as WorkshopSubmission[];
    if (rows.some(row => !row || typeof row.id !== "string" || typeof row.name !== "string" || typeof row.submittedAt !== "string")) throw new Error();
    const rules = capacityFile ? capacityRules(JSON.parse(readFileSync(capacityFile, "utf8")).sessions) : draftCapacityRules;
    console.log(JSON.stringify(planWellnessMigration(rows, rules), null, 2));
  } catch {
    console.error("Cannot plan from these files. Use an unchanged initial staff backup with a workshop array and an optional valid capacity policy. No records were changed.");
    process.exitCode = 1;
  }
}
