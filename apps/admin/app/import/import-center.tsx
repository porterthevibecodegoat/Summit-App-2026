"use client";

import { useRef, useState, type DragEvent } from "react";
import { useRouter } from "next/navigation";
import type { DocumentImportJob } from "@not-alone/validation";
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

type ImportResult = {
  ok?: boolean;
  message?: string;
  error?: string;
  detectedCount?: number;
  skippedOperationalRows?: number;
  unmatchedTimedRows?: number;
  sessions?: DraftSession[];
  importJob?: DocumentImportJob;
};

export function ImportCenter({
  currentDraft,
  recentJobs
}: {
  currentDraft: DraftSession[];
  recentJobs: DocumentImportJob[];
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("Choose a PDF, TXT, or CSV. Nothing changes in the app until staff reviews and publishes.");
  const [parsedSessions, setParsedSessions] = useState<DraftSession[]>([]);
  const [parseStats, setParseStats] = useState<{ skipped: number; unmatched: number } | null>(null);
  const [replaceConfirmed, setReplaceConfirmed] = useState(false);

  async function processFile(file: File) {
    setBusy(true);
    setParsedSessions([]);
    setParseStats(null);
    setReplaceConfirmed(false);
    setMessage(`Reading ${file.name}...`);

    try {
      const form = new FormData();
      form.set("file", file);
      const response = await fetch("/api/import/schedule", {
        method: "POST",
        headers: getStaffAuthHeaders(),
        body: form
      });
      const result = (await response.json()) as ImportResult;
      if (!response.ok || !result.ok) {
        throw new Error(result.error ?? `Import failed (${response.status}).`);
      }

      setParsedSessions(result.sessions ?? []);
      setParseStats({
        skipped: result.skippedOperationalRows ?? 0,
        unmatched: result.unmatchedTimedRows ?? 0
      });
      setMessage(result.message ?? `${result.detectedCount ?? 0} schedule row(s) are ready for review.`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to import this file.");
    } finally {
      setBusy(false);
    }
  }

  async function saveImportedDraft(mode: "replace" | "append") {
    if (!replaceConfirmed || parsedSessions.length === 0) return;
    const sessions = mode === "replace" ? parsedSessions : mergeSessions(currentDraft, parsedSessions);
    setBusy(true);
    setMessage(mode === "replace" ? "Replacing the staff draft..." : "Adding imported rows to the staff draft...");

    try {
      const response = await fetch("/api/live-ops/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getStaffAuthHeaders() },
        body: JSON.stringify({ sessions })
      });
      const result = (await response.json()) as { ok?: boolean; error?: string; message?: string };
      if (!response.ok || !result.ok) {
        throw new Error(result.error ?? `Draft save failed (${response.status}).`);
      }

      setMessage(`${result.message ?? "Draft saved."} Opening Schedule Editor for required review.`);
      router.push("/schedule");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save the imported draft.");
    } finally {
      setBusy(false);
    }
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files[0];
    if (file) void processFile(file);
  }

  return (
    <>
      <section className="panel importWorkspace">
        <div
          className={`importDropZone ${dragging ? "dragging" : ""}`}
          onDragEnter={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDragOver={(event) => event.preventDefault()}
          onDrop={handleDrop}
        >
          <div className="importGlyph" aria-hidden="true">+</div>
          <div>
            <h2>{busy ? "Reading schedule" : "Drop an updated schedule"}</h2>
            <p>PDF, TXT, or CSV, up to 15 MB</p>
          </div>
          <button className="ghostButton" disabled={busy} onClick={() => inputRef.current?.click()} type="button">
            Choose File
          </button>
          <input
            accept=".pdf,.txt,.csv,application/pdf,text/plain,text/csv"
            className="visuallyHidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void processFile(file);
              event.currentTarget.value = "";
            }}
            ref={inputRef}
            type="file"
          />
        </div>
        <div className="systemNotice" aria-live="polite">{message}</div>
      </section>

      {parsedSessions.length > 0 ? (
        <section className="panel importPreview">
          <div className="panelHeader">
            <div>
              <div className="label">Import preview</div>
              <h2>{parsedSessions.length} attendee-facing rows detected</h2>
            </div>
            <span className="badge mutedBadge">Review required</span>
          </div>
          <div className="importStats">
            <span>{parseStats?.skipped ?? 0} obvious production-only rows excluded</span>
            <span>{parseStats?.unmatched ?? 0} timed rows need manual inspection</span>
          </div>
          <div className="importTableWrap">
            <table className="importTable">
              <thead>
                <tr><th>Day</th><th>Time</th><th>Session</th><th>Location</th><th>Status</th></tr>
              </thead>
              <tbody>
                {parsedSessions.slice(0, 20).map((session) => (
                  <tr key={session.id}>
                    <td>{session.day}</td>
                    <td>{session.start} - {session.end}</td>
                    <td><strong>{session.title}</strong><span>{session.speaker}</span></td>
                    <td>{session.location}</td>
                    <td>{session.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {parsedSessions.length > 20 ? <p className="qualityNote">Showing the first 20 rows. All {parsedSessions.length} will be staged.</p> : null}
          <label className="confirmRow">
            <input checked={replaceConfirmed} onChange={(event) => setReplaceConfirmed(event.target.checked)} type="checkbox" />
            I understand these rows remain unpublished and every time, room, audience, and speaker must be reviewed.
          </label>
          <div className="proposalActions">
            <button className="button" disabled={busy || !replaceConfirmed} onClick={() => void saveImportedDraft("replace")} type="button">
              Replace Current Draft
            </button>
            <button className="ghostButton" disabled={busy || !replaceConfirmed} onClick={() => void saveImportedDraft("append")} type="button">
              Append to Draft
            </button>
          </div>
        </section>
      ) : null}

      <section className="panel">
        <div className="panelHeader">
          <div>
            <div className="label">Import history</div>
            <h2>Recent source files</h2>
          </div>
        </div>
        <div className="timeline">
          {recentJobs.length === 0 ? (
            <div className="row">
              <div className="time">No imports</div>
              <div><div className="title">No schedule files have been processed.</div><div className="summary">The first import will be recorded here.</div></div>
              <div className="badge">Ready</div>
            </div>
          ) : recentJobs.map((job) => (
            <div className="row" key={job.id}>
              <div className="time">{new Date(job.createdAt).toLocaleString()}</div>
              <div><div className="title">{job.fileName}</div><div className="summary">{job.detectedEventCount} rows detected · {job.requiresReviewCount} require review</div></div>
              <div className="badge">{job.status.replaceAll("_", " ")}</div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

function mergeSessions(current: DraftSession[], imported: DraftSession[]) {
  const importedIds = new Set(imported.map((session) => session.id));
  return [...current.filter((session) => !importedIds.has(session.id)), ...imported];
}
