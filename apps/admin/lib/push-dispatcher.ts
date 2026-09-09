import { publicAppConfig } from "@not-alone/config";
import type { EventSnapshot } from "@not-alone/validation";

type ClaimedJob = {
  id: string;
  schedule_item_id: string | null;
  schedule_revision: number | null;
  audience_scope: string;
  send_after_utc: string;
  attempt_count: number;
  payload: Record<string, unknown> | null;
};

type DeviceRegistration = {
  id: string;
  expo_push_token: string;
  audience_groups: string[];
};

type ExistingAttempt = {
  notification_job_id: string;
  device_registration_id: string;
  status: "accepted" | "delivered" | "failed";
};

type DeliveryTarget = {
  job: ClaimedJob;
  device: DeviceRegistration;
  message: ExpoPushMessage;
};

type ExpoPushMessage = {
  to: string;
  title: string;
  body: string;
  sound: "default";
  priority: "high" | "default";
  data: Record<string, string | number>;
};

type ExpoPushTicket = {
  status: "ok" | "error";
  id?: string;
  message?: string;
  details?: { error?: string };
};

type PendingReceiptAttempt = {
  id: string;
  notification_job_id: string;
  device_registration_id: string;
  expo_ticket_id: string;
};

export type PushDispatchSummary = {
  claimedJobs: number;
  targetedDevices: number;
  acceptedDeliveries: number;
  failedDeliveries: number;
  completedJobs: number;
  failedJobs: number;
};

const EXPO_PUSH_ENDPOINT = "https://exp.host/--/api/v2/push/send";
const EXPO_RECEIPTS_ENDPOINT = "https://exp.host/--/api/v2/push/getReceipts";
const MAX_EXPO_BATCH = 100;

export async function dispatchDuePushNotifications(snapshot: EventSnapshot): Promise<PushDispatchSummary> {
  const nowUtc = new Date().toISOString();
  const jobs = await backendFetch<ClaimedJob[]>("/rest/v1/rpc/claim_due_notification_jobs", {
    method: "POST",
    body: {
      p_event_id: publicAppConfig.eventId,
      p_now: nowUtc,
      p_limit: 50
    },
    expectedStatus: 200
  });

  const summary: PushDispatchSummary = {
    claimedJobs: jobs.length,
    targetedDevices: 0,
    acceptedDeliveries: 0,
    failedDeliveries: 0,
    completedJobs: 0,
    failedJobs: 0
  };
  if (jobs.length === 0) return summary;

  const devices = await backendFetch<DeviceRegistration[]>(
    `/rest/v1/attendee_device_registrations?event_id=eq.${encodeURIComponent(publicAppConfig.eventId)}&disabled_at=is.null&select=id,expo_push_token,audience_groups`,
    { expectedStatus: 200 }
  );
  const existingAttempts = await loadExistingAttempts(jobs);
  const existingSuccessfulTargets = new Set(
    existingAttempts
      .filter((attempt) => attempt.status === "accepted" || attempt.status === "delivered")
      .map((attempt) => `${attempt.notification_job_id}:${attempt.device_registration_id}`)
  );
  const scheduleItems = new Map(snapshot.scheduleItems.map((item) => [item.id, item]));
  const targets: DeliveryTarget[] = [];

  for (const job of jobs) {
    const scheduleItemId = getScheduleItemId(job);
    const item = scheduleItemId ? scheduleItems.get(scheduleItemId) : undefined;
    if (!item) continue;

    for (const device of devices) {
      if (!deviceMatchesAudience(device, job.audience_scope)) continue;
      if (existingSuccessfulTargets.has(`${job.id}:${device.id}`)) continue;
      targets.push({
        job,
        device,
        message: createExpoPushMessage({
          token: device.expo_push_token,
          item: {
            id: item.id,
            title: item.title,
            locationName: item.locationName,
            startUtc: item.startUtc,
            eventTimeZone: item.eventTimeZone
          },
          revision: job.schedule_revision ?? snapshot.revision
        })
      });
    }
  }

  summary.targetedDevices = targets.length;
  const deliveryRows: Array<Record<string, unknown>> = [];
  const jobResults = new Map<string, { accepted: number; failed: number; errorMessages: string[] }>();

  for (const job of jobs) {
    jobResults.set(job.id, { accepted: 0, failed: 0, errorMessages: [] });
  }

  for (const batch of chunk(targets, MAX_EXPO_BATCH)) {
    const tickets = await sendExpoBatch(batch.map((target) => target.message));
    batch.forEach((target, index) => {
      const ticket: ExpoPushTicket = tickets[index] ?? { status: "error", message: "Expo returned no ticket." };
      const accepted = ticket.status === "ok" && Boolean(ticket.id);
      const result = jobResults.get(target.job.id)!;
      if (accepted) {
        result.accepted += 1;
        summary.acceptedDeliveries += 1;
      } else {
        result.failed += 1;
        summary.failedDeliveries += 1;
        result.errorMessages.push(ticket.message ?? ticket.details?.error ?? "Push delivery was rejected.");
      }

      deliveryRows.push({
        event_id: publicAppConfig.eventId,
        notification_job_id: target.job.id,
        device_registration_id: target.device.id,
        attempt_number: target.job.attempt_count,
        status: accepted ? "accepted" : "failed",
        expo_ticket_id: accepted ? ticket.id : null,
        error_code: accepted ? null : ticket.details?.error ?? "EXPO_PUSH_REJECTED",
        error_message: accepted ? null : ticket.message ?? "Push delivery was rejected.",
        accepted_at: accepted ? nowUtc : null,
        delivered_at: null,
        updated_at: nowUtc
      });
    });
  }

  if (deliveryRows.length > 0) {
    await backendFetch("/rest/v1/notification_delivery_attempts", {
      method: "POST",
      body: deliveryRows,
      expectedStatus: 201,
      prefer: "resolution=merge-duplicates,return=minimal"
    });
  }

  await Promise.all(jobs.map(async (job) => {
    const result = jobResults.get(job.id)!;
    const eligibleTargets = targets.filter((target) => target.job.id === job.id).length;
    const priorAccepted = existingAttempts.filter(
      (attempt) => attempt.notification_job_id === job.id &&
        (attempt.status === "accepted" || attempt.status === "delivered")
    ).length;
    const success = result.failed === 0 && result.accepted + priorAccepted > 0;
    const error = success
      ? null
      : result.errorMessages[0] ?? (eligibleTargets === 0 ? "No eligible registered attendee devices." : "Push delivery failed.");

    await backendFetch(`/rest/v1/notification_jobs?id=eq.${encodeURIComponent(job.id)}`, {
      method: "PATCH",
      body: {
        status: success ? "accepted" : "failed",
        last_error: error,
        delivered_at: null,
        updated_at: nowUtc
      },
      expectedStatus: 204
    });
    if (success) summary.completedJobs += 1;
    else summary.failedJobs += 1;
  }));

  return summary;
}

