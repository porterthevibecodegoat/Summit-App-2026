const positionalBaseUrl = process.argv.slice(2).find((argument) => argument !== "--") ?? "";
const baseUrl = normalizeBaseUrl(process.env.STAGING_ADMIN_URL ?? positionalBaseUrl);

if (!baseUrl) {
  console.error("Set STAGING_ADMIN_URL or pass the staging admin URL as the first argument.");
  process.exit(1);
}

const checks = [
  { name: "health", path: "/api/health" },
  { name: "snapshot", path: "/api/snapshot" },
  { name: "readiness", path: "/api/production/readiness", protected: true }
];

let failed = false;

for (const check of checks) {
  try {
    const response = await fetch(`${baseUrl}${check.path}`, {
      headers: {
        Accept: "application/json",
        ...(process.env.STAGING_STAFF_ACCESS_TOKEN
          ? { Authorization: `Bearer ${process.env.STAGING_STAFF_ACCESS_TOKEN}` }
          : {})
      }
    });
    const payload = await response.json();

    if (check.protected && !process.env.STAGING_STAFF_ACCESS_TOKEN && response.status === 401) {
      console.log(`${check.name}: PASS (authentication required)`);
      continue;
    }

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

try {
  const response = await fetch(baseUrl, { redirect: "follow" });
  const headerChecks = [
    ["content security policy", response.headers.get("content-security-policy")?.includes("frame-ancestors 'none'")],
    ["frame protection", response.headers.get("x-frame-options") === "DENY"],
    ["content type protection", response.headers.get("x-content-type-options") === "nosniff"],
    ["referrer policy", response.headers.get("referrer-policy") === "strict-origin-when-cross-origin"],
    ["permissions policy", response.headers.get("permissions-policy")?.includes("camera=()")],
    ["framework signature removed", !response.headers.has("x-powered-by")]
  ];

  for (const [name, passed] of headerChecks) {
    console.log(`security/${name}: ${passed ? "PASS" : "FAIL"}`);
    if (!passed) failed = true;
  }
} catch (error) {
  failed = true;
  console.error("security headers: FAIL");
  console.error(error instanceof Error ? error.message : String(error));
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
