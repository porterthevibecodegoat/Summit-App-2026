import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchPublishedSnapshot } from ".";

const snapshot = {
  event: {
    id: "event",
    name: "Not Alone Summit",
    organizationName: "Inspiring Children Foundation",
    timeZone: "America/Los_Angeles",
    dateLabel: "November 2-4, 2026",
    venueName: "Wynn Las Vegas",
    city: "Las Vegas, Nevada",
    positioning: "A human development convening.",
    presentedBy: "Inspiring Children Foundation",
    poweredBy: "Inspiring Children Foundation",
    tracks: [],
    featuredPeople: [],
    demo: true
  },
  revision: 1,
  serverTimeUtc: "2026-09-07T18:00:00.000Z",
  scheduleItems: [],
  locations: [],
  contentPages: []
};

describe("fetchPublishedSnapshot", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("validates and returns a published snapshot", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => snapshot
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchPublishedSnapshot("https://staff.example.com");

    expect(result.revision).toBe(1);
    expect(fetchMock).toHaveBeenCalledWith("https://staff.example.com/api/snapshot", expect.objectContaining({ signal: expect.any(AbortSignal) }));
  });

  it("throws on non-ok responses", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 503 }));

    await expect(fetchPublishedSnapshot("https://staff.example.com")).rejects.toThrow("Unable to fetch published snapshot: 503");
  });
});
