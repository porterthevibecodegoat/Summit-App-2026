const baseUrl = normalizeBaseUrl(process.env.STAGING_ADMIN_URL ?? process.argv[2] ?? "");

if (!baseUrl) {
  console.error("Set STAGING_ADMIN_URL or pass the staging admin URL as the first argument.");
  process.exit(1);
}

const checks = [
  { name: "health", path: "/api/health" },
  { name: "snapshot", path: "/api/snapshot" },
  { name: "readiness", path: "/api/production/readiness" }
];

let failed = false;

for (const check of checks) {
  try {
    const response = await fetch(`${baseUrl}${check.path}`, {
      headers: {
        Accept: "application/json"
      }
    });
    const payload = await response.json();

    if (!response.ok) {
      failed = true;
      console.error(`${check.name}: FAIL ${response.status}`);
      console.error(JSON.stringify(redact(payload), null, 2));
      continue;
    }

    console.log(`${check.name}: PASS`);
    console.log(JSON.stringify(summarize(check.name, payload), null, 2));
  } catch (error) {
    failed = true;
    console.error(`${check.name}: FAIL`);
    console.error(error instanceof Error ? error.message : String(error));
  }
}

if (failed) {
  process.exit(1);
}

function normalizeBaseUrl(value) {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  return trimmed.replace(/\/+$/, "");
}

function summarize(name, payload) {
  if (name === "health") {
    return {
      ok: payload.ok,
      backendMode: payload.backendMode,
      eventId: payload.eventId,
      publishedRevision: payload.publishedRevision,
      publishedScheduleItems: payload.publishedScheduleItems,
      readinessStatus: payload.readinessStatus,
      readinessBlockers: payload.readinessBlockers,
      readinessWarnings: payload.readinessWarnings
    };
  }

  if (name === "snapshot") {
    return {
      eventId: payload.event?.id,
      revision: payload.revision,
      scheduleItems: Array.isArray(payload.scheduleItems) ? payload.scheduleItems.length : 0,
      locations: Array.isArray(payload.locations) ? payload.locations.length : 0,
      contentPages: Array.isArray(payload.contentPages) ? payload.contentPages.length : 0
    };
  }

  return {
    status: payload.status,
    blockers: payload.blockers,
    warnings: payload.warnings,
    checks: Array.isArray(payload.checks)
      ? payload.checks.map((check) => ({ name: check.name, status: check.status }))
      : []
  };
}

function redact(value) {
  return JSON.parse(
    JSON.stringify(value, (key, item) => (key.toLowerCase().includes("key") || key.toLowerCase().includes("token") ? "[redacted]" : item))
  );
}
