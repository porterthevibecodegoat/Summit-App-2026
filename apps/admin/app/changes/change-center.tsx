"use client";

import { useEffect, useMemo, useState } from "react";
import { createScheduleQualityReport } from "../../lib/schedule-quality";
import type { StaffDraftSession } from "../../lib/live-ops-store";
import { getStaffAuthHeaders } from "../staff-auth-bridge";

type LiveOpsState = {
  mode: "local-adapter" | "supabase";
  draftSessions: StaffDraftSession[];
  publishedRevision: number;
  notificationJobsCount: number;
  attendeeDevices: number;
};

type PublishPreview = {
  currentRevision: number;
  nextRevision: number;
  notificationJobsCount: number;
  counts: { added: number; removed: number; changed: number; unchanged: number };
  changes: Array<{
    id: string;
    type: "added" | "removed" | "changed";
    title: string;
    summary: string;
    fields: Array<{ label: string; before: string; after: string }>;
  }>;
};

export function ChangeCenter({ initialState }: { initialState: LiveOpsState }) {
  const [state, setState] = useState(initialState);
  const [preview, setPreview] = useState<PublishPreview | null>(null);
  const [status, setStatus] = useState("Loading the latest publish preview...");
  const [notifyAttendees, setNotifyAttendees] = useState(false);
  const [publishConfirmed, setPublishConfirmed] = useState(false);
  const [rollbackConfirmed, setRollbackConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const quality = useMemo(() => createScheduleQualityReport(state.draftSessions), [state.draftSessions]);

  async function refresh() {
    const stateResponse = await fetch("/api/live-ops/state", { headers: getStaffAuthHeaders(), cache: "no-store" });
    if (!stateResponse.ok) {
      throw new Error(`Unable to load live state (${stateResponse.status}).`);
    }
    const nextState = (await stateResponse.json()) as LiveOpsState;
    setState(nextState);

    const previewResponse = await fetch("/api/live-ops/publish-preview", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getStaffAuthHeaders() },
      body: JSON.stringify({ sessions: nextState.draftSessions }),
      cache: "no-store"
    });
    const result = (await previewResponse.json()) as { ok?: boolean; preview?: PublishPreview; error?: string };
    if (!previewResponse.ok || !result.ok || !result.preview) {
      throw new Error(result.error ?? `Unable to create preview (${previewResponse.status}).`);
    }
    setPreview(result.preview);
    setStatus(`Revision ${result.preview.currentRevision} is live. Revision ${result.preview.nextRevision} is ready for review.`);
  }

  useEffect(() => {
    void refresh().catch((error) => setStatus(error instanceof Error ? error.message : "Unable to load publish preview."));
  }, []);

  async function publish() {
    if (!publishConfirmed || !quality.publishable) {
      return;
    }
    setBusy(true);
    setStatus("Publishing the reviewed revision...");
    try {
      const response = await fetch("/api/live-ops/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getStaffAuthHeaders() },
        body: JSON.stringify({
          sessions: state.draftSessions,
          source: "MANUAL_EDITOR",
          notifyAttendees,
          confirmPublish: true
        })
      });
      const result = (await response.json()) as { ok?: boolean; revision?: number; error?: string; issues?: string[] };
      if (!response.ok || !result.ok) {
        throw new Error(result.issues?.join(" ") ?? result.error ?? `Publish failed (${response.status}).`);
      }
      setPublishConfirmed(false);
      setStatus(`Revision ${result.revision} is now attendee-facing.`);
      await refresh();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Publish failed.");
    } finally {
      setBusy(false);
    }
  }

  async function rollback() {
    if (!rollbackConfirmed) {
      return;
    }
    setBusy(true);
    setStatus("Restoring the previous published schedule...");
    try {
      const response = await fetch("/api/live-ops/rollback", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getStaffAuthHeaders() },
        body: JSON.stringify({ confirmRollback: true, notifyAttendees })
      });
      const result = (await response.json()) as { ok?: boolean; publishedRevision?: number; error?: string; issues?: string[] };
      if (!response.ok || !result.ok) {
        throw new Error(result.issues?.join(" ") ?? result.error ?? `Rollback failed (${response.status}).`);
      }
      setRollbackConfirmed(false);
      setStatus(`The previous schedule was restored as revision ${result.publishedRevision}.`);
      await refresh();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Rollback failed.");
    } finally {
      setBusy(false);
    }
  }

  const changeCount = preview ? preview.counts.added + preview.counts.changed + preview.counts.removed : 0;

  return (
    <>
      <div className="systemNotice" role="status">{status}</div>

      <div className="metricGrid controlMetrics">
        <Metric label="Live revision" value={String(state.publishedRevision)} />
        <Metric label="Proposed changes" value={String(changeCount)} />
        <Metric label="Draft rows" value={String(state.draftSessions.length)} />
        <Metric label="Registered devices" value={String(state.attendeeDevices)} />
      </div>

      <section className="panel qualityPanel">
        <div className="panelHeader compactPanelHeader">
          <div>
            <div className="label">Release gate</div>
            <h2>{quality.publishable ? "Draft passes schedule checks" : "Draft needs attention"}</h2>
          </div>
          <span className="badge mutedBadge">{state.mode}</span>
        </div>
        {quality.issues.length > 0 ? (
          <div className="qualityIssueList">
            {quality.issues.slice(0, 8).map((issue) => (
              <div className={`qualityIssue ${issue.severity}`} key={issue.id}>
                <strong>{issue.title}</strong>
                <span>{issue.message}</span>
              </div>
            ))}
          </div>
        ) : <p className="qualityNote">No conflicts, missing fields, duplicate IDs, or invalid session times were found.</p>}
      </section>

      <section className="panel">
        <div className="panelHeader">
          <div>
            <div className="label">Attendee-facing diff</div>
            <h2>{preview ? `Revision ${preview.currentRevision} → ${preview.nextRevision}` : "Preparing comparison"}</h2>
          </div>
          {preview ? <span className="badge">{preview.notificationJobsCount} reminder jobs</span> : null}
        </div>
        {preview?.changes.length ? (
          <div className="previewChangeList">
            {preview.changes.map((change) => (
              <div className={`previewChange ${change.type}`} key={change.id}>
                <strong>{change.title}</strong>
                <span>{change.type} · {change.summary}</span>
                {change.fields.map((field) => (
                  <div className="changeField" key={`${change.id}-${field.label}`}>
                    <b>{field.label}</b>
                    <span>{field.before || "Not set"} → {field.after || "Not set"}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        ) : <p>No attendee-facing differences are waiting to publish.</p>}
      </section>

      <div className="twoColumn publishDecisionGrid">
        <section className="panel">
          <div className="label">Publish decision</div>
          <h2>Release the reviewed draft</h2>
          <p>This creates a new immutable revision. The mobile app receives it through the published snapshot.</p>
          <div className="publishControls">
            <label className="checkRow">
              <input checked={notifyAttendees} onChange={(event) => setNotifyAttendees(event.target.checked)} type="checkbox" />
              <span>Prepare attendee notification jobs</span>
            </label>
            <label className="checkRow">
              <input checked={publishConfirmed} onChange={(event) => setPublishConfirmed(event.target.checked)} type="checkbox" />
              <span>I reviewed the full attendee-facing change</span>
            </label>
          </div>
          <button className={publishConfirmed && quality.publishable && !busy ? "button fullWidthButton" : "disabledButton"} disabled={!publishConfirmed || !quality.publishable || busy} onClick={publish} type="button">
            {busy ? "Working..." : "Publish New Revision"}
          </button>
        </section>

        <section className="panel dangerPanel">
          <div className="label">Recovery</div>
          <h2>Restore the previous revision</h2>
          <p>Rollback never deletes history. It creates a new revision from the previous published snapshot.</p>
          <div className="publishControls">
            <label className="checkRow">
              <input checked={rollbackConfirmed} onChange={(event) => setRollbackConfirmed(event.target.checked)} type="checkbox" />
              <span>I understand this changes the attendee schedule</span>
            </label>
          </div>
          <button className={rollbackConfirmed && !busy ? "ghostButton fullWidthButton" : "disabledButton"} disabled={!rollbackConfirmed || busy} onClick={rollback} type="button">
            Restore Previous Revision
          </button>
        </section>
      </div>
    </>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="metric"><div className="label">{label}</div><div className="value">{value}</div></div>;
}
