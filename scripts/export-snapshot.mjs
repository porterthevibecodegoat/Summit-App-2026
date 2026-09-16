import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const outputPath = resolve("apps/mobile/assets/event-2026-snapshot.json");
const fixture = await import("../packages/test-fixtures/src/event-2026.ts");
const snapshot = fixture.event2026Snapshot;

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
console.log(`Wrote schema-validated 2026 snapshot to ${outputPath}`);