export async function checkExpoPushReceipts() {
  const attempts = await backendFetch<PendingReceiptAttempt[]>(
    `/rest/v1/notification_delivery_attempts?event_id=eq.${encodeURIComponent(publicAppConfig.eventId)}` +
      "&status=eq.accepted&expo_ticket_id=not.is.null&select=id,notification_job_id,device_registration_id,expo_ticket_id&limit=1000",
    { expectedStatus: 200 }
  );
  if (attempts.length === 0) {
    return { checked: 0, delivered: 0, failed: 0, disabledDevices: 0 };
  }

  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json"
  };
  if (process.env.EXPO_ACCESS_TOKEN) headers.Authorization = `Bearer ${process.env.EXPO_ACCESS_TOKEN}`;
  const response = await fetch(EXPO_RECEIPTS_ENDPOINT, {
    method: "POST",
    headers,
    body: JSON.stringify({ ids: attempts.map((attempt) => attempt.expo_ticket_id) }),
    cache: "no-store"
  });
  if (!response.ok) {
    throw new Error(`Expo receipt service returned ${response.status}.`);
  }

  const payload = (await response.json()) as {
    data?: Record<string, ExpoPushTicket>;
  };
  const receipts = payload.data ?? {};
  const nowUtc = new Date().toISOString();
  let delivered = 0;
  let failed = 0;
  let disabledDevices = 0;
  const affectedJobIds = new Set<string>();

  await Promise.all(attempts.map(async (attempt) => {
    const receipt = receipts[attempt.expo_ticket_id];
    if (!receipt) return;
    affectedJobIds.add(attempt.notification_job_id);
    const succeeded = receipt.status === "ok";
    if (succeeded) delivered += 1;
    else failed += 1;

    await backendFetch(`/rest/v1/notification_delivery_attempts?id=eq.${encodeURIComponent(attempt.id)}`, {
      method: "PATCH",
      body: {
        status: succeeded ? "delivered" : "failed",
        error_code: succeeded ? null : receipt.details?.error ?? "EXPO_RECEIPT_ERROR",
        error_message: succeeded ? null : receipt.message ?? "Expo reported a delivery failure.",
        delivered_at: succeeded ? nowUtc : null,
        updated_at: nowUtc
      },
      expectedStatus: 204
    });

    if (!succeeded && receipt.details?.error === "DeviceNotRegistered") {
      await backendFetch(
        `/rest/v1/attendee_device_registrations?id=eq.${encodeURIComponent(attempt.device_registration_id)}`,
        {
          method: "PATCH",
          body: { disabled_at: nowUtc, last_seen_at: nowUtc },
          expectedStatus: 204
        }
      );
      disabledDevices += 1;
    }
  }));

  await Promise.all([...affectedJobIds].map(async (jobId) => {
    const jobAttempts = await backendFetch<Array<{ status: "accepted" | "delivered" | "failed"; error_message: string | null }>>(
      `/rest/v1/notification_delivery_attempts?notification_job_id=eq.${encodeURIComponent(jobId)}&select=status,error_message`,
      { expectedStatus: 200 }
    );
    const allDelivered = jobAttempts.length > 0 && jobAttempts.every((attempt) => attempt.status === "delivered");
    const firstFailure = jobAttempts.find((attempt) => attempt.status === "failed");
    await backendFetch(`/rest/v1/notification_jobs?id=eq.${encodeURIComponent(jobId)}`, {
      method: "PATCH",
      body: {
        status: firstFailure ? "failed" : "accepted",
        last_error: firstFailure?.error_message ?? null,
        delivered_at: allDelivered ? nowUtc : null,
        updated_at: nowUtc
      },
      expectedStatus: 204
    });
  }));

  return { checked: attempts.length, delivered, failed, disabledDevices };
}

