import { z } from "zod";

export const environmentNameSchema = z.enum(["local", "development", "staging", "production"]);

export const publicAppConfigSchema = z.object({
  appName: z.string().min(1),
  appSlug: z.string().min(1),
  organizationName: z.string().min(1),
  eventId: z.string().min(1),
  eventTimeZone: z.string().min(1),
  environmentName: environmentNameSchema,
  apiBaseUrl: z.string().url(),
  iosBundleIdentifier: z.string().min(1),
  featureFlags: z.object({
    attendeeAccess: z.boolean(),
    ai: z.boolean(),
    pushDelivery: z.boolean()
  })
});

const runtimeProcess = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process;
const env = runtimeProcess?.env ?? {};

export const publicAppConfig = publicAppConfigSchema.parse({
  appName: env.EVENT_NAME ?? "Not Alone Summit",
  appSlug: "not-alone-summit",
  organizationName: env.ORGANIZATION_NAME ?? "Inspiring Children Foundation",
  eventId: env.EVENT_ID ?? "not-alone-summit-2026-prototype",
  eventTimeZone: env.EVENT_TIME_ZONE ?? "America/Los_Angeles",
  environmentName: env.APP_ENV ?? env.EXPO_PUBLIC_APP_ENV ?? "local",
  apiBaseUrl: env.EXPO_PUBLIC_API_BASE_URL ?? "https://summit-app-2026-admin.vercel.app",
  iosBundleIdentifier: env.IOS_BUNDLE_IDENTIFIER ?? "org.inspiringchildren.notalonesummit",
  featureFlags: {
    attendeeAccess: env.ENABLE_ATTENDEE_ACCESS === "true",
    ai: env.ENABLE_AI === "true",
    pushDelivery: env.EXPO_PUBLIC_ENABLE_PUSH_DELIVERY === "true" || env.ENABLE_PUSH_DELIVERY === "true"
  }
});
