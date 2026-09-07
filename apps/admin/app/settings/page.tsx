import Link from "next/link";
import { publicAppConfig } from "@not-alone/config";
import { getReadOnlyLiveOpsState } from "../../lib/live-ops-repository";
import { createProductionReadinessReport } from "../../lib/production-readiness";
import { StaffNav } from "../staff-nav";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const state = await getReadOnlyLiveOpsState();
  const readiness = createProductionReadinessReport();

  return (
    <main className="shell">
      <StaffNav active="settings" />
      <section className="content">
        <div className="pageHeader">
          <div>
            <div className="kicker">Portal Settings · {state.mode}</div>
            <h1>Environment and launch readiness</h1>
            <p className="headerCopy">
              Safe status only. Secrets are never displayed in the browser, mobile app, or build logs.
            </p>
          </div>
          <div className="badgeGroup">
            <div className="environmentBadge">{publicAppConfig.environmentName}</div>
            <div className="environmentBadge backendBadge">{state.mode}</div>
          </div>
        </div>

        <div className="metricGrid">
          <div className="metric">
            <div className="label">Event id</div>
            <div className="value smallValue">{state.eventId}</div>
          </div>
          <div className="metric">
            <div className="label">API base URL</div>
            <div className="value smallValue">{publicAppConfig.apiBaseUrl}</div>
          </div>
          <div className="metric">
            <div className="label">Readiness</div>
            <div className="value">{readiness.status}</div>
          </div>
          <div className="metric">
            <div className="label">Blockers</div>
            <div className="value">{readiness.blockers}</div>
          </div>
        </div>

        <section className="panel">
          <div className="panelHeader">
            <div>
              <div className="label">Launch checks</div>
              <h2>What still needs external setup</h2>
            </div>
            <Link className="textButton" href="/api/production/readiness">View JSON</Link>
          </div>
          <div className="readinessList">
            {readiness.checks.map((check) => (
              <div className="readinessRow" key={check.name}>
                <span className={`statusDot ${check.status.toLowerCase()}`} />
                <div>
                  <strong>{check.name}</strong>
                  <span>{check.detail}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
