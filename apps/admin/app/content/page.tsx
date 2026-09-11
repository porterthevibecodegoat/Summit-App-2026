import { publicAppConfig } from "@not-alone/config";
import { getReadOnlyLiveOpsState, hasStaffPageAccess } from "../../lib/live-ops-repository";
import { StaffNav } from "../staff-nav";
import { ContentStudio } from "./content-studio";

export const dynamic = "force-dynamic";

export default async function ContentPage() {
  if (!(await hasStaffPageAccess())) return null;
  const state = await getReadOnlyLiveOpsState();

  return (
    <main className="shell">
      <StaffNav active="content" />
      <ContentStudio
        environmentName={publicAppConfig.environmentName}
        initialSnapshot={state.publishedSnapshot}
        mode={state.mode}
      />
    </main>
  );
}
