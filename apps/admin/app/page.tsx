import Link from "next/link";
import { publicAppConfig } from "@not-alone/config";
import { getNowAndUpcoming, toEventTimeRange } from "@not-alone/domain";
import { getReadOnlyLiveOpsState, hasStaffPageAccess } from "../lib/live-ops-repository";
import { createProductionReadinessReport } from "../lib/production-readiness";
import { StaffNav } from "./staff-nav";

export const dynamic = "force-dynamic";

export default async function LiveOperationsPage() {
  if (!(await hasStaffPageAccess())) return null;
  const state = await getReadOnlyLiveOpsState();
  const readiness = createProductionReadinessReport();
  const snapshot = state.publishedSnapshot;
  const timeline = getNowAndUpcoming({
    snapshot,
    nowUtc: "2026-11-02T18:30:00.000Z",
    audienceGroups: ["all_attendees", "founders"]
  });
  const visibleTimeline = [...timeline.current, ...timeline.upcoming];
  const draftNeedsReview = state.draftSessions.filter((session) => session.status === "Needs review").length;
  const draftReady = state.draftSessions.filter((session) => session.status === "Ready").length;
  const backendLabel = state.mode === "supabase" ? "Supabase live backend" : "Local live adapter";

  return (
    <main className="shell">
      <StaffNav active="overview" />
      <section className="content">
        <div className="pageHeader">
          <div>
            <div className="kicker">Staff Event Control Portal · {backendLabel}</div>
            <h1>{snapshot.event.name}</h1>
            <p className="headerCopy">
              {snapshot.event.dateLabel} · {snapshot.event.venueName} · {snapshot.event.city}
            </p>
          </div>
          <div className="badgeGroup">
            <div className="environmentBadge">{publicAppConfig.environmentName}</div>
            <div className="environmentBadge backendBadge">{state.mode}</div>
          </div>
        </div>

        <div className="metricGrid">
          <div className="metric">
            <div className="label">Draft ready</div>
            <div className="value">{draftReady}</div>
          </div>
          <div className="metric">
            <div className="label">Needs review</div>
            <div className="value">{draftNeedsReview}</div>
          </div>
          <div className="metric">
            <div className="label">Notification jobs</div>
            <div className="value">{state.notificationJobs.length}</div>
          </div>
          <div className="metric">
            <div className="label">Content revision</div>
            <div className="value">{snapshot.revision}</div>
          </div>
        </div>

        <div className="quickActionGrid">
          <Link className="quickAction" href="/schedule">
            <span>Schedule workbench</span>
            <strong>Edit, review, publish</strong>
          </Link>
          <Link className="quickAction" href="/notifications">
            <span>Notifications</span>
            <strong>Review queued jobs</strong>
          </Link>
          <Link className="quickAction" href="/history">
            <span>History</span>
            <strong>See recent changes</strong>
          </Link>
        </div>

        <div className="systemNotice">
          {state.adapterWarning ? `${state.adapterWarning} ` : ""}
          Backend mode: {state.mode}. Drafts, published snapshot, notification jobs, and mobile sync all read through
          the same live-ops adapter.
        </div>

        <section className={`panel readinessPanel ${readiness.status === "PASS" ? "successPanel" : "blockedPanel"}`}>
          <div className="panelHeader">
            <div>
              <div className="label">Production readiness</div>
              <h2>{readiness.status}</h2>
            </div>
            <Link className="textButton" href="/api/production/readiness">View JSON</Link>
          </div>
          <p>
            {readiness.blockers} blocker(s) and {readiness.warnings} warning(s). The portal can use the configured
            live-ops adapter for development; production launch still requires the missing account credentials and
            deployment values below.
          </p>
          <div className="readinessList">
            {readiness.checks
              .filter((check) => check.status !== "PASS")
              .slice(0, 6)
              .map((check) => (
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

        <div className="panel">
          <div className="panelHeader">
            <div>
              <div className="label">Now and Next</div>
              <h2>Attendee-facing timeline</h2>
            </div>
            <Link className="textButton" href="/schedule">Manage schedule</Link>
          </div>
          <div className="timeline">
            {visibleTimeline.length === 0 ? (
              <div className="row">
                <div className="time">No live items</div>
                <div>
                  <div className="title">No attendee schedule has been published yet.</div>
                  <div className="summary">
                    The shared event model is ready for approved agenda records, locations, visibility rules, and
                    notification metadata.
                  </div>
                </div>
                <div className="badge">Ready</div>
              </div>
            ) : (
              visibleTimeline.map((item, index) => (
                <div className="row" key={`${item.id}-${item.startUtc}-${index}`}>
                  <div className="time">{toEventTimeRange(item, snapshot.event.timeZone)}</div>
                  <div>
                    <div className="title">{item.title}</div>
                    <div className="summary">{item.locationName} · {item.summary}</div>
                  </div>
                  <div className="badge">{item.status}</div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="twoColumn">
          <section className="panel">
            <div className="label">Positioning</div>
            <h2>Human development convening</h2>
            <p>
              {snapshot.event.positioning}
            </p>
          </section>
          <section className="panel">
            <div className="label">Brand context</div>
            <h2>Official source captured</h2>
            <p>
              Presented by {snapshot.event.presentedBy} and powered by {snapshot.event.poweredBy}. Final
              agenda details still require staff approval before production publication.
            </p>
          </section>
        </div>

        <section className="panel">
          <div className="panelHeader">
            <div>
              <div className="label">Recent operations</div>
              <h2>Latest changes</h2>
            </div>
            <Link className="textButton" href="/history">View history</Link>
          </div>
          <div className="timeline">
            {state.activityLog.slice(0, 3).map((entry) => (
              <div className="row" key={entry.id}>
                <div className="time">{new Date(entry.createdAt).toLocaleString()}</div>
                <div>
                  <div className="title">{entry.action}</div>
                  <div className="summary">{entry.detail}</div>
                </div>
                <div className="badge">{entry.actorRole}</div>
              </div>
            ))}
            {state.activityLog.length === 0 ? (
              <div className="row">
                <div className="time">No entries</div>
                <div>
                  <div className="title">No operations have been recorded yet.</div>
                  <div className="summary">Saving or publishing a draft will create audit activity.</div>
                </div>
                <div className="badge">Waiting</div>
              </div>
            ) : null}
          </div>
        </section>
      </section>
    </main>
  );
}
