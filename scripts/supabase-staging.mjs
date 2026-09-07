import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { eventSnapshotSchema } from "../packages/validation/src/index.ts";

const command = process.argv[2] ?? "check";
const rootDir = findRepoRoot(process.cwd());
const envEntries = loadDotEnvEntries(rootDir);
const env = Object.fromEntries(envEntries.map((entry) => [entry.key, entry.value]));
const snapshotPath = resolve(rootDir, "apps/mobile/assets/demo-snapshot.json");
const snapshot = eventSnapshotSchema.parse(JSON.parse(readFileSync(snapshotPath, "utf8")));
const urlResult = readEnvValue(["SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL"], isSupabaseUrl);
const publicKeyResult = readEnvValue(
  ["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "SUPABASE_ANON_KEY"],
  isPublicKeyLike
);
const serviceKeyResult = readEnvValue(["SUPABASE_SERVICE_ROLE_KEY"], isServerKeyLike);

if (!["check", "seed", "seed-sql"].includes(command)) {
  console.error("Usage: pnpm supabase:check | pnpm supabase:seed | pnpm supabase:seed-sql");
  process.exit(1);
}

if (command === "seed-sql") {
  const outputPath = resolve(rootDir, "outputs/supabase-staging-seed.sql");
  writeSeedSql(outputPath);
  printReport({
    status: "PASS",
    eventId: snapshot.event.id,
    outputPath,
    nextStep: "Run outputs/supabase-staging-seed.sql in the Supabase SQL Editor, then rerun pnpm supabase:check."
  });
  process.exit(0);
}

const baseReport = {
  eventId: snapshot.event.id,
  env: {
    supabaseUrl: summarizeEnvResult(urlResult),
    publishableKey: summarizeEnvResult(publicKeyResult),
    serviceRoleKey: summarizeEnvResult(serviceKeyResult)
  },
  warnings: [
    ...duplicateWarnings(),
    ...eventIdWarnings()
  ]
};

if (!urlResult.valid || !serviceKeyResult.valid || !publicKeyResult.valid) {
  printReport({
    status: "BLOCKED",
    ...baseReport,
    remote: null,
    nextStep:
      "Paste the real Supabase Project URL, publishable key, and secret/service-role key into .env, then rerun pnpm supabase:seed."
  });
  process.exit(command === "seed" ? 1 : 0);
}

if (command === "check") {
  const remote = await readRemoteState();
  printReport({
    status: remote.accessible ? "PASS" : "BLOCKED",
    ...baseReport,
    remote,
    nextStep: remote.accessible && remote.eventRows > 0 && remote.revisionRows > 0
      ? "Supabase is reachable and seeded."
      : "Run pnpm supabase:seed to load the current prototype event and published schedule revision."
  });
}

if (command === "seed") {
  await seedRemoteState();
  const remote = await readRemoteState();
  printReport({
    status: remote.accessible && remote.eventRows > 0 && remote.revisionRows > 0 ? "PASS" : "BLOCKED",
    ...baseReport,
    remote,
    nextStep:
      remote.accessible && remote.eventRows > 0 && remote.revisionRows > 0
        ? "Create staff Auth users and staff_profiles rows next."
        : "Supabase responded, but required seeded rows were not found."
  });
}

async function readRemoteState() {
  try {
    const eventId = encodeURIComponent(snapshot.event.id);
    const [events, revisions, drafts, jobs] = await Promise.all([
      supabaseFetch(`/rest/v1/events?id=eq.${eventId}&select=id,content_revision`),
      supabaseFetch(`/rest/v1/schedule_revisions?event_id=eq.${eventId}&select=revision,published_at&order=revision.desc&limit=3`),
      supabaseFetch(`/rest/v1/schedule_drafts?event_id=eq.${eventId}&select=id,status,base_revision,updated_at&order=updated_at.desc&limit=3`),
      supabaseFetch(`/rest/v1/notification_jobs?event_id=eq.${eventId}&select=id,status&limit=1`)
    ]);

    return {
      accessible: true,
      eventRows: events.length,
      latestContentRevision: events[0]?.content_revision ?? null,
      revisionRows: revisions.length,
      latestPublishedRevision: revisions[0]?.revision ?? null,
      draftRows: drafts.length,
      notificationTableAccessible: Array.isArray(jobs)
    };
  } catch (error) {
    return {
      accessible: false,
      error: sanitizeError(error)
    };
  }
}

async function seedRemoteState() {
  const nowUtc = new Date().toISOString();
  const draftSessions = readLocalDraftSessions();
  const eventPayload = {
    id: snapshot.event.id,
    name: snapshot.event.name,
    organization_name: snapshot.event.organizationName,
    time_zone: snapshot.event.timeZone,
    starts_on: "2026-11-02",
    ends_on: "2026-11-04",
    demo: snapshot.event.demo,
    content_revision: snapshot.revision,
    updated_at: nowUtc
  };
  const revisionPayload = {
    event_id: snapshot.event.id,
    revision: snapshot.revision,
    previous_revision: snapshot.revision > 1 ? snapshot.revision - 1 : null,
    source: "SYSTEM",
    changes_count: snapshot.scheduleItems.length,
    notification_jobs_updated: 0,
    snapshot,
    published_by: null,
    published_at: nowUtc
  };

  await supabaseFetch("/rest/v1/events?on_conflict=id", {
    method: "POST",
    body: [eventPayload],
    prefer: "resolution=merge-duplicates,return=minimal",
    expectedStatuses: [200, 201, 204]
  });

  await supabaseFetch("/rest/v1/schedule_revisions?on_conflict=event_id,revision", {
    method: "POST",
    body: [revisionPayload],
    prefer: "resolution=merge-duplicates,return=minimal",
    expectedStatuses: [200, 201, 204]
  });

  const draftRows = await supabaseFetch(
    `/rest/v1/schedule_drafts?event_id=eq.${encodeURIComponent(snapshot.event.id)}&status=neq.ARCHIVED&select=id&order=updated_at.desc&limit=1`
  );
  const draftPayload = {
    event_id: snapshot.event.id,
    base_revision: snapshot.revision,
    title: "Prototype schedule seeded from local staff store",
    status: "VALIDATED",
    working_snapshot: { draftSessions },
    created_by: null,
    updated_by: null,
    updated_at: nowUtc
  };

  if (draftRows[0]?.id) {
    await supabaseFetch(`/rest/v1/schedule_drafts?id=eq.${draftRows[0].id}`, {
      method: "PATCH",
      body: draftPayload,
      expectedStatuses: [200, 204],
      prefer: "return=minimal"
    });
  } else {
    await supabaseFetch("/rest/v1/schedule_drafts", {
      method: "POST",
      body: [draftPayload],
      expectedStatuses: [200, 201, 204],
      prefer: "return=minimal"
    });
  }
}

async function supabaseFetch(path, options = {}) {
  const headers = {
    apikey: serviceKeyResult.value,
    Authorization: `Bearer ${serviceKeyResult.value}`,
    "Content-Type": "application/json"
  };
  if (options.prefer) {
    headers.Prefer = options.prefer;
  }

  let response;
  let text;
  try {
    response = await fetch(`${urlResult.value}${path}`, {
      method: options.method ?? "GET",
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body)
    });
    text = await response.text();
  } catch (error) {
    const curlResponse = curlSupabaseFetch(path, options, headers);
    response = { status: curlResponse.status };
    text = curlResponse.text;
  }
  const expectedStatuses = options.expectedStatuses ?? [200];

  if (!expectedStatuses.includes(response.status)) {
    throw new Error(`Supabase request returned ${response.status}: ${redact(text).slice(0, 260)}`);
  }

  if (!text.trim()) {
    return [];
  }

  return JSON.parse(text);
}

