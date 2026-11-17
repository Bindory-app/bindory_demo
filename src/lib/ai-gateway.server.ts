/**
 * Minimal OpenAI Responses API client for Vercel AI Gateway.
 *
 * Replaces @lovable.dev/ai-gateway so Mori runs outside Lovable. It keeps the same
 * surface mori-agent.server.ts relied on (streamResponse, GatewayError and the
 * Responses types it uses), so the agent loop itself is unchanged.
 *
 * Auth, in order: the Vercel OIDC token for this request (set automatically on Vercel deployments,
 * no key to manage), VERCEL_OIDC_TOKEN from the environment, then AI_GATEWAY_API_KEY for local runs.
 * Server only: these credentials must never reach browser code.
 */

const GATEWAY_URL = "https://ai-gateway.vercel.sh/v1/responses";

export type ResponsesFunctionTool = {
  type: "function";
  name: string;
  description?: string;
  parameters: Record<string, unknown>;
  strict?: boolean;
};

export type ResponsesInputItem =
  | { role: "user" | "system" | "developer"; content: string }
  | {
      role: "user";
      content: (
        { type: "input_text"; text: string } | { type: "input_image"; image_url: string }
      )[];
    }
  | {
      role: "assistant";
      content: { type: "output_text"; text: string; annotations: unknown[] }[];
    }
  | { type: "function_call"; call_id: string; name: string; arguments: string }
  | { type: "function_call_output"; call_id: string; output: string };

export type ResponsesRequest = {
  model: string;
  instructions?: string;
  input: ResponsesInputItem[];
  tools?: ResponsesFunctionTool[];
  max_output_tokens?: number;
};

type OutputContent = { type: string; text?: string };
type OutputItem = {
  type: string;
  name?: string;
  arguments?: string;
  call_id?: string;
  content?: OutputContent[];
};

export type ResponsesResponse = { id?: string; output?: OutputItem[] };

/** One SSE event. `delta` is set on response.output_text.delta, `response` on response.completed. */
export type ResponsesStreamEvent = {
  type: string;
  delta?: string;
  response?: ResponsesResponse;
};

export type GatewayErrorCode =
  | "not_configured"
  | "unauthorized"
  | "payment_required"
  | "rate_limited"
  | "bad_request"
  | "upstream";

export class GatewayError extends Error {
  readonly code: GatewayErrorCode;
  readonly ids: { requestId?: string | undefined };
  constructor(
    code: GatewayErrorCode,
    message: string,
    ids: { requestId?: string | undefined } = {},
  ) {
    super(message);
    this.name = "GatewayError";
    this.code = code;
    this.ids = ids;
  }
}

function codeForStatus(status: number): GatewayErrorCode {
  if (status === 401 || status === 403) return "unauthorized";
  if (status === 402) return "payment_required";
  if (status === 429) return "rate_limited";
  if (status >= 400 && status < 500) return "bad_request";
  return "upstream";
}

async function* readSse(body: ReadableStream<Uint8Array>, requestId?: string) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let data: string[] = [];
  let event = "";
  try {
    while (true) {
      const { value, done } = await reader.read();
      buffer += done ? decoder.decode() : decoder.decode(value, { stream: true });
      let nl: number;
      while ((nl = buffer.search(/\r?\n/)) !== -1) {
        const line = buffer.slice(0, nl);
        buffer = buffer.slice(buffer[nl] === "\r" ? nl + 2 : nl + 1);
        if (line === "") {
          if (data.length) {
            const payload = data.join("\n");
            data = [];
            if (payload === "[DONE]") return;
            const parsed = JSON.parse(payload) as Record<string, unknown>;
            const type = (parsed["type"] as string | undefined) ?? event;
            if (type === "error" || type === "response.failed" || parsed["error"]) {
              throw new GatewayError("upstream", "Gateway stream reported an error", { requestId });
            }
            yield { ...parsed, type } as ResponsesStreamEvent;
          }
          event = "";
        } else if (!line.startsWith(":")) {
          const colon = line.indexOf(":");
          const field = colon === -1 ? line : line.slice(0, colon);
          const val = colon === -1 ? "" : line.slice(colon + 1).replace(/^ /, "");
          if (field === "data") data.push(val);
          if (field === "event") event = val;
        }
      }
      if (done) return;
    }
  } finally {
    await reader.cancel().catch(() => undefined);
  }
}

/** POST a streaming Responses request to AI Gateway and iterate its SSE events. */
export async function streamResponse(
  payload: ResponsesRequest,
  options: { signal?: AbortSignal; oidcToken?: string | null } = {},
): Promise<AsyncIterable<ResponsesStreamEvent>> {
  const sources: [string, string | null | undefined][] = [
    ["request OIDC token", options.oidcToken],
    ["VERCEL_OIDC_TOKEN", process.env["VERCEL_OIDC_TOKEN"]],
    ["AI_GATEWAY_API_KEY", process.env["AI_GATEWAY_API_KEY"]],
  ];
  const [source, key] = sources.find(([, v]) => !!v) ?? ["none", undefined];
  if (!key)
    throw new GatewayError("not_configured", "No AI Gateway credential (OIDC token or API key)");
  const res = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ ...payload, stream: true }),
    ...(options.signal ? { signal: options.signal } : {}),
  });
  const requestId = res.headers.get("x-vercel-id") ?? undefined;
  if (!res.ok || !res.body) {
    const detail = await res.text().catch(() => "");
    // Names the credential source only, never its value.
    console.error("AI Gateway rejected request", {
      status: res.status,
      credential: source,
      detail: detail.slice(0, 300),
    });
    throw new GatewayError(
      codeForStatus(res.status),
      `Gateway request failed (${res.status}): ${detail.slice(0, 300)}`,
      { requestId },
    );
  }
  const body = res.body;
  return { [Symbol.asyncIterator]: () => readSse(body, requestId) };
}
