import { IngestError } from "@/lib/ingest/errors";

export type ExtractedEvent = {
  title: string;
  startAt?: string | null;
  endAt?: string | null;
  timezone?: string | null;
  locationText?: string | null;
  description?: string | null;
  sourceUrl?: string | null;
};

export type ExtractUsage = {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
};

type StructuredExtractResponse = {
  events: ExtractedEvent[];
};

const extractionJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["events"],
  properties: {
    events: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title"],
        properties: {
          title: { type: "string", minLength: 1 },
          startAt: { type: ["string", "null"] },
          endAt: { type: ["string", "null"] },
          timezone: { type: ["string", "null"] },
          locationText: { type: ["string", "null"] },
          description: { type: ["string", "null"] },
          sourceUrl: { type: ["string", "null"], format: "uri" },
        },
      },
    },
  },
} as const;

function extractStructuredJson(raw: {
  output?: Array<{ content?: Array<{ type?: string; json?: unknown }> }>;
  response?: { output?: Array<{ content?: Array<{ type?: string; json?: unknown }> }> };
  output_parsed?: unknown;
}): unknown {
  if (raw.output_parsed !== undefined) return raw.output_parsed;

  const outputs = raw.output ?? raw.response?.output ?? [];
  for (const item of outputs) {
    for (const contentItem of item.content ?? []) {
      if (contentItem.type === "output_json" || contentItem.type === "json_schema") {
        return contentItem.json;
      }
    }
  }

  return undefined;
}

function isExtractResponse(value: unknown): value is StructuredExtractResponse {
  if (!value || typeof value !== "object") return false;
  const maybe = value as { events?: unknown };
  if (!Array.isArray(maybe.events)) return false;

  return maybe.events.every((event) => {
    if (!event || typeof event !== "object") return false;
    const maybeEvent = event as Record<string, unknown>;
    if (typeof maybeEvent.title !== "string" || maybeEvent.title.trim().length === 0) return false;

    const optionalStringOrNull = ["startAt", "endAt", "timezone", "locationText", "description", "sourceUrl"];
    return optionalStringOrNull.every((key) => maybeEvent[key] === undefined || typeof maybeEvent[key] === "string" || maybeEvent[key] === null);
  });
}

export async function extractEventsWithOpenAI(params: {
  html: string;
  sourceUrl: string;
  model?: string;
}): Promise<{ model: string; events: ExtractedEvent[]; raw: unknown; usage?: ExtractUsage }> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new IngestError("FETCH_FAILED", "OPENAI_API_KEY is required for extraction");
  }

  const model = params.model ?? "gpt-4o-mini";
  const input = [
    {
      role: "system",
      content: "Extract upcoming events from the provided HTML. Return results in the provided schema.",
    },
    {
      role: "user",
      content: [
        `Source URL: ${params.sourceUrl}`,
        "HTML:",
        params.html.slice(0, 120_000),
      ].join("\n"),
    },
  ];

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      max_output_tokens: 4000,
      input,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "venue_event_extraction",
          strict: true,
          schema: extractionJsonSchema,
        },
      },
    }),
  });

  if (!response.ok) {
    throw new IngestError("FETCH_FAILED", "OpenAI extraction request failed", {
      status: response.status,
    });
  }

  const raw = (await response.json()) as {
    output?: Array<{ content?: Array<{ type?: string; json?: unknown }> }>;
    response?: { output?: Array<{ content?: Array<{ type?: string; json?: unknown }> }> };
    output_parsed?: unknown;
    usage?: { input_tokens?: number; output_tokens?: number; total_tokens?: number };
  };
  const parsed = extractStructuredJson(raw);
  if (!isExtractResponse(parsed)) {
    throw new IngestError("BAD_MODEL_OUTPUT", "OpenAI output did not match expected event schema");
  }

  const events = parsed.events;

  const usage = raw.usage
    ? {
      promptTokens: raw.usage.input_tokens,
      completionTokens: raw.usage.output_tokens,
      totalTokens: raw.usage.total_tokens,
    }
    : undefined;

  return { model, events, raw: parsed, usage };
}
