import Link from "next/link";
import { publicAppConfig } from "@not-alone/config";
import { getReadOnlyLiveOpsState } from "../../lib/live-ops-repository";
import { createScheduleQualityReport } from "../../lib/schedule-quality";
import { StaffNav } from "../staff-nav";

export const dynamic = "force-dynamic";

export default async function ChangesPage() {
  const state = await getReadOnlyLiveOpsState();
  const quality = createScheduleQualityReport(state.draftSessions);

  return (
    <main className="shell">
      <StaffNav active="changes" />
      <section className="content">
        <div className="pageHeader">
          <div>
            <div className="kicker">Official Change Control · {state.mode}</div>
            <h1>Review every attendee-facing change</h1>
            <p className="headerCopy">
              This is the operating lane for natural-language edits, draft review, publish preview, and rollback.
            </p>
          </div>
          <div className="environmentBadge">{publicAppConfig.environmentName}</div>
        </div>

        <div className="quickActionGrid">
          <Link className="quickAction" href="/schedule">
            <span>Command bar</span>
            <strong>Generate an AI proposal</strong>
          </Link>
          <Link className="quickAction" href="/schedule">
            <span>Publish preview</span>
            <strong>See exactly what will change</strong>
          </Link>
          <Link className="quickAction" href="/history">
            <span>Audit trail</span>
            <strong>Review recent operations</strong>
          </Link>
        </div>

        <section className="panel">
          <div className="label">Current gate</div>
          <h2>{quality.publishable ? "Draft can be published after confirmation" : "Draft is blocked"}</h2>
          <p>
            {quality.readySessions} ready, {quality.needsReviewSessions} need review, {quality.draftSessions} draft,{" "}
            {quality.conflicts.length} room conflict(s).
          </p>
          {quality.issues.length > 0 ? (
            <div className="qualityIssueList">
              {quality.issues.slice(0, 8).map((issue) => (
                <div className={`qualityIssue ${issue.severity}`} key={issue.id}>
                  <strong>{issue.title}</strong>
                  <span>{issue.message}</span>
                </div>
              ))}
            </div>
          ) : null}
        </section>
      </section>
    </main>
  );
}
