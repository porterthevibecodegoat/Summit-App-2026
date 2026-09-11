import { describe, expect, it } from "vitest";
import { publicApiCorsHeaders, publicApiOptions } from "./public-api-cors";

describe("public mobile API CORS", () => {
  it("allows a browser attendee app to call a public endpoint", () => {
    expect(publicApiCorsHeaders(["GET"])).toMatchObject({
      "Access-Control-Allow-Headers": "Cache-Control, Content-Type",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Origin": "*"
    });
  });

  it("answers preflight without a response body", async () => {
    const response = publicApiOptions(["POST"]);

    expect(response.status).toBe(204);
    expect(response.headers.get("access-control-allow-methods")).toBe("POST, OPTIONS");
    expect(await response.text()).toBe("");
  });
});
