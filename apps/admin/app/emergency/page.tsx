import Link from "next/link";
import { publicAppConfig } from "@not-alone/config";
import { getReadOnlyLiveOpsState } from "../../lib/live-ops-repository";
import { StaffNav } from "../staff-nav";

export const dynamic = "force-dynamic";

export default async function EmergencyPage() {
  const state = await getReadOnlyLiveOpsState();
  const pushReady = process.env.ENABLE_PUSH_DELIVERY === "true" && process.env.ENABLE_NOTIFICATION_DISPATCH === "true";

  return (
    <main className="shell">
      <StaffNav active="emergency" />
      <section className="content">
        <div className="pageHeader">
          <div>
            <div className="kicker">Emergency Operations · {state.mode}</div>
            <h1>Urgent alerts require final credentials</h1>
            <p className="headerCopy">
              This page makes the production boundary clear: emergency broadcast UX is planned, but real sending stays
              disabled until Apple/EAS credentials, staff roles, and dispatch audit are complete.
            </p>
          </div>
          <div className="environmentBadge">{pushReady ? "armed" : "safe off"}</div>
        </div>

        <section className="panel blockedPanel">
          <div className="label">Delivery status</div>
          <h2>Emergency push is not armed</h2>
          <p>
            {state.attendeeDevices} registered device(s) are visible. The dispatch worker is disabled until production
            credentials and approval are complete.
          </p>
          <div className="readinessList compactList">
            <div className="readinessRow">
              <span className="statusDot fail" />
              <div>
                <strong>Push credentials</strong>
                <span>Apple/APNs and EAS push credentials are still required.</span>
              </div>
            </div>
            <div className="readinessRow">
              <span className="statusDot warn" />
              <div>
                <strong>Staff approval flow</strong>
                <span>Production broadcast should require ADMIN/PUBLISHER confirmation and audit logging.</span>
              </div>
            </div>
          </div>
          <Link className="buttonLink secondaryButtonLink" href="/notifications">
            Review Notification Queue
          </Link>
        </section>
      </section>
    </main>
  );
}
