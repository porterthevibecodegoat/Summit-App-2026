import { afterEach, describe, expect, it, vi } from "vitest";
import { createStructuredOpenAiResponse, isOpenAiEnabled } from "./openai-server";

describe("OpenAI server client", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_MODEL;
    delete process.env.ENABLE_AI;
  });

  it("keeps the key server-side and requests non-stored structured output", async () => {
    process.env.OPENAI_API_KEY = "test-secret";
    process.env.ENABLE_AI = "true";
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      output_text: JSON.stringify({ answer: "Grounded answer" })
    }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await createStructuredOpenAiResponse<{ answer: string }>({
      name: "test_answer",
      schema: { type: "object" },
      instructions: "Use supplied facts.",
      input: "Question"
    });

    expect(result.answer).toBe("Grounded answer");
    const [url, request] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.openai.com/v1/responses");
    expect(request.headers).toMatchObject({ Authorization: "Bearer test-secret" });
    expect(JSON.parse(String(request.body))).toMatchObject({
      store: false,
      text: { format: { type: "json_schema", name: "test_answer", strict: true } }
    });
  });

  it("requires both the feature flag and key", () => {
    process.env.OPENAI_API_KEY = "test-secret";
    process.env.ENABLE_AI = "false";
    expect(isOpenAiEnabled()).toBe(false);
    process.env.ENABLE_AI = "true";
    expect(isOpenAiEnabled()).toBe(true);
  });
});
