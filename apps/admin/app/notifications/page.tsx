import Link from "next/link";
import { publicAppConfig } from "@not-alone/config";
import { getReadOnlyLiveOpsState, hasStaffPageAccess } from "../../lib/live-ops-repository";
import { StaffNav } from "../staff-nav";
import { NotificationControl } from "./notification-control";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  if (!(await hasStaffPageAccess())) return null;
  const state = await getReadOnlyLiveOpsState();
  const scheduledJobs = state.notificationJobs.filter((job) => job.status === "scheduled");
  const visibleJobs = state.notificationJobs.filter((job) => job.status !== "superseded");
  const pushEnabled = process.env.ENABLE_PUSH_DELIVERY === "true" &&
    process.env.ENABLE_NOTIFICATION_DISPATCH === "true" && state.mode === "supabase";
  const backendLabel = state.mode === "supabase" ? "Supabase live backend" : "Local adapter";
  const scheduleItemsById = new Map(state.publishedSnapshot.scheduleItems.map((item) => [item.id, item]));
  const eventTimeFormatter = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: state.publishedSnapshot.event.timeZone,
    timeZoneName: "short"
  });

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
              credentials are authorized. The worker and delivery audit remain safely disabled until then.
            </p>
          </div>
          <div className="badgeGroup">
            <div className="environmentBadge">{publicAppConfig.environmentName}</div>
            <div className="environmentBadge backendBadge">{state.mode}</div>
          </div>
        </div>

        <div className="metricGrid">
          <div className="metric">
            <div className="label">Scheduled jobs</div>
            <div className="value">{scheduledJobs.length}</div>
          </div>
          <div className="metric">
            <div className="label">Accepted tickets</div>
            <div className="value">{state.notificationDelivery.accepted}</div>
          </div>
          <div className="metric">
            <div className="label">Delivered</div>
            <div className="value">{state.notificationDelivery.delivered}</div>
          </div>
          <div className="metric">
            <div className="label">Delivery failures</div>
            <div className="value">{state.notificationDelivery.failed}</div>
          </div>
        </div>

        <div className="systemNotice">
          {state.adapterWarning ? `${state.adapterWarning} ` : ""}
          Current backend mode: {state.mode}. The audited dispatch worker is built, but nothing is sent while delivery
          flags remain off. {state.attendeeDevices} device(s) are registered in this environment.
        </div>

        <NotificationControl enabled={pushEnabled} />

        <section className="panel">
          <div className="panelHeader">
            <div>
              <div className="label">Queued reminder metadata</div>
              <h2>Jobs created from the published schedule</h2>
            </div>
            <Link className="textButton" href="/schedule">Manage schedule</Link>
          </div>
          <div className="timeline">
            {visibleJobs.length === 0 ? (
              <div className="row">
                <div className="time">No jobs</div>
                <div>
                  <div className="title">No reminders are queued yet.</div>
                  <div className="summary">Publish a ready schedule revision to generate reminder jobs.</div>
                </div>
                <div className="badge">Waiting</div>
              </div>
            ) : (
              visibleJobs.map((job) => (
                <div className="row" key={job.id}>
                  <div className="time">{eventTimeFormatter.format(new Date(job.sendAfterUtc))}</div>
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
