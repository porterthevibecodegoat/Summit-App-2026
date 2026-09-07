import Link from "next/link";
import { publicAppConfig } from "@not-alone/config";
import { getReadOnlyLiveOpsState } from "../../lib/live-ops-repository";
import { StaffNav } from "../staff-nav";

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const state = await getReadOnlyLiveOpsState();

  return (
    <main className="shell">
      <StaffNav active="history" />
      <section className="content">
        <div className="pageHeader">
          <div>
            <div className="kicker">Audit Trail - {state.mode}</div>
            <h1>Operations history</h1>
            <p className="headerCopy">Recent staff and system actions that affect schedule publication and app sync.</p>
          </div>
          <div className="environmentBadge">Revision {state.publishedSnapshot.revision}</div>
        </div>

        <section className="panel">
          <div className="panelHeader">
            <div>
              <div className="label">Recent activity</div>
              <h2>What changed</h2>
            </div>
            <Link className="textButton" href="/schedule">Back to schedule</Link>
          </div>
          <div className="timeline">
            {state.activityLog.length === 0 ? (
              <div className="row">
                <div className="time">No entries</div>
                <div>
                  <div className="title">No tracked operations yet.</div>
                  <div className="summary">Save or publish a draft to create the first history entry.</div>
                </div>
                <div className="badge">Waiting</div>
              </div>
            ) : (
              state.activityLog.map((entry) => (
                <div className="row" key={entry.id}>
                  <div className="time">{new Date(entry.createdAt).toLocaleString()}</div>
                  <div>
                    <div className="title">{entry.action}</div>
                    <div className="summary">{entry.detail}</div>
                  </div>
                  <div className="badge">{entry.actorRole}</div>
                </div>
              ))
            )}
          </div>
        </section>
      </section>
    </main>
  );
}
