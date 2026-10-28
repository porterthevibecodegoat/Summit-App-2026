import { expect, it } from "vitest";
import { memorySubmissionStore, type WorkshopSubmission } from "../staff/store";
import { buildWellnessAgenda as buildAgenda } from "./agenda";
import { planReminders, previousEvening } from "./planner";

const row = (sessionId: string, over: Partial<WorkshopSubmission> = {}): WorkshopSubmission => ({ id: sessionId, source: "form", submittedAt: "2026-10-20T10:00:00Z", name: "Example Guest", email: "guest@example.com", phone: "+17025550100", sessionId, category: "wellness", sessionTitle: "", sessionDay: "", sessionTime: "", ...over });
it("plans one previous-evening agenda per day plus one reminder per occurrence", async () => {
  const agenda = await buildAgenda(memorySubmissionStore({ workshop: [row("wellness-nov3-pilates-1"), row("wellness-nov3-pickleball"), row("wellness-nov4-pilates-1")] }));
  const jobs = planReminders(agenda);
  expect(jobs).toHaveLength(5);
  const agendas = jobs.filter(j => j.kind === "agenda");
  expect(agendas[0]).toMatchObject({ dueAt: "2026-11-03T03:00:00.000Z", sendBefore: "2026-11-03T03:15:00.000Z" });
  expect(agendas[0]!.activityOccurrenceIds).toHaveLength(2);
  expect(agendas[0]!.body).toContain("8:00 AM-10:00 AM (drop in)");
  const hourly = jobs.find(j => j.kind === "activity" && j.body.includes("Pilates"));
  expect(hourly).toMatchObject({ dueAt: "2026-11-03T15:00:00.000Z", sendBefore: "2026-11-03T15:05:00.000Z" });
  expect(jobs.find(j => j.body.includes("window opens"))!.body).toContain("in 1 hour at 8:00 AM");
  for (const job of jobs) expect(job.body).toContain("Reply STOP to opt out.");
});
it("uses Las Vegas DST on both sides of the November 1 clock change", () => {
  expect(previousEvening("2026-11-01").toISOString()).toBe("2026-11-01T02:00:00.000Z");
  expect(previousEvening("2026-11-02").toISOString()).toBe("2026-11-02T03:00:00.000Z");
});
it("keeps job keys stable across retries, new record IDs, contact email edits and reschedules", async () => {
  const agenda = await buildAgenda(memorySubmissionStore({ workshop: [row("wellness-nov3-pilates-1")] }));
  const first = planReminders(agenda);
  const updated = await buildAgenda(memorySubmissionStore({ workshop: [row("wellness-nov3-pilates-1", { id: "resubmitted", email: "new@example.com" })] }));
  updated.recipients[0]!.selections[0]!.startsAt = "2026-11-03T09:00:00-08:00";
  expect(planReminders(updated).map(j => j.key)).toEqual(first.map(j => j.key));
  expect(planReminders(updated)[1]!.dueAt).not.toBe(first[1]!.dueAt);
});
it("does not include activities that have disappeared from the complete snapshot", async () => {
  const empty = await buildAgenda(memorySubmissionStore()); expect(planReminders(empty)).toEqual([]);
});
