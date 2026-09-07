"use client";

import { useEffect, useMemo, useState, type DragEvent } from "react";
import type { EventSnapshot } from "@not-alone/validation";
import {
  createScheduleProposal,
  createStateAnswer,
  type StaffAiProposal as Proposal
} from "../../lib/staff-ai";
import { createScheduleQualityReport } from "../../lib/schedule-quality";
import { getStaffAuthHeaders } from "../staff-auth-bridge";

type DraftSession = {
  id: string;
  day: string;
  start: string;
  end: string;
  title: string;
  speaker: string;
  location: string;
  audience: string;
  status: "Draft" | "Ready" | "Needs review";
  reminders: string;
};

type PublishState = {
  revision: number;
  message: string;
  updatedAt: string;
};

type LiveOpsState = {
  mode: "local-adapter" | "supabase";
  revision: number;
  draftSessions: DraftSession[];
  publishedRevision: number;
  lastPublishedAt?: string;
  lastPublishedMessage?: string;
  notificationJobsCount: number;
  attendeeDevices: number;
};

type PublishPreview = {
  currentRevision: number;
  nextRevision: number;
  notificationJobsCount: number;
  counts: {
    added: number;
    removed: number;
    changed: number;
    unchanged: number;
  };
  changes: Array<{
    id: string;
    type: "added" | "removed" | "changed";
    title: string;
    summary: string;
    fields: Array<{ label: string; before: string; after: string }>;
  }>;
};

const fallbackDraftSessions: DraftSession[] = [
  {
    id: "draft-wozniak-keynote",
    day: "Mon Nov 2",
    start: "3:00 PM",
    end: "4:00 PM",
    title: "Innovation, Humanity, and Not Being Alone",
    speaker: "Steve Wozniak",
    location: "Encore Theater",
    audience: "All attendees",
    status: "Draft",
    reminders: "30m, 10m"
  },
  {
    id: "draft-reset-lounge",
    day: "Mon Nov 2",
    start: "4:20 PM",
    end: "4:50 PM",
    title: "Guided Reset and Reflection",
    speaker: "Wellness Team",
    location: "Reflection Lounge",
    audience: "All attendees",
    status: "Needs review",
    reminders: "10m"
  },
  {
    id: "draft-founder-reception",
    day: "Mon Nov 2",
    start: "6:00 PM",
    end: "7:30 PM",
    title: "Founder Circle Reception",
    speaker: "Host Committee",
    location: "Terrace Salon",
    audience: "Founders only",
    status: "Draft",
    reminders: "30m"
  }
];

