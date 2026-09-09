"use client";

import { useState } from "react";

export function NotificationControl({ enabled }: { enabled: boolean }) {
  const [confirmed, setConfirmed] = useState(false);
  const [message, setMessage] = useState(
    enabled
      ? "The worker is armed. Confirm before manually processing notifications that are due now."
      : "Manual dispatch remains safely unavailable until push credentials and both delivery flags are enabled."
  );
  const [working, setWorking] = useState(false);

  async function dispatch() {
    if (!enabled || !confirmed || working) return;
    setWorking(true);
    setMessage("Claiming and processing due notification jobs...");
    try {
      const response = await fetch("/api/notifications/dispatch", { method: "POST", cache: "no-store" });
      const result = (await response.json()) as {
        error?: string;
        claimedJobs?: number;
        acceptedDeliveries?: number;
        failedDeliveries?: number;
      };
      if (!response.ok) throw new Error(result.error ?? `Dispatch returned ${response.status}.`);
      setMessage(
        `${result.claimedJobs ?? 0} job(s) processed: ${result.acceptedDeliveries ?? 0} accepted delivery target(s), ` +
        `${result.failedDeliveries ?? 0} failed target(s).`
      );
      setConfirmed(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Notification dispatch failed.");
    } finally {
      setWorking(false);
    }
  }

  return (
    <section className="panel notificationControl">
      <div>
        <div className="label">Manual operations</div>
        <h2>Process due reminders</h2>
        <p>{message}</p>
      </div>
      <label className="confirmRow">
        <input
          checked={confirmed}
          disabled={!enabled || working}
          onChange={(event) => setConfirmed(event.target.checked)}
          type="checkbox"
        />
        I confirm that due reminders may be sent to registered attendee devices.
      </label>
      <button className="button" disabled={!enabled || !confirmed || working} onClick={dispatch} type="button">
        {working ? "Processing..." : "Process Due Reminders"}
      </button>
    </section>
  );
}
