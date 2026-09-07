import { createProductionReadinessReport } from "../apps/admin/lib/production-readiness.ts";

const report = createProductionReadinessReport({
  env: process.env
});

console.log(`Production readiness status: ${report.status}`);
console.log("");

for (const check of report.checks) {
  console.log(`${check.status} - ${check.name}`);
  console.log(`  ${check.detail}`);
}

console.log("");
console.log(`Blocking item(s): ${report.blockers}`);
console.log(`Warning item(s): ${report.warnings}`);

if (process.argv.includes("--strict") && report.blockers > 0) {
  process.exitCode = 1;
}
