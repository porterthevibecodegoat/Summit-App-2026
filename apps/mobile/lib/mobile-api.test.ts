import { describe, expect, it } from "vitest";
import { resolveMobileApiBaseUrl } from "./mobile-api-url";

describe("resolveMobileApiBaseUrl", () => {
  const fallback = "https://summit.example.org";

  it("uses an HTTPS runtime endpoint", () => {
    expect(resolveMobileApiBaseUrl("https://api.example.org/", fallback)).toBe("https://api.example.org");
  });

  it.each(["localhost", "127.0.0.1", "[::1]"])("allows the %s loopback host during development", (host) => {
    expect(resolveMobileApiBaseUrl(`http://${host}:3000/`, fallback, true)).toBe(`http://${host}:3000`);
  });

  it.each(["localhost", "127.0.0.1", "[::1]"])("rejects %s outside development", (host) => {
    expect(resolveMobileApiBaseUrl(`http://${host}:3000/`, fallback)).toBe(fallback);
  });

  it("rejects insecure non-loopback runtime endpoints", () => {
    expect(resolveMobileApiBaseUrl("http://summit.example.org", fallback)).toBe(fallback);
  });

  it("falls back when runtime configuration is malformed", () => {
    expect(resolveMobileApiBaseUrl("not a URL", `${fallback}/`)).toBe(fallback);
  });
});
