import { eventSnapshotSchema, type EventSnapshot } from "@not-alone/validation";

export async function fetchPublishedSnapshot(apiBaseUrl: string, options: { timeoutMs?: number } = {}): Promise<EventSnapshot> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 8000);
  const normalizedBaseUrl = apiBaseUrl.replace(/\/+$/, "");

  try {
    const response = await fetch(`${normalizedBaseUrl}/api/snapshot`, {
      cache: "no-store",
      headers: { "Cache-Control": "no-cache" },
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`Unable to fetch published snapshot: ${response.status}`);
    }

    return eventSnapshotSchema.parse(await response.json());
  } finally {
    clearTimeout(timeout);
  }
}