function curlSupabaseFetch(path, options, headers) {
  const args = [
    "-sS",
    "-X",
    options.method ?? "GET",
    "-H",
    `apikey: ${headers.apikey}`,
    "-H",
    `Authorization: ${headers.Authorization}`,
    "-H",
    "Content-Type: application/json"
  ];

  if (headers.Prefer) {
    args.push("-H", `Prefer: ${headers.Prefer}`);
  }

  if (options.body !== undefined) {
    args.push("--data-binary", JSON.stringify(options.body));
  }

  args.push("-w", "\n%{http_code}", `${urlResult.value}${path}`);

  const output = execFileSync("curl", args, {
    encoding: "utf8",
    timeout: 30000,
    maxBuffer: 1024 * 1024
  });
  const separator = output.lastIndexOf("\n");
  const text = separator >= 0 ? output.slice(0, separator) : "";
  const status = Number(separator >= 0 ? output.slice(separator + 1) : output);

  return { status, text };
}

function readLocalDraftSessions() {
  const storePath = resolve(rootDir, "work/live-ops-store.json");
  if (!existsSync(storePath)) {
    return [];
  }

  const store = JSON.parse(readFileSync(storePath, "utf8"));
  if (store.eventId !== snapshot.event.id || !Array.isArray(store.draftSessions)) {
    return [];
  }

  return store.draftSessions;
}

