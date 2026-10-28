import { describe, expect, it } from "vitest";
import { sameWebsiteOrigin } from "./request-origin";

describe("booking request origin", () => {
  it("accepts the public incoming host when a hosting proxy uses an internal URL", () => {
    expect(sameWebsiteOrigin(new Request("http://internal-function/api/wellness/manage", { headers: { host: "notalonesummit.org", origin: "https://notalonesummit.org" } }))).toBe(true);
    expect(sameWebsiteOrigin(new Request("http://localhost:3108/api/wellness/manage", { headers: { host: "127.0.0.1:3108", origin: "http://127.0.0.1:3108" } }))).toBe(true);
  });
  it("rejects foreign, forwarded, malformed and insecure non-local origins", () => {
    for (const origin of [undefined, "null", "https://evil.test", "https://notalonesummit.org/", "http://notalonesummit.org", "https://notalonesummit.org:8443", "https://user:password@notalonesummit.org"]) {
      expect(sameWebsiteOrigin(new Request("https://notalonesummit.org/api/wellness/manage", { headers: { host: "notalonesummit.org", "x-forwarded-host": "evil.test", ...(origin ? { origin } : {}) } }))).toBe(false);
    }
    expect(sameWebsiteOrigin(new Request("https://notalonesummit.org/api/wellness/manage", { headers: { host: "notalonesummit.org,evil.test", origin: "https://notalonesummit.org" } }))).toBe(false);
  });
});
