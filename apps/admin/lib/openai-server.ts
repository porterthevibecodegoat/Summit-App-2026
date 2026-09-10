const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const DEFAULT_MODEL = "gpt-4o-mini";

type JsonSchema = Record<string, unknown>;

type OpenAiResponse = {
  output_text?: string;
  output?: Array<{
    type?: string;
    content?: Array<{ type?: string; text?: string }>;
  }>;
};

export function isOpenAiEnabled() {
  return process.env.ENABLE_AI === "true" && Boolean(process.env.OPENAI_API_KEY?.trim());
}

export async function createStructuredOpenAiResponse<T>({
  name,
  schema,
  instructions,
  input,
  maxOutputTokens = 700
}: {
  name: string;
  schema: JsonSchema;
  instructions: string;
  input: string;
  maxOutputTokens?: number;
}): Promise<T> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey || process.env.ENABLE_AI !== "true") {
    throw new Error("OpenAI is not enabled.");
  }

  const response = await fetch(OPENAI_RESPONSES_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL?.trim() || DEFAULT_MODEL,
      instructions,
      input,
      store: false,
      max_output_tokens: maxOutputTokens,
      text: {
        format: {
          type: "json_schema",
          name,
          strict: true,
          schema
        }
      }
    }),
    signal: AbortSignal.timeout(20_000)
  });

  if (!response.ok) {
    throw new Error(`OpenAI request failed with status ${response.status}.`);
  }

  const payload = (await response.json()) as OpenAiResponse;
  const outputText = payload.output_text ?? payload.output
    ?.flatMap((item) => item.content ?? [])
    .find((content) => content.type === "output_text")?.text;

  if (!outputText) {
    throw new Error("OpenAI returned no structured output.");
  }

  return JSON.parse(outputText) as T;
}
