import { createRequire } from "node:module";
import { mkdir, copyFile, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../..");
const require = createRequire(import.meta.url);
const requireFromTsx = createRequire(require.resolve("tsx/package.json"));
const { build } = requireFromTsx("esbuild");
const out = join(here, "dist");
await mkdir(join(out, "netlify/functions"), { recursive: true });
await mkdir(join(out, "public"), { recursive: true });
const result = await build({
  absWorkingDir: root,
  entryPoints: { agenda: join(here, "src/agenda.ts"), "clicksend-inbound": join(here, "src/clicksend-inbound.ts"), "wellness-airtable": join(here, "src/wellness-airtable.ts") },
  outdir: join(out, "netlify/functions"), outExtension: { ".js": ".mjs" },
  bundle: true, platform: "node", format: "esm", target: "node22", minify: true,
  banner: { js: 'import {createRequire as __createRequire} from "node:module";const require=__createRequire(import.meta.url);' },
  sourcemap: false, legalComments: "eof", logLevel: "info", metafile: true,
});
await copyFile(join(here, "netlify.toml"), join(out, "netlify.toml"));
await copyFile(join(here, "public/index.html"), join(out, "public/index.html"));
const sourceFiles = Object.keys(result.metafile.inputs).filter(path => !path.includes("node_modules/")).sort();
const hashes = Object.fromEntries(await Promise.all(sourceFiles.map(async path => [path, createHash("sha256").update(await readFile(resolve(root, path))).digest("hex")])));
let gitHead = null, worktreeDirty = null;
try {
  gitHead = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  worktreeDirty = Boolean(execFileSync("git", ["status", "--porcelain"], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim());
} catch {
  // A source ZIP has no Git metadata. File hashes still identify build inputs.
}
await writeFile(join(out, "build-info.json"), JSON.stringify({
  purpose: "API-only wellness reminder integration; no outbound SMS sender",
  gitHead, worktreeDirty, builtAt: new Date().toISOString(), sourceFileHashes: hashes,
  canonicalWellnessSource: "apps/web/lib/wellness-signups-2026.ts",
  modifiesMainWebsite: false, containsCredentials: false, deployed: false,
}, null, 2) + "\n");
