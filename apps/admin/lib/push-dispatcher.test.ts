import { describe, expect, it } from "vitest";
import { deviceMatchesAudience, isExpoPushToken } from "./push-dispatcher";

const device = {
  id: "8ce3893d-1609-46f1-9d58-5585a1ef27c4",
  expo_push_token: "ExponentPushToken[valid_device-token]",
  audience_groups: ["public", "founders"]
};

describe("push dispatcher targeting", () => {
  it("accepts Expo push tokens and rejects raw or malformed values", () => {
    expect(isExpoPushToken("ExponentPushToken[valid_device-token]")).toBe(true);
    expect(isExpoPushToken("ExpoPushToken[another_token]")).toBe(true);
    expect(isExpoPushToken("secret-device-token")).toBe(false);
  });

  it("sends public jobs to every registered device and scopes private audiences", () => {
    expect(deviceMatchesAudience(device, "public")).toBe(true);
    expect(deviceMatchesAudience(device, "founders")).toBe(true);
    expect(deviceMatchesAudience(device, "vip")).toBe(false);
  });
});