function writeSeedSql(outputPath) {
  const nowUtc = new Date().toISOString();
  const draftSessions = readLocalDraftSessions();
  const eventId = snapshot.event.id;
  const sql = `-- Not Alone Summit Supabase staging seed
-- Generated from the repo-local canonical prototype schedule.
-- Contains no API keys or production secrets.

insert into public.events (
  id,
  name,
  organization_name,
  time_zone,
  starts_on,
  ends_on,
  demo,
  content_revision,
  updated_at
)
values (
  ${sqlString(eventId)},
  ${sqlString(snapshot.event.name)},
  ${sqlString(snapshot.event.organizationName)},
  ${sqlString(snapshot.event.timeZone)},
  date '2026-11-02',
  date '2026-11-04',
  ${snapshot.event.demo ? "true" : "false"},
  ${snapshot.revision},
  ${sqlString(nowUtc)}::timestamptz
)
on conflict (id) do update
set name = excluded.name,
    organization_name = excluded.organization_name,
    time_zone = excluded.time_zone,
    starts_on = excluded.starts_on,
    ends_on = excluded.ends_on,
    demo = excluded.demo,
    content_revision = excluded.content_revision,
    updated_at = excluded.updated_at;

insert into public.schedule_revisions (
  event_id,
  revision,
  previous_revision,
  source,
  changes_count,
  notification_jobs_updated,
  snapshot,
  published_by,
  published_at
)
values (
  ${sqlString(eventId)},
  ${snapshot.revision},
  ${snapshot.revision > 1 ? snapshot.revision - 1 : "null"},
  'SYSTEM',
  ${snapshot.scheduleItems.length},
  0,
  ${jsonbLiteral(snapshot)},
  null,
  ${sqlString(nowUtc)}::timestamptz
)
on conflict (event_id, revision) do update
set source = excluded.source,
    changes_count = excluded.changes_count,
    notification_jobs_updated = excluded.notification_jobs_updated,
    snapshot = excluded.snapshot,
    published_at = excluded.published_at;

update public.schedule_drafts
set status = 'ARCHIVED',
    updated_at = ${sqlString(nowUtc)}::timestamptz
where event_id = ${sqlString(eventId)}
  and status <> 'ARCHIVED';

insert into public.schedule_drafts (
  event_id,
  base_revision,
  title,
  status,
  working_snapshot,
  created_by,
  updated_by,
  updated_at
)
values (
  ${sqlString(eventId)},
  ${snapshot.revision},
  'Prototype schedule seeded from local staff store',
  'VALIDATED',
  ${jsonbLiteral({ draftSessions })},
  null,
  null,
  ${sqlString(nowUtc)}::timestamptz
);
`;

  writeFileSync(outputPath, sql, "utf8");
}

