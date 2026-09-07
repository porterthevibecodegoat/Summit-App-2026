import { DateTime } from "luxon";
import {
  changeProposalSchema,
  eventSnapshotSchema,
  type ChangeProposal,
  type EventChangeOperation,
  type EventSnapshot,
  type NotificationImpact,
  type PublicationRevision,
  type ScheduleItem,
  type StaffRole,
  type ValidationMessage
} from "@not-alone/validation";

export type PublishAttemptInput = {
  snapshot: EventSnapshot;
  proposal: ChangeProposal;
  actorRole: StaffRole;
  explicitlyConfirmed: boolean;
  publishedAtUtc: string;
};

export type PublishAttemptResult =
  | {
      ok: true;
      revision: PublicationRevision;
      snapshot: EventSnapshot;
      notificationImpact: NotificationImpact[];
    }
  | {
      ok: false;
      errors: ValidationMessage[];
      snapshot: EventSnapshot;
    };

export function stateAiCanMutate(): false {
  return false;
}

export function operatorAiCreateProposal(input: {
  proposalId?: string;
  eventId: string;
  commandText: string;
  operations: EventChangeOperation[];
  createdByRole: StaffRole;
  createdAt: string;
}): ChangeProposal {
  return changeProposalSchema.parse({
    id: input.proposalId ?? "7c542bd8-31e1-4c67-95af-42f01e10b90a",
    eventId: input.eventId,
    source: "OPERATOR_AI",
    aiSystem: "EVENT_OPERATOR_AI",
    commandText: input.commandText,
    operations: input.operations,
    validationMessages: [],
    notificationImpact: [],
    status: "DRAFT",
    requiresHumanApproval: true,
    createdByRole: input.createdByRole,
    createdAt: input.createdAt
  });
}

export function publishProposal(input: PublishAttemptInput): PublishAttemptResult {
  const permissionErrors = getPublishPermissionErrors(input);
  if (permissionErrors.length > 0) {
    return { ok: false, errors: permissionErrors, snapshot: input.snapshot };
  }

  const operationErrors = validateOperations(input.snapshot, input.proposal.operations);
  if (operationErrors.some((error) => error.severity === "BLOCKING_ERROR")) {
    return { ok: false, errors: operationErrors, snapshot: input.snapshot };
  }

  const nextSnapshot = applyOperations(input.snapshot, input.proposal.operations, input.publishedAtUtc);
  const notificationImpact = reconcileNotificationImpact(input.snapshot, nextSnapshot, input.proposal.operations);
  const nextRevisionNumber = input.snapshot.revision + 1;
  const revision: PublicationRevision = {
    id: "b14b437b-f72d-4419-8489-67a57d82870c",
    eventId: input.snapshot.event.id,
    revision: nextRevisionNumber,
    previousRevision: input.snapshot.revision,
    source: input.proposal.source,
    changesCount: input.proposal.operations.length,
    notificationJobsUpdated: notificationImpact.reduce(
      (total, impact) => total + impact.obsoleteJobIds.length + impact.replacementJobs.length,
      0
    ),
    publishedByRole: input.actorRole,
    publishedAt: input.publishedAtUtc,
    snapshot: nextSnapshot
  };

  return { ok: true, revision, snapshot: nextSnapshot, notificationImpact };
}

export function getPublishPermissionErrors(input: PublishAttemptInput): ValidationMessage[] {
  const errors: ValidationMessage[] = [];

  if (!input.explicitlyConfirmed) {
    errors.push({
      severity: "BLOCKING_ERROR",
      code: "HUMAN_CONFIRMATION_REQUIRED",
      message: "Official changes require explicit human publication confirmation."
    });
  }

  if (input.actorRole !== "PUBLISHER" && input.actorRole !== "ADMIN") {
    errors.push({
      severity: "BLOCKING_ERROR",
      code: "PUBLISH_PERMISSION_REQUIRED",
      message: "Only Publisher and Admin staff roles can publish attendee-facing changes."
    });
  }

  if (input.proposal.aiSystem === "CURRENT_STATE_AI") {
    errors.push({
      severity: "BLOCKING_ERROR",
      code: "STATE_AI_IS_READ_ONLY",
      message: "Current-State AI is read-only and cannot publish changes."
    });
  }

  if (!input.proposal.requiresHumanApproval) {
    errors.push({
      severity: "BLOCKING_ERROR",
      code: "PROPOSAL_APPROVAL_FLAG_REQUIRED",
      message: "Change proposals must preserve the human-approval requirement."
    });
  }

  return errors;
}

export function validateOperations(snapshot: EventSnapshot, operations: EventChangeOperation[]): ValidationMessage[] {
  return operations.flatMap((operation) => validateOperation(snapshot, operation));
}

