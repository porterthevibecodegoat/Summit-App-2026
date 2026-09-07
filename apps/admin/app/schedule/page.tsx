import { publicAppConfig } from "@not-alone/config";
import { getReadOnlyLiveOpsState } from "../../lib/live-ops-repository";
import { StaffNav } from "../staff-nav";
import { ScheduleWorkbench } from "./schedule-workbench";

export const dynamic = "force-dynamic";

export default async function SchedulePage() {
  const state = await getReadOnlyLiveOpsState();

  return (
    <main className="shell">
      <StaffNav active="schedule" />
      <ScheduleWorkbench snapshot={state.publishedSnapshot} environmentName={publicAppConfig.environmentName} />
    </main>
  );
}