export function isExpoPushToken(value: string) {
  return /^(ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]+\]$/.test(value);
}

export function deviceMatchesAudience(device: DeviceRegistration, audienceScope: string) {
  const normalizedScope = audienceScope.trim().toLowerCase();
  return normalizedScope === "public" || normalizedScope === "all_attendees" ||
    device.audience_groups.some((group) => group.trim().toLowerCase() === normalizedScope);
}

function getScheduleItemId(job: ClaimedJob) {
  if (job.schedule_item_id) return job.schedule_item_id;
  return typeof job.payload?.scheduleItemId === "string" ? job.payload.scheduleItemId : null;
}

function createExpoPushMessage({
  token,
  item,
  revision
}: {
  token: string;
  item: { id: string; title: string; locationName: string; startUtc: string; eventTimeZone: string };
  revision: number;
}): ExpoPushMessage {
  const time = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: item.eventTimeZone
  }).format(new Date(item.startUtc));
  return {
    to: token,
    title: `${item.title} is coming up`,
    body: `${time} at ${item.locationName}`,
    sound: "default",
    priority: "high",
    data: {
      eventId: publicAppConfig.eventId,
      scheduleItemId: item.id,
      revision
    }
  };
}

async function sendExpoBatch(messages: ExpoPushMessage[]) {
  if (messages.length === 0) return [];
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Accept-Encoding": "gzip, deflate",
    "Content-Type": "application/json"
  };
  if (process.env.EXPO_ACCESS_TOKEN) {
    headers.Authorization = `Bearer ${process.env.EXPO_ACCESS_TOKEN}`;
  }

  const response = await fetch(EXPO_PUSH_ENDPOINT, {
    method: "POST",
    headers,
    body: JSON.stringify(messages),
    cache: "no-store"
  });
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 240);
    return messages.map(() => ({
      status: "error" as const,
      message: `Expo push service returned ${response.status}${detail ? `: ${detail}` : "."}`
    }));
  }

  const result = (await response.json()) as { data?: ExpoPushTicket[] };
  return Array.isArray(result.data) ? result.data : [];
}

async function loadExistingAttempts(jobs: ClaimedJob[]) {
  const ids = jobs.map((job) => job.id).join(",");
  return backendFetch<ExistingAttempt[]>(
    `/rest/v1/notification_delivery_attempts?notification_job_id=in.(${ids})&select=notification_job_id,device_registration_id,status`,
    { expectedStatus: 200 }
  );
}

function chunk<T>(values: T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
}

async function backendFetch<T>(
  path: string,
  options: {
    method?: "GET" | "POST" | "PATCH";
    body?: unknown;
    expectedStatus: number;
    prefer?: string;
  }
): Promise<T> {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase server configuration is required for push dispatch.");
  }

  const headers: Record<string, string> = {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    "Content-Type": "application/json"
  };
  if (options.prefer) headers.Prefer = options.prefer;

  const requestInit: RequestInit = {
    method: options.method ?? "GET",
    headers,
    cache: "no-store"
  };
  if (options.body !== undefined) requestInit.body = JSON.stringify(options.body);

  const response = await fetch(`${supabaseUrl}${path}`, requestInit);
  if (response.status !== options.expectedStatus) {
    throw new Error(`Push backend request failed with status ${response.status}.`);
  }
  if (response.status === 204) return undefined as T;
  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}