export function reconcileNotificationImpact(
  previousSnapshot: EventSnapshot,
  nextSnapshot: EventSnapshot,
  operations: EventChangeOperation[]
): NotificationImpact[] {
  return operations.flatMap((operation) => {
    if (operation.type !== "UPDATE_EVENT_TIME" || !operation.scheduleItemId) {
      return [];
    }

    const previousItem = previousSnapshot.scheduleItems.find((item) => item.id === operation.scheduleItemId);
    const nextItem = nextSnapshot.scheduleItems.find((item) => item.id === operation.scheduleItemId);

    if (!previousItem || !nextItem) {
      return [];
    }

    return [
      {
        scheduleItemId: nextItem.id,
        obsoleteJobIds: previousItem.notificationOffsetsMinutes.map((offset) =>
          createNotificationId(previousItem.id, previousItem.revision, offset)
        ),
        replacementJobs: nextItem.notificationOffsetsMinutes.map((offset) => ({
          idempotencyKey: createNotificationId(nextItem.id, nextItem.revision, offset),
          audienceScope: nextItem.notificationScope,
          sendAfterUtc: DateTime.fromISO(nextItem.startUtc, { zone: "utc" }).minus({ minutes: offset }).toISO() ?? nextItem.startUtc,
          reason: `${offset}-minute reminder recalculated from updated event time.`
        }))
      }
    ];
  });
}

function validateOperation(snapshot: EventSnapshot, operation: EventChangeOperation): ValidationMessage[] {
  if (operation.type === "UPDATE_EVENT_TIME") {
    const item = findItem(snapshot, operation);
    if (!item) {
      return [
        {
          severity: "BLOCKING_ERROR",
          code: "SCHEDULE_ITEM_NOT_FOUND",
          message: "The requested schedule item does not exist.",
          operationId: operation.id
        }
      ];
    }

    const proposed = parseTimeChange(operation.proposedValue);
    if (!proposed) {
      return [
        {
          severity: "BLOCKING_ERROR",
          code: "MALFORMED_TIME_CHANGE",
          message: "Time changes must include valid UTC start and end timestamps.",
          operationId: operation.id
        }
      ];
    }

    if (DateTime.fromISO(proposed.endUtc) <= DateTime.fromISO(proposed.startUtc)) {
      return [
        {
          severity: "BLOCKING_ERROR",
          code: "END_BEFORE_START",
          message: "The proposed end time must be after the start time.",
          operationId: operation.id
        }
      ];
    }
  }

  return [];
}

function applyOperations(snapshot: EventSnapshot, operations: EventChangeOperation[], nowUtc: string): EventSnapshot {
  const scheduleItems = snapshot.scheduleItems.map((item) =>
    operations.reduce<ScheduleItem>((draft, operation) => applyOperationToItem(draft, operation, nowUtc), item)
  );

  return eventSnapshotSchema.parse({
    ...snapshot,
    revision: snapshot.revision + 1,
    serverTimeUtc: nowUtc,
    scheduleItems
  });
}

function applyOperationToItem(item: ScheduleItem, operation: EventChangeOperation, nowUtc: string): ScheduleItem {
  if (operation.scheduleItemId !== item.id) {
    return item;
  }

  if (operation.type === "UPDATE_EVENT_TIME") {
    const proposed = parseTimeChange(operation.proposedValue);
    if (!proposed) {
      return item;
    }

    return {
      ...item,
      startUtc: proposed.startUtc,
      endUtc: proposed.endUtc,
      revision: item.revision + 1,
      updatedAt: nowUtc,
      publishedAt: nowUtc
    };
  }

  if (operation.type === "REPLACE_SPEAKER" || operation.type === "REPLACE_PERFORMER") {
    return {
      ...item,
      speakerIds: parseStringArray(operation.proposedValue),
      revision: item.revision + 1,
      updatedAt: nowUtc,
      publishedAt: nowUtc
    };
  }

  if (operation.type === "UPDATE_EVENT_LOCATION") {
    const proposed = parseLocationChange(operation.proposedValue);
    if (!proposed) {
      return item;
    }

    return {
      ...item,
      locationId: proposed.locationId,
      locationName: proposed.locationName,
      revision: item.revision + 1,
      updatedAt: nowUtc,
      publishedAt: nowUtc
    };
  }

  if (operation.type === "UPDATE_DESCRIPTION") {
    return {
      ...item,
      description: String(operation.proposedValue ?? item.description),
      revision: item.revision + 1,
      updatedAt: nowUtc,
      publishedAt: nowUtc
    };
  }

  if (operation.type === "CANCEL_EVENT") {
    return {
      ...item,
      status: "canceled",
      revision: item.revision + 1,
      updatedAt: nowUtc,
      publishedAt: nowUtc
    };
  }

  return item;
}

function findItem(snapshot: EventSnapshot, operation: EventChangeOperation) {
  return snapshot.scheduleItems.find((item) => item.id === operation.scheduleItemId);
}

function parseTimeChange(value: unknown) {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as { startUtc?: unknown; endUtc?: unknown };
  if (typeof candidate.startUtc !== "string" || typeof candidate.endUtc !== "string") {
    return null;
  }

  if (!DateTime.fromISO(candidate.startUtc, { zone: "utc" }).isValid || !DateTime.fromISO(candidate.endUtc, { zone: "utc" }).isValid) {
    return null;
  }

  return { startUtc: candidate.startUtc, endUtc: candidate.endUtc };
}

function parseLocationChange(value: unknown) {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as { locationId?: unknown; locationName?: unknown };
  if (typeof candidate.locationId !== "string" || typeof candidate.locationName !== "string") {
    return null;
  }

  return { locationId: candidate.locationId, locationName: candidate.locationName };
}

function parseStringArray(value: unknown): string[] {
  if (Array.isArray(value) && value.every((item) => typeof item === "string")) {
    return value;
  }

  return [];
}

function createNotificationId(scheduleItemId: string, revision: number, offsetMinutes: number) {
  return `${scheduleItemId}:r${revision}:offset-${offsetMinutes}`;
}
