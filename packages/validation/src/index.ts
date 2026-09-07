import { z } from "zod";

export const audienceScopeSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1)
});

export const scheduleStatusSchema = z.enum(["scheduled", "delayed", "moved", "canceled", "completed"]);

export const featuredPersonSchema = z.object({
  name: z.string().min(1),
  role: z.string().min(1),
  group: z.string().min(1)
});

export const scheduleItemSchema = z.object({
  id: z.string().uuid(),
  eventId: z.string().min(1),
  title: z.string().min(1),
  shortTitle: z.string().min(1),
  summary: z.string().min(1),
  description: z.string().min(1),
  startUtc: z.string().datetime(),
  endUtc: z.string().datetime(),
  eventTimeZone: z.string().min(1),
  dayOrder: z.number().int().nonnegative(),
  locationId: z.string().uuid(),
  locationName: z.string().min(1),
  speakerIds: z.array(z.string().uuid()),
  status: scheduleStatusSchema,
  visibilityScope: audienceScopeSchema,
  eligibilityScope: audienceScopeSchema,
  notificationScope: audienceScopeSchema,
  notificationOffsetsMinutes: z.array(z.number().int().positive()),
  featured: z.boolean(),
  published: z.boolean(),
  revision: z.number().int().positive(),
  updatedAt: z.string().datetime(),
  publishedAt: z.string().datetime().optional()
});

export const eventSnapshotSchema = z.object({
  event: z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    organizationName: z.string().min(1),
    timeZone: z.string().min(1),
    dateLabel: z.string().min(1),
    venueName: z.string().min(1),
    city: z.string().min(1),
    positioning: z.string().min(1),
    presentedBy: z.string().min(1),
    poweredBy: z.string().min(1),
    tracks: z.array(z.string().min(1)),
    featuredPeople: z.array(featuredPersonSchema),
    demo: z.boolean()
  }),
  revision: z.number().int().positive(),
  serverTimeUtc: z.string().datetime(),
  scheduleItems: z.array(scheduleItemSchema),
  locations: z.array(
    z.object({
      id: z.string().uuid(),
      eventId: z.string().min(1),
      name: z.string().min(1),
      description: z.string().min(1),
      mapX: z.number().min(0).max(1),
      mapY: z.number().min(0).max(1)
    })
  ),
  contentPages: z.array(
    z.object({
      id: z.string().uuid(),
      slug: z.string().min(1),
      title: z.string().min(1),
      body: z.string().min(1),
      published: z.boolean(),
      revision: z.number().int().positive()
    })
  )
});

export const staffRoleSchema = z.enum(["VIEWER", "EDITOR", "PUBLISHER", "ADMIN"]);

export const staffPermissionSchema = z.enum([
  "READ_STATE",
  "CREATE_DRAFT",
  "CREATE_AI_PROPOSAL",
  "IMPORT_DOCUMENT",
  "PUBLISH_REVISION",
  "SEND_NOTIFICATION",
  "SEND_EMERGENCY_ALERT",
  "MANAGE_SETTINGS"
]);

export const aiSystemSchema = z.enum(["CURRENT_STATE_AI", "EVENT_OPERATOR_AI", "IMPORT_AI"]);

export const changeSourceSchema = z.enum(["MANUAL_EDITOR", "OPERATOR_AI", "DOCUMENT_IMPORT", "EMERGENCY_ALERT", "SYSTEM"]);

export const eventOperationTypeSchema = z.enum([
  "UPDATE_EVENT_TIME",
  "UPDATE_EVENT_LOCATION",
  "REPLACE_SPEAKER",
  "REPLACE_PERFORMER",
  "CREATE_EVENT",
  "CANCEL_EVENT",
  "UPDATE_RESTRICTION",
  "UPDATE_DESCRIPTION",
  "CREATE_NOTIFICATION",
  "CREATE_EMERGENCY_ALERT"
]);

export const validationSeveritySchema = z.enum(["BLOCKING_ERROR", "WARNING", "INFORMATION"]);

export const eventChangeOperationSchema = z.object({
  id: z.string().uuid(),
  type: eventOperationTypeSchema,
  eventId: z.string().min(1),
  scheduleItemId: z.string().uuid().optional(),
  field: z.string().min(1).optional(),
  previousValue: z.unknown().optional(),
  proposedValue: z.unknown().optional(),
  reason: z.string().min(1).optional()
});

export const validationMessageSchema = z.object({
  severity: validationSeveritySchema,
  code: z.string().min(1),
  message: z.string().min(1),
  operationId: z.string().uuid().optional()
});

export const notificationImpactSchema = z.object({
  scheduleItemId: z.string().uuid().optional(),
  obsoleteJobIds: z.array(z.string().uuid()),
  replacementJobs: z.array(
    z.object({
      idempotencyKey: z.string().min(1),
      audienceScope: audienceScopeSchema,
      sendAfterUtc: z.string().datetime(),
      reason: z.string().min(1)
    })
  ),
  immediateAlertPreview: z
    .object({
      title: z.string().min(1),
      body: z.string().min(1),
      audienceScope: audienceScopeSchema
    })
    .optional()
});

