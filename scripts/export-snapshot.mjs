import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const outputPath = resolve("apps/mobile/assets/demo-snapshot.json");
const fixture = await import("../packages/test-fixtures/src/index.ts");
const snapshot = fixture.demoSnapshot;

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
console.log(`Wrote schema-validated demo snapshot to ${outputPath}`);