export function ScheduleWorkbench({
  snapshot,
  environmentName
}: {
  snapshot: EventSnapshot;
  environmentName: string;
}) {
  const importedSessions = useMemo<DraftSession[]>(
    () =>
      snapshot.scheduleItems.map((item) => ({
        id: item.id,
        day: `Day ${item.dayOrder + 1}`,
        start: new Intl.DateTimeFormat("en-US", {
          hour: "numeric",
          minute: "2-digit",
          timeZone: snapshot.event.timeZone
        }).format(new Date(item.startUtc)),
        end: new Intl.DateTimeFormat("en-US", {
          hour: "numeric",
          minute: "2-digit",
          timeZone: snapshot.event.timeZone
        }).format(new Date(item.endUtc)),
        title: item.title,
        speaker: item.speakerIds.length > 0 ? `${item.speakerIds.length} linked speaker(s)` : "Unassigned",
        location: item.locationName,
        audience: item.visibilityScope.label,
        status: item.published ? "Ready" : "Draft",
        reminders: `${item.notificationOffsetsMinutes.join("m, ")}m`
      })),
    [snapshot]
  );
  const [sessions, setSessions] = useState<DraftSession[]>(importedSessions.length > 0 ? importedSessions : fallbackDraftSessions);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [stateQuestion, setStateQuestion] = useState("What is live, what is ready, and what still needs review?");
  const [stateAnswer, setStateAnswer] = useState<string | null>(null);
  const [command, setCommand] = useState("The 3pm speaker has now changed to 3:30 and it is now Mike Tyson instead of Steve Wozniak.");
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [importMessage, setImportMessage] = useState("Drop TXT, CSV, or PDF schedule files here. Text-based files can be parsed now; PDF extraction is queued for the backend parser.");
  const [publishState, setPublishState] = useState<PublishState | null>(null);
  const [apiStatus, setApiStatus] = useState("Loading live-ops adapter...");
  const [backendMode, setBackendMode] = useState<LiveOpsState["mode"]>("local-adapter");
  const [draftDirty, setDraftDirty] = useState(false);
  const [notifyAttendees, setNotifyAttendees] = useState(false);
  const [publishConfirmed, setPublishConfirmed] = useState(false);
  const [publishPreview, setPublishPreview] = useState<PublishPreview | null>(null);
  const [previewStatus, setPreviewStatus] = useState("Publish preview will appear after the live-ops adapter loads.");
  const [rollbackConfirmed, setRollbackConfirmed] = useState(false);
  const qualityReport = useMemo(() => createScheduleQualityReport(sessions), [sessions]);
  const readyCount = qualityReport.readySessions;
  const reminderCount = qualityReport.reminderReadySessions;
  const needsReviewCount = qualityReport.needsReviewSessions;
  const publishIssues = qualityReport.issues.filter((issue) => issue.severity === "blocking").map((issue) => issue.message);
  const canPublish = publishIssues.length === 0 && publishConfirmed;

  useEffect(() => {
    let mounted = true;

    async function loadLiveOpsState() {
      try {
        const response = await fetch("/api/live-ops/state", { cache: "no-store" });
        if (!response.ok) {
          throw new Error(`Live-ops state returned ${response.status}`);
        }
        const state = (await response.json()) as LiveOpsState;
        if (!mounted) {
          return;
        }
        if (state.draftSessions.length > 0) {
          setSessions(state.draftSessions);
        }
        setBackendMode(state.mode);
        if (state.lastPublishedAt && state.lastPublishedMessage) {
          setPublishState({
            revision: state.publishedRevision,
            message: state.lastPublishedMessage,
            updatedAt: new Date(state.lastPublishedAt).toLocaleString()
          });
        }
        setApiStatus(
          `Connected to ${state.mode}. Published revision ${state.publishedRevision}; ${state.notificationJobsCount} notification job(s); ${state.attendeeDevices} registered device(s).`
        );
      } catch (error) {
        if (mounted) {
          setApiStatus(
            error instanceof Error
              ? `Local adapter unavailable: ${error.message}`
              : "Local adapter unavailable. Drafts remain browser-local until the API responds."
          );
        }
      }
    }

    void loadLiveOpsState();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    const controller = new AbortController();

    async function loadPublishPreview() {
      if (sessions.length === 0) {
        setPublishPreview(null);
        setPreviewStatus("Add at least one draft session to preview publication.");
        return;
      }

      try {
        const response = await fetch("/api/live-ops/publish-preview", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...getStaffAuthHeaders() },
          body: JSON.stringify({ sessions }),
          cache: "no-store",
          signal: controller.signal
        });
        const result = (await response.json()) as { ok?: boolean; preview?: PublishPreview; error?: string };

        if (!response.ok || !result.ok || !result.preview) {
          throw new Error(result.error ?? `Publish preview returned ${response.status}`);
        }

        if (!mounted) {
          return;
        }

        setPublishPreview(result.preview);
        setPreviewStatus(
          `Previewing revision ${result.preview.currentRevision} -> ${result.preview.nextRevision}; ${result.preview.notificationJobsCount} reminder job(s) would be prepared.`
        );
      } catch (error) {
        if (mounted && !(error instanceof DOMException && error.name === "AbortError")) {
          setPublishPreview(null);
          setPreviewStatus(error instanceof Error ? error.message : "Unable to load publish preview.");
        }
      }
    }

    const timeout = window.setTimeout(() => {
      void loadPublishPreview();
    }, 300);

    return () => {
      mounted = false;
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [sessions]);

  function moveSession(targetId: string) {
    if (!draggedId || draggedId === targetId) {
      return;
    }

    setSessions((current) => {
      const dragged = current.find((item) => item.id === draggedId);
      if (!dragged) {
        return current;
      }

      const remaining = current.filter((item) => item.id !== draggedId);
      const targetIndex = remaining.findIndex((item) => item.id === targetId);
      const next = [...remaining];
      next.splice(targetIndex, 0, dragged);
      return next;
    });
    setDraftDirty(true);
    setPublishConfirmed(false);
  }

  function updateSession(id: string, field: keyof DraftSession, value: string) {
    setSessions((current) =>
      current.map((session) => (session.id === id ? { ...session, [field]: value, status: "Needs review" } : session))
    );
    setDraftDirty(true);
    setPublishConfirmed(false);
  }

  function markSessionStatus(id: string, status: DraftSession["status"]) {
    setSessions((current) => current.map((session) => (session.id === id ? { ...session, status } : session)));
    setDraftDirty(true);
    setPublishConfirmed(false);
  }

  function addSession(afterId?: string) {
    setSessions((current) => {
      const nextSession = createBlankSession(current.length);
      if (!afterId) {
        return [...current, nextSession];
      }

      const insertAfter = current.findIndex((session) => session.id === afterId);
      if (insertAfter < 0) {
        return [...current, nextSession];
      }

      const next = [...current];
      next.splice(insertAfter + 1, 0, nextSession);
      return next;
    });
    setDraftDirty(true);
    setPublishConfirmed(false);
  }

  function duplicateSession(id: string) {
    setSessions((current) => {
      const source = current.find((session) => session.id === id);
      if (!source) {
        return current;
      }

      const sourceIndex = current.findIndex((session) => session.id === id);
      const copy = {
        ...source,
        id: createDraftId("copy"),
        title: `${source.title} Copy`,
        status: "Needs review" as const
      };
      const next = [...current];
      next.splice(sourceIndex + 1, 0, copy);
      return next;
    });
    setDraftDirty(true);
    setPublishConfirmed(false);
  }

  function deleteSession(id: string) {
    setSessions((current) => current.filter((session) => session.id !== id));
    setDraftDirty(true);
    setPublishConfirmed(false);
  }

  async function runCommand() {
    try {
      const response = await fetch("/api/ai/operator/propose", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getStaffAuthHeaders() },
        body: JSON.stringify({ commandText: command, sessions })
      });
      const result = (await response.json()) as { proposal?: Proposal; error?: string };

      if (!response.ok || !result.proposal) {
        throw new Error(result.error ?? `Proposal API returned ${response.status}`);
      }

      setProposal(result.proposal);
    } catch {
      setProposal(createScheduleProposal(command, sessions));
    }
  }

  async function askStateAi() {
    try {
      const response = await fetch("/api/ai/state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: stateQuestion, sessions, publishState })
      });
      const result = (await response.json()) as { answer?: string };
      if (!response.ok || !result.answer) {
        throw new Error(`State AI returned ${response.status}`);
      }
      setStateAnswer(result.answer);
    } catch {
      setStateAnswer(
        createStateAnswer({
          question: stateQuestion,
          sessions,
          baseRevision: snapshot.revision,
          publishState,
          backendMode
        })
      );
    }
  }

  async function saveDraft() {
    setApiStatus("Saving draft to live-ops adapter...");
    try {
      const response = await fetch("/api/live-ops/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getStaffAuthHeaders() },
        body: JSON.stringify({ sessions })
      });
      const result = (await response.json()) as { ok?: boolean; message?: string; error?: string; draftSessions?: DraftSession[] };
      if (!response.ok || !result.ok) {
        throw new Error(result.error ?? `Draft save returned ${response.status}`);
      }
      if (result.draftSessions) {
        setSessions(result.draftSessions);
      }
      setDraftDirty(false);
      setApiStatus(result.message ?? "Draft saved.");
    } catch (error) {
      setApiStatus(error instanceof Error ? error.message : "Draft save failed.");
    }
  }

  function applyProposal() {
    if (!proposal) {
      return;
    }

    setSessions((current) =>
      current.map((session) => {
        const sessionChanges = proposal.changes.filter((change) => change.id === session.id);
        if (sessionChanges.length === 0) {
          return session;
        }

        return sessionChanges.reduce<DraftSession>((draft, change) => {
          if (change.label === "Start time") {
            return { ...draft, start: change.after, status: "Needs review" };
          }

          if (change.label === "Speaker") {
            return { ...draft, speaker: change.after, status: "Needs review" };
          }

          if (change.label === "End time") {
            return { ...draft, end: change.after, status: "Needs review" };
          }

          if (change.label === "Location") {
            return { ...draft, location: change.after, status: "Needs review" };
          }

          if (change.label === "Title") {
            return { ...draft, title: change.after, status: "Needs review" };
          }

          if (change.label === "Audience") {
            return { ...draft, audience: change.after, status: "Needs review" };
          }

          if (change.label === "Status" && isDraftStatus(change.after)) {
            return { ...draft, status: change.after };
          }

          return draft;
        }, session);
      })
    );
    setProposal(null);
    setDraftDirty(true);
    setPublishConfirmed(false);
  }

  async function publishGlobally() {
    if (!canPublish) {
      return;
    }

    setApiStatus("Publishing reviewed draft revision...");
    try {
      const response = await fetch("/api/live-ops/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getStaffAuthHeaders() },
        body: JSON.stringify({ sessions, source: "MANUAL_EDITOR", notifyAttendees, confirmPublish: publishConfirmed })
      });
      const result = (await response.json()) as {
        ok?: boolean;
        revision?: number;
        lastPublishedAt?: string;
        message?: string;
        error?: string;
        issues?: string[];
        notificationJobsCount?: number;
      };

      if (!response.ok || !result.ok || !result.revision) {
        throw new Error(result.issues?.join(" ") ?? result.error ?? `Publish returned ${response.status}`);
      }

      setPublishState({
        revision: result.revision,
        message:
          result.message ??
          "Published revision to the local attendee snapshot. Production delivery will use Supabase realtime and server push workers.",
        updatedAt: result.lastPublishedAt ? new Date(result.lastPublishedAt).toLocaleString() : new Date().toLocaleString()
      });
      setDraftDirty(false);
      setPublishConfirmed(false);
      setApiStatus(`Published revision ${result.revision}; ${result.notificationJobsCount ?? 0} notification job(s) reconciled.`);
      setRollbackConfirmed(false);
    } catch (error) {
      setApiStatus(error instanceof Error ? error.message : "Publish failed.");
    }
  }

  async function rollbackPublished() {
    if (!rollbackConfirmed) {
      return;
    }

    setApiStatus("Rolling back by publishing the previous attendee snapshot...");
    try {
      const response = await fetch("/api/live-ops/rollback", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getStaffAuthHeaders() },
        body: JSON.stringify({ confirmRollback: rollbackConfirmed, notifyAttendees })
      });
      const result = (await response.json()) as {
        ok?: boolean;
        revision?: number;
        lastPublishedAt?: string;
        message?: string;
        error?: string;
        issues?: string[];
        notificationJobsCount?: number;
      };

      if (!response.ok || !result.ok || !result.revision) {
        throw new Error(result.issues?.join(" ") ?? result.error ?? `Rollback returned ${response.status}`);
      }

      setPublishState({
        revision: result.revision,
        message: result.message ?? "Previous published schedule was restored as a new attendee-facing revision.",
        updatedAt: result.lastPublishedAt ? new Date(result.lastPublishedAt).toLocaleString() : new Date().toLocaleString()
      });
      setRollbackConfirmed(false);
      setPublishConfirmed(false);
      setDraftDirty(false);
      setApiStatus(`Rollback published revision ${result.revision}; ${result.notificationJobsCount ?? 0} reminder job(s) reconciled.`);

      const stateResponse = await fetch("/api/live-ops/state", { cache: "no-store" });
      const state = (await stateResponse.json()) as LiveOpsState;
      if (state.draftSessions.length > 0) {
        setSessions(state.draftSessions);
      }
    } catch (error) {
      setApiStatus(error instanceof Error ? error.message : "Rollback failed.");
    }
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const file = event.dataTransfer.files[0];

    if (!file) {
      return;
    }

    if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
      setImportMessage(`${file.name} received. Production PDF parsing needs the backend parser before it can publish attendee data.`);
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const text = String(reader.result ?? "");
      const response = await fetch("/api/import/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getStaffAuthHeaders() },
        body: JSON.stringify({ fileName: file.name, text })
      });
      const result = (await response.json()) as { ok?: boolean; message?: string; sessions?: DraftSession[]; error?: string };
      const parsed = result.sessions ?? [];
      if (!response.ok || !result.ok || parsed.length === 0) {
        setImportMessage(result.message ?? result.error ?? `${file.name} loaded, but no schedule rows matched the current parser.`);
        return;
      }

      setSessions(parsed);
      setDraftDirty(true);
      setPublishConfirmed(false);
      setImportMessage(result.message ?? `${file.name} imported into draft review with ${parsed.length} parsed session(s).`);
    };
    reader.readAsText(file);
  }

  return (
    <section className="content controlRoom">
      <div className="pageHeader">
        <div>
          <div className="kicker">Schedule Control Room - {environmentName}</div>
          <h1>Build, review, and publish attendee programming</h1>
          <p className="headerCopy">
            Drag sessions into order, use the AI command bar for structured edits, and stage import files before they
            become attendee-facing data.
          </p>
        </div>
        <div className="environmentBadge">{backendMode}</div>
      </div>

      <div className="systemNotice">{apiStatus}</div>

      <div className="metricGrid controlMetrics">
        <Metric label="Draft sessions" value={String(sessions.length)} />
        <Metric label="Ready to publish" value={String(readyCount)} />
        <Metric label="Needs review" value={String(needsReviewCount)} />
        <Metric label="Reminder metadata" value={String(reminderCount)} />
      </div>

      {publishIssues.length > 0 ? (
        <div className="systemNotice warningNotice">
          <strong>Publish review needed:</strong> {publishIssues.slice(0, 3).join(" ")}
          {publishIssues.length > 3 ? ` ${publishIssues.length - 3} more issue(s) need review.` : ""}
        </div>
      ) : (
        <div className="systemNotice successNotice">
          All draft rows have the minimum fields needed for attendee-safe publication.
        </div>
      )}

      <section className="panel qualityPanel">
        <div className="panelHeader compactPanelHeader">
          <div>
            <div className="label">Schedule quality</div>
            <h2>{qualityReport.publishable ? "Ready for controlled publish" : "Resolve before publish"}</h2>
          </div>
          <span className="badge mutedBadge">
            {qualityReport.issueCounts.blocking} blocking · {qualityReport.issueCounts.warning} warning
          </span>
        </div>
        <div className="qualityGrid">
          <QualityMetric label="Ready" value={qualityReport.readySessions} />
          <QualityMetric label="Needs review" value={qualityReport.needsReviewSessions} />
          <QualityMetric label="Draft" value={qualityReport.draftSessions} />
          <QualityMetric label="Room conflicts" value={qualityReport.conflicts.length} />
        </div>
        {qualityReport.issues.length > 0 ? (
          <div className="qualityIssueList">
            {qualityReport.issues.slice(0, 6).map((issue) => (
              <div className={`qualityIssue ${issue.severity}`} key={issue.id}>
                <strong>{issue.title}</strong>
                <span>{issue.message}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="qualityNote">No blocking issues or warnings found in the current draft.</p>
        )}
      </section>

      <div className="assistantGrid">
        <section className="panel assistantPanel stateAiPanel">
          <div className="panelHeader">
            <div>
              <div className="label">State AI</div>
              <h2>Ask what is true right now</h2>
            </div>
            <span className="badge mutedBadge">Read only</span>
          </div>
          <div className="commandGrid">
            <textarea
              aria-label="State AI question"
              value={stateQuestion}
              onChange={(event) => setStateQuestion(event.target.value)}
              placeholder="Ask about current draft state, reminders, audience rules, or what still needs review."
            />
            <button className="button" type="button" onClick={askStateAi}>Ask State AI</button>
          </div>
          {stateAnswer ? (
            <div className="answerBox">
              <div className="label">Current-state answer</div>
              <p>{stateAnswer}</p>
            </div>
          ) : null}
        </section>

        <section className="panel assistantPanel commandPanel">
          <div className="panelHeader">
            <div>
              <div className="label">Official Change AI</div>
              <h2>Make reviewed changes for the app</h2>
            </div>
            <span className="badge mutedBadge">Proposal required</span>
          </div>
          <div className="commandGrid">
            <textarea
              aria-label="Official Change AI command"
              value={command}
              onChange={(event) => setCommand(event.target.value)}
              placeholder="Example: Move the 3pm keynote to 3:30 and change the speaker to Mike Tyson."
            />
            <button className="button" type="button" onClick={runCommand}>Generate Proposal</button>
          </div>
          {proposal ? (
            <div className="proposalBox">
              <div>
                <div className="label">Proposed update - {proposal.confidence} confidence</div>
                <h3>{proposal.summary}</h3>
              </div>
              <div className="changeList">
                {proposal.changes.map((change) => (
                  <div className="changeRow" key={`${change.id}-${change.label}`}>
                    <span>{change.label}</span>
                    <strong>{change.before}</strong>
                    <span>-&gt;</span>
                    <strong>{change.after}</strong>
                  </div>
                ))}
              </div>
              {proposal.warnings.length > 0 ? (
                <div className="systemNotice warningNotice">
                  {proposal.warnings.join(" ")}
                </div>
              ) : null}
              <div className="proposalActions">
                <button className="button" type="button" onClick={applyProposal}>Apply to Draft</button>
                <button className="ghostButton" type="button" onClick={() => setProposal(null)}>Dismiss</button>
              </div>
            </div>
          ) : null}
        </section>
      </div>

      <div className="workbenchGrid">
        <section className="panel scheduleBoard">
          <div className="panelHeader">
            <div>
              <div className="label">Drag-and-drop agenda</div>
              <h2>Draft schedule</h2>
            </div>
            <div className="panelActions">
              <button className="ghostButton" type="button" onClick={() => addSession()}>
                Add Session
              </button>
              <button
                className="ghostButton"
                type="button"
                onClick={() => {
                  setSessions((current) => current.map((session) => ({ ...session, status: "Ready" })));
                  setDraftDirty(true);
                  setPublishConfirmed(false);
                }}
              >
                Mark All Ready
              </button>
              <button className="ghostButton" type="button" onClick={saveDraft}>
                Save Draft
              </button>
            </div>
          </div>

          <div className="sessionList">
            {sessions.map((session) => (
              <article
                className={`sessionCard ${draggedId === session.id ? "dragging" : ""}`}
                draggable
                key={session.id}
                onDragStart={() => setDraggedId(session.id)}
                onDragEnd={() => setDraggedId(null)}
                onDragOver={handleDragOver}
                onDrop={() => moveSession(session.id)}
              >
                <div className="dragHandle" aria-hidden="true">::</div>
                <div className="sessionFields">
                  <div className="sessionTopline">
                    <input value={session.day} onChange={(event) => updateSession(session.id, "day", event.target.value)} aria-label="Day" />
                    <input value={session.start} onChange={(event) => updateSession(session.id, "start", event.target.value)} aria-label="Start time" />
                    <input value={session.end} onChange={(event) => updateSession(session.id, "end", event.target.value)} aria-label="End time" />
                  </div>
                  <input className="titleInput" value={session.title} onChange={(event) => updateSession(session.id, "title", event.target.value)} aria-label="Title" />
                  <div className="sessionMetaGrid">
                    <input value={session.speaker} onChange={(event) => updateSession(session.id, "speaker", event.target.value)} aria-label="Speaker" />
                    <input value={session.location} onChange={(event) => updateSession(session.id, "location", event.target.value)} aria-label="Location" />
                    <select value={session.audience} onChange={(event) => updateSession(session.id, "audience", event.target.value)} aria-label="Audience">
                      <option>All attendees</option>
                      <option>Founders only</option>
                      <option>Staff only</option>
                      <option>VIP</option>
                    </select>
                    <input value={session.reminders} onChange={(event) => updateSession(session.id, "reminders", event.target.value)} aria-label="Reminder offsets" />
                  </div>
                </div>
                <div className="sessionActions">
                  <span className={`statusPill ${session.status === "Ready" ? "ready" : ""}`}>{session.status}</span>
                  <button className="miniButton" type="button" onClick={() => markSessionStatus(session.id, "Ready")}>
                    Ready
                  </button>
                  <button className="miniButton" type="button" onClick={() => markSessionStatus(session.id, "Needs review")}>
                    Review
                  </button>
                  <button className="miniButton" type="button" onClick={() => addSession(session.id)}>
                    Add Below
                  </button>
                  <button className="miniButton" type="button" onClick={() => duplicateSession(session.id)}>
                    Duplicate
                  </button>
                  <button className="miniButton dangerMiniButton" type="button" onClick={() => deleteSession(session.id)}>
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <aside className="sideStack">
          <section className="panel importPanel" onDragOver={handleDragOver} onDrop={handleDrop}>
            <div className="label">Schedule import</div>
            <h2>Drop updated agenda files</h2>
            <p>{importMessage}</p>
            <div className="dropZone">
              <strong>Drop PDF, TXT, or CSV</strong>
              <span>Imported rows stay draft until reviewed.</span>
            </div>
          </section>

          <section className="panel publishPanel">
            <div className="label">Attendee app publishing</div>
            <h2>Controlled rollout path</h2>
            <ol className="publishSteps">
              <li>Staff edits draft agenda.</li>
              <li>AI/import changes become reviewable proposals.</li>
              <li>Authorized staff publishes a snapshot revision.</li>
              <li>Mobile app refreshes the published schedule from /api/snapshot.</li>
              <li>Notification jobs are recalculated for the future server worker.</li>
            </ol>
            <div className="publishPreview">
              <div className="panelHeader compactPanelHeader">
                <div>
                  <div className="label">Publish preview</div>
                  <h3>What will change</h3>
                </div>
                {publishPreview ? <span className="badge mutedBadge">r{publishPreview.nextRevision}</span> : null}
              </div>
              <p className="tinyNote">{previewStatus}</p>
              {publishPreview ? (
                <>
                  <div className="previewCounts">
                    <span>{publishPreview.counts.added} added</span>
                    <span>{publishPreview.counts.changed} changed</span>
                    <span>{publishPreview.counts.removed} removed</span>
                    <span>{publishPreview.counts.unchanged} unchanged</span>
                  </div>
                  <div className="previewChangeList">
                    {publishPreview.changes.slice(0, 4).map((change) => (
                      <div className={`previewChange ${change.type}`} key={change.id}>
                        <strong>{change.title}</strong>
                        <span>{change.type} - {change.summary}</span>
                      </div>
                    ))}
                    {publishPreview.changes.length > 4 ? (
                      <p className="tinyNote">+{publishPreview.changes.length - 4} more change(s) in this revision.</p>
                    ) : null}
                  </div>
                </>
              ) : null}
            </div>
            <div className="publishControls">
              <label className="checkRow">
                <input
                  checked={notifyAttendees}
                  onChange={(event) => setNotifyAttendees(event.target.checked)}
                  type="checkbox"
                />
                <span>Queue notification jobs for this revision</span>
              </label>
              <label className="checkRow">
                <input
                  checked={publishConfirmed}
                  onChange={(event) => setPublishConfirmed(event.target.checked)}
                  type="checkbox"
                />
                <span>I reviewed this draft and want it attendee-facing</span>
              </label>
            </div>
            {publishState ? (
              <div className="publishResult">
                <div className="label">Published revision {publishState.revision}</div>
                <p>{publishState.message}</p>
                <span>{publishState.updatedAt}</span>
              </div>
            ) : null}
            <button
              className={canPublish ? "button fullWidthButton" : "disabledButton"}
              disabled={!canPublish}
              type="button"
              onClick={publishGlobally}
            >
              {publishIssues.length > 0
                ? "Resolve review items before publish"
                : publishConfirmed
                  ? "Publish Attendee Snapshot"
                  : "Confirm reviewed draft before publish"}
            </button>
            <div className="rollbackBox">
              <div>
                <div className="label">Emergency correction</div>
                <p>Restore the previous published schedule by creating a new revision.</p>
              </div>
              <label className="checkRow">
                <input
                  checked={rollbackConfirmed}
                  onChange={(event) => setRollbackConfirmed(event.target.checked)}
                  type="checkbox"
                />
                <span>I understand rollback will update the attendee snapshot</span>
              </label>
              <button
                className={rollbackConfirmed ? "ghostButton fullWidthButton" : "disabledButton"}
                disabled={!rollbackConfirmed}
                type="button"
                onClick={rollbackPublished}
              >
                Roll Back to Previous Published Revision
              </button>
            </div>
            {draftDirty ? <p className="tinyNote">Unsaved draft changes are present.</p> : null}
          </section>
        </aside>
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric">
      <div className="label">{label}</div>
      <div className="value">{value}</div>
    </div>
  );
}

function QualityMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="qualityMetric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function isDraftStatus(value: string): value is DraftSession["status"] {
  return value === "Draft" || value === "Ready" || value === "Needs review";
}

function createBlankSession(index: number): DraftSession {
  return {
    id: createDraftId("new"),
    day: "Mon Nov 2",
    start: "9:00 AM",
    end: "9:45 AM",
    title: `New Session ${index + 1}`,
    speaker: "Unassigned",
    location: "Needs location",
    audience: "All attendees",
    status: "Needs review",
    reminders: "10m"
  };
}

function createDraftId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.round(Math.random() * 10000)}`;
}
