import { describe, expect, it } from "vitest";
import { demoSnapshot } from "@not-alone/test-fixtures";
import type { EventChangeOperation, EventSnapshot, ScheduleItem } from "@not-alone/validation";
import { getNowAndUpcoming, operatorAiCreateProposal, publishProposal, stateAiCanMutate } from ".";

const eventId = demoSnapshot.event.id;
const scheduleItemId = "78f7af0b-9146-4d65-b848-4105f6a5b209";
const operationId = "f7fd56d5-5857-4bc2-a4e0-451a3470d7c2";

function createSnapshot(): EventSnapshot {
  const item: ScheduleItem = {
    id: scheduleItemId,
    eventId,
    title: "Steve Wozniak Panel",
    shortTitle: "Wozniak Panel",
    summary: "Main-stage conversation.",
    description: "Published session used for live-ops tests.",
    startUtc: "2026-11-02T23:00:00.000Z",
    endUtc: "2026-11-03T00:00:00.000Z",
    eventTimeZone: demoSnapshot.event.timeZone,
    dayOrder: 0,
    locationId: "65f7e5d1-01bc-4495-813b-929f86503fcf",
    locationName: "Main Stage",
    speakerIds: ["11111111-1111-4111-8111-111111111111"],
    status: "scheduled",
    visibilityScope: { id: "public", label: "All attendees" },
    eligibilityScope: { id: "all_attendees", label: "All attendees" },
    notificationScope: { id: "all_attendees", label: "All attendees" },
    notificationOffsetsMinutes: [60],
    featured: true,
    published: true,
    revision: 28,
    updatedAt: "2026-11-02T20:00:00.000Z",
    publishedAt: "2026-11-02T20:00:00.000Z"
  };

  return {
    ...demoSnapshot,
    revision: 28,
    serverTimeUtc: "2026-11-02T20:00:00.000Z",
    scheduleItems: [item],
    locations: [
      {
        id: item.locationId,
        eventId,
        name: item.locationName,
        description: "Primary stage.",
        mapX: 0.5,
        mapY: 0.35
      }
    ]
  };
}

function createMoveOperation(): EventChangeOperation {
  return {
    id: operationId,
    type: "UPDATE_EVENT_TIME",
    eventId,
    scheduleItemId,
    previousValue: {
      startUtc: "2026-11-02T23:00:00.000Z",
      endUtc: "2026-11-03T00:00:00.000Z"
    },
    proposedValue: {
      startUtc: "2026-11-03T00:00:00.000Z",
      endUtc: "2026-11-03T01:00:00.000Z"
    },
    reason: "Move the Wozniak panel from 3 PM to 4 PM."
  };
}

describe("live operations safety", () => {
  it("keeps Current-State AI read-only", () => {
    expect(stateAiCanMutate()).toBe(false);
  });

  it("prevents Operator AI from publishing without human confirmation", () => {
    const snapshot = createSnapshot();
    const proposal = operatorAiCreateProposal({
      eventId,
      commandText: "Move Steve Wozniak to 4 PM.",
      operations: [createMoveOperation()],
      createdByRole: "PUBLISHER",
      createdAt: "2026-11-02T20:01:00.000Z"
    });

    const result = publishProposal({
      snapshot,
      proposal,
      actorRole: "PUBLISHER",
      explicitlyConfirmed: false,
      publishedAtUtc: "2026-11-02T20:02:00.000Z"
    });

    expect(result.ok).toBe(false);
    expect(result.snapshot).toEqual(snapshot);
  });

  it("rejects malformed structured operations", () => {
    const snapshot = createSnapshot();
    const proposal = operatorAiCreateProposal({
      eventId,
      commandText: "Move Steve Wozniak to sometime later.",
      operations: [{ ...createMoveOperation(), proposedValue: { startUtc: "not-a-date", endUtc: "2026-11-03T01:00:00.000Z" } }],
      createdByRole: "EDITOR",
      createdAt: "2026-11-02T20:01:00.000Z"
    });

    const result = publishProposal({
      snapshot,
      proposal,
      actorRole: "PUBLISHER",
      explicitlyConfirmed: true,
      publishedAtUtc: "2026-11-02T20:02:00.000Z"
    });

    expect(result.ok).toBe(false);
    expect(result.snapshot.scheduleItems[0]?.startUtc).toBe("2026-11-02T23:00:00.000Z");
  });

  it("publishes a confirmed event-time change atomically and recalculates notifications", () => {
    const snapshot = createSnapshot();
    const proposal = operatorAiCreateProposal({
      eventId,
      commandText: "Move Steve Wozniak to 4 PM.",
      operations: [createMoveOperation()],
      createdByRole: "EDITOR",
      createdAt: "2026-11-02T20:01:00.000Z"
    });

    const result = publishProposal({
      snapshot,
      proposal,
      actorRole: "PUBLISHER",
      explicitlyConfirmed: true,
      publishedAtUtc: "2026-11-02T20:02:00.000Z"
    });

    expect(result.ok).toBe(true);

    if (!result.ok) {
      return;
    }

    expect(result.snapshot.revision).toBe(29);
    expect(result.snapshot.scheduleItems[0]?.startUtc).toBe("2026-11-03T00:00:00.000Z");
    expect(result.notificationImpact[0]?.replacementJobs[0]?.sendAfterUtc).toBe("2026-11-02T23:00:00.000Z");

    const timeline = getNowAndUpcoming({
      snapshot: result.snapshot,
      nowUtc: "2026-11-03T00:15:00.000Z",
      audienceGroups: ["all_attendees"]
    });

    expect(timeline.current[0]?.title).toBe("Steve Wozniak Panel");
    expect(result.revision.notificationJobsUpdated).toBe(2);
  });
});
