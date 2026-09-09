import Link from "next/link";
import { publicAppConfig } from "@not-alone/config";
import { getReadOnlyLiveOpsState, hasStaffPageAccess } from "../../lib/live-ops-repository";
import { createScheduleQualityReport } from "../../lib/schedule-quality";
import { StaffNav } from "../staff-nav";

export const dynamic = "force-dynamic";

export default async function AskAiPage() {
  if (!(await hasStaffPageAccess())) return null;
  const state = await getReadOnlyLiveOpsState();
  const quality = createScheduleQualityReport(state.draftSessions);

  return (
    <main className="shell">
      <StaffNav active="ask-ai" />
      <section className="content">
        <div className="pageHeader">
          <div>
            <div className="kicker">Staff AI Systems · {state.mode}</div>
            <h1>Ask, understand, then change safely</h1>
            <p className="headerCopy">
              The portal uses two separate AI lanes: one read-only lane for current state, and one proposal lane for
              official schedule edits that still require staff review.
            </p>
          </div>
          <div className="environmentBadge">{publicAppConfig.environmentName}</div>
        </div>

        <div className="metricGrid">
          <div className="metric">
            <div className="label">Published revision</div>
            <div className="value">{state.publishedSnapshot.revision}</div>
          </div>
          <div className="metric">
            <div className="label">Draft sessions</div>
            <div className="value">{state.draftSessions.length}</div>
          </div>
          <div className="metric">
            <div className="label">Blocking issues</div>
            <div className="value">{quality.issueCounts.blocking}</div>
          </div>
          <div className="metric">
            <div className="label">OpenAI status</div>
            <div className="value">{process.env.ENABLE_AI === "true" ? "On" : "Local"}</div>
          </div>
        </div>

        <div className="twoColumn">
          <section className="panel">
            <div className="label">Current-State AI</div>
            <h2>Read-only operator intelligence</h2>
            <p>
              Answers questions like what is live, what is ready, which rooms have conflicts, how many devices are
              registered, and what still blocks production launch.
            </p>
            <div className="readinessList compactList">
              <div className="readinessRow">
                <span className="statusDot pass" />
                <div>
                  <strong>Cannot mutate production</strong>
                  <span>This lane is intentionally read-only.</span>
                </div>
              </div>
              <div className="readinessRow">
                <span className="statusDot warn" />
                <div>
                  <strong>Temporary local mode</strong>
                  <span>Real OpenAI calls remain disabled until a server-side key and evals are approved.</span>
                </div>
              </div>
            </div>
          </section>

          <section className="panel">
            <div className="label">Official Change AI</div>
            <h2>Proposals before publication</h2>
            <p>
              Parses staff commands into draft edits. It can suggest time, speaker, location, title, audience, and
              status changes, but staff must apply, review, mark Ready, preview, and publish.
            </p>
            <Link className="buttonLink" href="/schedule">
              Open Schedule Workbench
            </Link>
          </section>
        </div>

        <section className="panel">
          <div className="panelHeader">
            <div>
              <div className="label">Grounding rules</div>
              <h2>How answers stay trustworthy</h2>
            </div>
          </div>
          <div className="qualityIssueList">
            <div className="qualityIssue info">
              <strong>Schedule truth</strong>
              <span>AI answers use the same draft and published schedule model as the attendee app.</span>
            </div>
            <div className="qualityIssue info">
              <strong>Website context</strong>
              <span>Temporary attendee answers include public Summit and Inspiring Children Foundation context.</span>
            </div>
            <div className="qualityIssue warning">
              <strong>Production boundary</strong>
              <span>Real model calls must run server-side, never from mobile or browser bundles.</span>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
