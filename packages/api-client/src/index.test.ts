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
    expect(fetchMock).toHaveBeenCalledWith("https://staff.example.com/api/snapshot", expect.objectContaining({
      cache: "no-store",
      headers: { "Cache-Control": "no-cache" },
      signal: expect.any(AbortSignal)
    }));
  });

  it("retrieves a newly published revision on the next refresh", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => snapshot })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ...snapshot, revision: 2 }) });
    vi.stubGlobal("fetch", fetchMock);

    const first = await fetchPublishedSnapshot("https://staff.example.com");
    const refreshed = await fetchPublishedSnapshot("https://staff.example.com");

    expect(first.revision).toBe(1);
    expect(refreshed.revision).toBe(2);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("normalizes a trailing slash in the configured API URL", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => snapshot });
    vi.stubGlobal("fetch", fetchMock);

    await fetchPublishedSnapshot("https://staff.example.com///");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://staff.example.com/api/snapshot",
      expect.any(Object)
    );
  });

  it("throws on non-ok responses", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 503 }));

    await expect(fetchPublishedSnapshot("https://staff.example.com")).rejects.toThrow("Unable to fetch published snapshot: 503");
  });
});
