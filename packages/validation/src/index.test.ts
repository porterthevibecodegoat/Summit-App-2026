import { describe, expect, it } from "vitest";
import { attendeeDeviceRegistrationSchema } from "./index";

const baseRegistration = {
  id: "7f34e3c5-f5bc-49cc-acf5-b4335691625b",
  eventId: "not-alone-summit-2026-prototype",
  audienceGroups: ["public"],
  platform: "ios" as const,
  appVersion: "0.1.0",
  lastSeenAt: "2026-09-09T16:00:00.000Z"
};

describe("attendee device registration", () => {
  it("accepts an Expo push token", () => {
    const result = attendeeDeviceRegistrationSchema.safeParse({
      ...baseRegistration,
      expoPushToken: "ExponentPushToken[device_token-123]"
    });
    expect(result.success).toBe(true);
  });

  it("rejects arbitrary strings before they reach the push backend", () => {
    const result = attendeeDeviceRegistrationSchema.safeParse({
      ...baseRegistration,
      expoPushToken: "not-a-push-token"
    });
    expect(result.success).toBe(false);
  });
});