function sqlString(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function jsonbLiteral(value) {
  return `${sqlString(JSON.stringify(value))}::jsonb`;
}

function loadDotEnvEntries(dir) {
  const envPath = resolve(dir, ".env");
  if (!existsSync(envPath)) {
    return [];
  }

  return readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .map((rawLine, index) => {
      const line = rawLine.trim();
      const separator = line.indexOf("=");
      if (!line || line.startsWith("#") || separator <= 0) {
        return null;
      }

      return {
        key: line.slice(0, separator).trim(),
        value: line.slice(separator + 1).trim().replace(/^["']|["']$/g, ""),
        line: index + 1
      };
    })
    .filter(Boolean);
}

function readEnvValue(names, validator) {
  const entries = envEntries.filter((entry) => names.includes(entry.key));
  const selected = [...entries].reverse().find((entry) => entry.value.trim().length > 0) ?? null;

  return {
    valid: Boolean(selected && validator(selected.value)),
    value: selected?.value ?? "",
    selectedLine: selected?.line ?? null,
    selectedName: selected?.key ?? names[0],
    entries: entries.map((entry) => ({
      name: entry.key,
      line: entry.line,
      shape: keyShape(entry.value),
      length: entry.value.length
    }))
  };
}

function summarizeEnvResult(result) {
  return {
    status: result.valid ? "PASS" : "BLOCKED",
    selectedName: result.selectedName,
    selectedLine: result.selectedLine,
    entries: result.entries
  };
}

function isSupabaseUrl(value) {
  return /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(value) || /^http:\/\/127\.0\.0\.1:\d+$/i.test(value);
}

function isPublicKeyLike(value) {
  return value.startsWith("sb_publishable_") || value.startsWith("eyJ");
}

function isServerKeyLike(value) {
  return value.startsWith("sb_secret_") || value.startsWith("eyJ");
}

function keyShape(value) {
  if (!value) return "empty";
  if (value.includes("replace-with")) return "placeholder";
  if (value.startsWith("https://")) return "url";
  if (value.startsWith("http://127.0.0.1")) return "local-url";
  if (value.startsWith("sb_publishable_")) return "sb_publishable";
  if (value.startsWith("sb_secret_")) return "sb_secret";
  if (value.startsWith("eyJ")) return "jwt";
  return "invalid-shape";
}

function duplicateWarnings() {
  const counts = envEntries.reduce((map, entry) => map.set(entry.key, (map.get(entry.key) ?? 0) + 1), new Map());
  return [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([key, count]) => `${key} appears ${count} times in .env. Clean this up so runtime dotenv behavior is obvious.`);
}

function eventIdWarnings() {
  const configuredEventId = env.EVENT_ID;
  if (!configuredEventId) {
    return [];
  }
  if (configuredEventId !== snapshot.event.id) {
    return [`EVENT_ID is ${configuredEventId}, but the bundled snapshot is ${snapshot.event.id}.`];
  }
  return [];
}

function sanitizeError(error) {
  return redact(error instanceof Error ? error.message : String(error));
}

function redact(value) {
  return value
    .replace(/sb_secret_[A-Za-z0-9_-]+/g, "[redacted-supabase-secret]")
    .replace(/sb_publishable_[A-Za-z0-9_-]+/g, "[redacted-supabase-publishable]")
    .replace(/eyJ[A-Za-z0-9._-]+/g, "[redacted-jwt]");
}

function printReport(report) {
  console.log(JSON.stringify(report, null, 2));
}

function findRepoRoot(startDir) {
  const candidates = [startDir, resolve(startDir, ".."), resolve(startDir, "../.."), resolve(startDir, "../../..")];
  return candidates.find((candidate) => existsSync(resolve(candidate, "pnpm-workspace.yaml"))) ?? startDir;
}