export const changeProposalSchema = z.object({
  id: z.string().uuid(),
  eventId: z.string().min(1),
  source: changeSourceSchema,
  aiSystem: aiSystemSchema.optional(),
  commandText: z.string().min(1).optional(),
  operations: z.array(eventChangeOperationSchema),
  validationMessages: z.array(validationMessageSchema),
  notificationImpact: z.array(notificationImpactSchema),
  status: z.enum(["DRAFT", "NEEDS_REVIEW", "VALIDATED", "REJECTED", "PUBLISHED"]),
  requiresHumanApproval: z.literal(true),
  createdByRole: staffRoleSchema,
  createdAt: z.string().datetime()
});

export const documentImportJobSchema = z.object({
  id: z.string().uuid(),
  eventId: z.string().min(1),
  fileName: z.string().min(1),
  fileType: z.enum(["PDF", "DOCX", "XLSX", "CSV", "TXT", "IMAGE", "UNKNOWN"]),
  status: z.enum(["UPLOADED", "READING", "EXTRACTING", "READY_FOR_REVIEW", "FAILED", "PUBLISHED"]),
  detectedEventCount: z.number().int().nonnegative(),
  addedCount: z.number().int().nonnegative(),
  modifiedCount: z.number().int().nonnegative(),
  removedCount: z.number().int().nonnegative(),
  requiresReviewCount: z.number().int().nonnegative(),
  createdAt: z.string().datetime()
});

export const publicationRevisionSchema = z.object({
  id: z.string().uuid(),
  eventId: z.string().min(1),
  revision: z.number().int().positive(),
  previousRevision: z.number().int().positive().optional(),
  rollbackOfRevision: z.number().int().positive().optional(),
  source: changeSourceSchema,
  changesCount: z.number().int().nonnegative(),
  notificationJobsUpdated: z.number().int().nonnegative(),
  publishedByRole: staffRoleSchema,
  publishedAt: z.string().datetime(),
  snapshot: eventSnapshotSchema
});

export const auditLogEntrySchema = z.object({
  id: z.string().uuid(),
  eventId: z.string().min(1),
  actorId: z.string().uuid().optional(),
  actorRole: staffRoleSchema,
  source: changeSourceSchema,
  action: z.string().min(1),
  previousValue: z.unknown().optional(),
  newValue: z.unknown().optional(),
  proposalId: z.string().uuid().optional(),
  documentImportId: z.string().uuid().optional(),
  publicationRevision: z.number().int().positive().optional(),
  notificationConsequences: z.array(notificationImpactSchema),
  createdAt: z.string().datetime()
});

export const attendeeDeviceRegistrationSchema = z.object({
  id: z.string().uuid(),
  eventId: z.string().min(1),
  attendeeId: z.string().uuid().optional(),
  expoPushToken: z.string().min(1),
  audienceGroups: z.array(z.string().min(1)),
  platform: z.enum(["ios", "android"]),
  appVersion: z.string().min(1),
  lastSeenAt: z.string().datetime()
});

export const attendeeSyncStateSchema = z.object({
  eventId: z.string().min(1),
  localRevision: z.number().int().positive(),
  latestPublishedRevision: z.number().int().positive(),
  lastSuccessfulSyncAt: z.string().datetime().optional(),
  stale: z.boolean()
});

export type ScheduleItem = z.infer<typeof scheduleItemSchema>;
export type FeaturedPerson = z.infer<typeof featuredPersonSchema>;
export type EventSnapshot = z.infer<typeof eventSnapshotSchema>;
export type StaffRole = z.infer<typeof staffRoleSchema>;
export type StaffPermission = z.infer<typeof staffPermissionSchema>;
export type AiSystem = z.infer<typeof aiSystemSchema>;
export type ChangeSource = z.infer<typeof changeSourceSchema>;
export type EventOperationType = z.infer<typeof eventOperationTypeSchema>;
export type EventChangeOperation = z.infer<typeof eventChangeOperationSchema>;
export type ValidationMessage = z.infer<typeof validationMessageSchema>;
export type NotificationImpact = z.infer<typeof notificationImpactSchema>;
export type ChangeProposal = z.infer<typeof changeProposalSchema>;
export type DocumentImportJob = z.infer<typeof documentImportJobSchema>;
export type PublicationRevision = z.infer<typeof publicationRevisionSchema>;
export type AuditLogEntry = z.infer<typeof auditLogEntrySchema>;
export type AttendeeDeviceRegistration = z.infer<typeof attendeeDeviceRegistrationSchema>;
export type AttendeeSyncState = z.infer<typeof attendeeSyncStateSchema>;
