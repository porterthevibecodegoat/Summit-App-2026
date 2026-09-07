import Link from "next/link";
import { publicAppConfig } from "@not-alone/config";
import { getReadOnlyLiveOpsState } from "../../lib/live-ops-repository";
import { StaffNav } from "../staff-nav";

export const dynamic = "force-dynamic";

export default async function ImportPage() {
  const state = await getReadOnlyLiveOpsState();

  return (
    <main className="shell">
      <StaffNav active="import" />
      <section className="content">
        <div className="pageHeader">
          <div>
            <div className="kicker">Schedule Import · {state.mode}</div>
            <h1>Turn files into reviewed schedule rows</h1>
            <p className="headerCopy">
              Text and CSV-like agenda files can be parsed into draft rows now. PDFs are accepted by the workbench UI
              as staged files until the production parser/worker is connected.
            </p>
          </div>
          <div className="environmentBadge">{publicAppConfig.environmentName}</div>
        </div>

        <div className="twoColumn">
          <section className="panel">
            <div className="label">Available now</div>
            <h2>Drop text or CSV in the workbench</h2>
            <p>
              Imported sessions stay draft until staff assigns rooms, resolves conflicts, marks rows Ready, previews
              the revision, and publishes.
            </p>
            <Link className="buttonLink" href="/schedule">
              Open Import Drop Zone
            </Link>
          </section>

          <section className="panel">
            <div className="label">Production parser still pending</div>
            <h2>PDF ingestion needs a server worker</h2>
            <p>
              The production version should extract PDF text server-side, preserve an import job record, show parser
              confidence, and require staff approval before any attendee-facing publish.
            </p>
          </section>
        </div>

        <section className="panel">
          <div className="label">Current draft</div>
          <h2>{state.draftSessions.length} session rows loaded</h2>
          <p>Use the Schedule Workbench as the single review point for imported content.</p>
        </section>
      </section>
    </main>
  );
}
