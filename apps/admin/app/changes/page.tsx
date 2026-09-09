import { getReadOnlyLiveOpsState, hasStaffPageAccess } from "../../lib/live-ops-repository";
import { StaffNav } from "../staff-nav";
import { ChangeCenter } from "./change-center";

export const dynamic = "force-dynamic";

export default async function ChangesPage() {
  if (!(await hasStaffPageAccess())) return null;
  const state = await getReadOnlyLiveOpsState();

  return (
    <main className="shell">
      <StaffNav active="changes" />
      <section className="content">
        <div className="pageHeader">
          <div>
            <div className="kicker">Release Control · {state.mode}</div>
            <h1>Review &amp; Publish</h1>
            <p className="headerCopy">
              Inspect the exact attendee impact, approve a new revision, or restore the previous schedule.
            </p>
          </div>
          <div className="environmentBadge">{state.mode}</div>
        </div>

        <ChangeCenter initialState={{
          mode: state.mode,
          draftSessions: state.draftSessions,
          publishedRevision: state.publishedSnapshot.revision,
          notificationJobsCount: state.notificationJobs.length,
          attendeeDevices: state.attendeeDevices
        }} />
      </section>
    </main>
  );
}
