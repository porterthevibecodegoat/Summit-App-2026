import Link from "next/link";
import { publicAppConfig } from "@not-alone/config";
import { getReadOnlyLiveOpsState } from "../../lib/live-ops-repository";
import { StaffNav } from "../staff-nav";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const state = await getReadOnlyLiveOpsState();
  const scheduledJobs = state.notificationJobs.filter((job) => job.status === "scheduled");
  const backendLabel = state.mode === "supabase" ? "Supabase live backend" : "Local adapter";
  const scheduleItemsById = new Map(state.publishedSnapshot.scheduleItems.map((item) => [item.id, item]));

  return (
    <main className="shell">
      <StaffNav active="notifications" />
      <section className="content">
        <div className="pageHeader">
          <div>
            <div className="kicker">Notification Operations · {backendLabel}</div>
            <h1>Reminder queue</h1>
            <p className="headerCopy">
              Publishing a schedule revision recalculates reminder jobs here. Delivery stays disabled until Expo/APNs
              credentials and a server worker are authorized.
            </p>
          </div>
          <div className="badgeGroup">
            <div className="environmentBadge">{publicAppConfig.environmentName}</div>
            <div className="environmentBadge backendBadge">{state.mode}</div>
          </div>
        </div>

        <div className="metricGrid">
          <div className="metric">
            <div className="label">Published revision</div>
            <div className="value">{state.publishedSnapshot.revision}</div>
          </div>
          <div className="metric">
            <div className="label">Scheduled jobs</div>
            <div className="value">{scheduledJobs.length}</div>
          </div>
          <div className="metric">
            <div className="label">Registered devices</div>
            <div className="value">{state.attendeeDevices}</div>
          </div>
          <div className="metric">
            <div className="label">Push delivery</div>
            <div className="value">Off</div>
          </div>
        </div>

        <div className="systemNotice">
          {state.adapterWarning ? `${state.adapterWarning} ` : ""}
          Current backend mode: {state.mode}. Reminder metadata is prepared, but nothing is sent to attendee phones yet.
          The production step is to connect Expo push credentials and an audited dispatch worker.
        </div>

        <section className="panel">
          <div className="panelHeader">
            <div>
              <div className="label">Queued reminder metadata</div>
              <h2>Jobs created from the published schedule</h2>
            </div>
            <Link className="textButton" href="/schedule">Manage schedule</Link>
          </div>
          <div className="timeline">
            {scheduledJobs.length === 0 ? (
              <div className="row">
                <div className="time">No jobs</div>
                <div>
                  <div className="title">No reminders are queued yet.</div>
                  <div className="summary">Publish a ready schedule revision to generate reminder jobs.</div>
                </div>
                <div className="badge">Waiting</div>
              </div>
            ) : (
              scheduledJobs.map((job) => (
                <div className="row" key={job.id}>
                  <div className="time">{new Date(job.sendAfterUtc).toLocaleString()}</div>
                  <div>
                    <div className="title">{scheduleItemsById.get(job.scheduleItemId)?.title ?? "Unknown schedule item"}</div>
                    <div className="summary">
                      Audience {job.audienceScope} · Item {job.scheduleItemId}
                    </div>
                  </div>
                  <div className="badge">{job.status}</div>
                </div>
              ))
            )}
          </div>
        </section>
      </section>
    </main>
  );
}
