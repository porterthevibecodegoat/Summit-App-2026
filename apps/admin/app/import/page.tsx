import { publicAppConfig } from "@not-alone/config";
import { getReadOnlyLiveOpsState, hasStaffPageAccess } from "../../lib/live-ops-repository";
import { StaffNav } from "../staff-nav";
import { ImportCenter } from "./import-center";

export const dynamic = "force-dynamic";

export default async function ImportPage() {
  if (!(await hasStaffPageAccess())) return null;
  const state = await getReadOnlyLiveOpsState();

  return (
    <main className="shell">
      <StaffNav active="import" />
      <section className="content">
        <div className="pageHeader">
          <div>
            <div className="kicker">Schedule Import · {state.mode}</div>
            <h1>Import an updated schedule safely</h1>
            <p className="headerCopy">
              Extract attendee-facing rows from PDF, TXT, or CSV, inspect the result, then stage it as a draft. Imports
              never publish directly to the attendee app.
            </p>
          </div>
          <div className="environmentBadge">{publicAppConfig.environmentName}</div>
        </div>

        <ImportCenter currentDraft={state.draftSessions} recentJobs={state.importJobs} />
      </section>
    </main>
  );
}
