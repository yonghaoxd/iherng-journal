import { requireEnv } from "./env";

// Read at call time: scripts load .env after their imports have run.
const baseUrl = () => process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com";
export const modelName = () => process.env.DEEPSEEK_MODEL ?? "deepseek-flash";

// USD per 1M tokens at peak; off-peak is half. https://api-docs.deepseek.com/quick_start/pricing
const PEAK_PRICE = { cacheHit: 0.006, cacheMiss: 0.3, output: 1.2 };

/**
 * Peak is Mon–Fri 01:00–04:00 and 06:00–10:00 UTC. Chinese public holidays are
 * also off-peak but are not modelled, so estimates can only err high.
 */
export function isPeak(at: Date = new Date()): boolean {
  const day = at.getUTCDay();
  if (day === 0 || day === 6) return false;
  const hour = at.getUTCHours();
  return (hour >= 1 && hour < 4) || (hour >= 6 && hour < 10);
}

export interface Usage {
  cacheHit: number;
  cacheMiss: number;
  output: number;
  costUsd: number;
}

export const NO_USAGE: Usage = { cacheHit: 0, cacheMiss: 0, output: 0, costUsd: 0 };

export function addUsage(a: Usage, b: Usage): Usage {
  return {
    cacheHit: a.cacheHit + b.cacheHit,
    cacheMiss: a.cacheMiss + b.cacheMiss,
    output: a.output + b.output,
    costUsd: a.costUsd + b.costUsd,
  };
}

interface CompletionResponse {
  choices: { message?: { content?: string | null }; finish_reason?: string }[];
  usage?: {
    prompt_cache_hit_tokens?: number;
    prompt_cache_miss_tokens?: number;
    completion_tokens?: number;
  };
}

function usageOf(data: CompletionResponse, at: Date): Usage {
  const cacheHit = data.usage?.prompt_cache_hit_tokens ?? 0;
  const cacheMiss = data.usage?.prompt_cache_miss_tokens ?? 0;
  const output = data.usage?.completion_tokens ?? 0;
  const scale = isPeak(at) ? 1 : 0.5;
  const costUsd =
    ((cacheHit * PEAK_PRICE.cacheHit + cacheMiss * PEAK_PRICE.cacheMiss + output * PEAK_PRICE.output) *
      scale) /
    1_000_000;
  return { cacheHit, cacheMiss, output, costUsd };
}

export interface ChatRequest {
  /** Keep this byte-identical across calls so DeepSeek serves it from cache. */
  system: string;
  user: string;
  maxTokens: number;
  json?: boolean;
  temperature?: number;
}

export interface ChatResult {
  content: string;
  usage: Usage;
  /** True when the reply hit max_tokens and was cut off. */
  truncated: boolean;
}

const MAX_ATTEMPTS = 2;

export async function chat(request: ChatRequest): Promise<ChatResult> {
  const body = JSON.stringify({
    model: modelName(),
    messages: [
      { role: "system", content: request.system },
      { role: "user", content: request.user },
    ],
    max_tokens: request.maxTokens,
    temperature: request.temperature ?? 0.2,
    // Thinking is on by default and its reasoning bills as output tokens.
    // Every call here is short and grounded in supplied text, so turn it off.
    thinking: { type: "disabled" },
    ...(request.json ? { response_format: { type: "json_object" } } : {}),
  });

  let usage = NO_USAGE;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const startedAt = new Date();
    const response = await fetch(`${baseUrl()}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${requireEnv("DEEPSEEK_API_KEY")}`,
      },
      body,
    });

    if (!response.ok) {
      const retryable = response.status === 429 || response.status >= 500;
      if (retryable && attempt < MAX_ATTEMPTS) {
        await new Promise((resolve) => setTimeout(resolve, 1500));
        continue;
      }
      const detail = (await response.text()).slice(0, 300);
      throw new Error(`DeepSeek request failed (${response.status}): ${detail}`);
    }

    const data = (await response.json()) as CompletionResponse;
    usage = addUsage(usage, usageOf(data, startedAt));
    const choice = data.choices[0];
    const content = choice?.message?.content?.trim() ?? "";
    // JSON mode occasionally returns empty content; DeepSeek's docs suggest retrying.
    if (!content && attempt < MAX_ATTEMPTS) continue;
    return { content, usage, truncated: choice?.finish_reason === "length" };
  }
  throw new Error("DeepSeek returned no content.");
}
