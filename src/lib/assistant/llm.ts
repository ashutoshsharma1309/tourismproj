import "server-only";

import { metric } from "./metrics";

/**
 * The language model, behind one interface.
 *
 * WHAT THE MODEL IS FOR
 * ---------------------
 * Wording, and nothing else. By the time a model is called, the server has
 * already decided what the question is about, run every tool it needs
 * (distance, route, nearby, permits, weather) and retrieved the handful of
 * records that may be quoted. The model receives those, writes an answer in
 * the traveller's language, and names which records it used. It cannot call
 * a tool, read the database, or reach anything the server did not hand it —
 * there is no code path by which it could.
 *
 * PROVIDERS
 * ---------
 * The configured provider is Groq (`GROQ_API_KEY`), serving an open-weight
 * model chosen by `ASSISTANT_MODEL`. A different provider is a new adapter
 * implementing `complete`; nothing else changes. Without a key the model is
 * NOT CONFIGURED and every answer is the deterministic one from records.
 */

export interface CompletionRequest {
  system: string;
  user: string;
  maxTokens: number;
  temperature?: number;
}

export type CompletionOutcome =
  | { ok: true; text: string; model: string; ms: number; tokens: number | null }
  | { ok: false; reason: "not-configured" | "timeout" | "rate-limited" | "error" };

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_MODEL = "openai/gpt-oss-120b";
/* Groq's free tier allows 8,000 tokens a minute per model; the smaller model
   has its own allowance, so a burst spills over to it instead of failing. */
const DEFAULT_FALLBACK_MODEL = "openai/gpt-oss-20b";
const GUARD_MODEL = "meta-llama/llama-prompt-guard-2-86m";
const TIMEOUT_MS = 15_000;

export function languageModel(): { provider: string; model: string } | null {
  return process.env.GROQ_API_KEY ? { provider: "groq", model: process.env.ASSISTANT_MODEL || DEFAULT_MODEL } : null;
}

/**
 * One JSON completion. The caller validates the JSON; this only transports it.
 * A dropped connection is retried once; a refusal, rate limit or timeout is not.
 */
export async function completeJson(request: CompletionRequest): Promise<CompletionOutcome> {
  const primary = languageModel()?.model;
  if (!primary) return { ok: false, reason: "not-configured" };
  const first = await attempt(request, primary);
  if (first.ok) return first;
  if (first.reason === "error") return attempt(request, primary);
  if (first.reason === "rate-limited") {
    const fallback = process.env.ASSISTANT_FALLBACK_MODEL || DEFAULT_FALLBACK_MODEL;
    if (fallback !== primary) return attempt(request, fallback);
  }
  return first;
}

async function attempt(request: CompletionRequest, model: string): Promise<CompletionOutcome> {
  const configured = languageModel() ? { model } : null;
  const key = process.env.GROQ_API_KEY;
  if (!configured || !key) return { ok: false, reason: "not-configured" };
  const started = performance.now();
  try {
    const response = await fetch(GROQ_URL, {
      method: "POST",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({
        model: configured.model,
        temperature: request.temperature ?? 0.2,
        max_completion_tokens: request.maxTokens,
        response_format: { type: "json_object" },
        /* Reasoning models spend tokens thinking; "low" keeps a travel answer quick. */
        ...(configured.model.startsWith("openai/gpt-oss") ? { reasoning_effort: "low" } : {}),
        messages: [
          { role: "system", content: request.system },
          { role: "user", content: request.user },
        ],
      }),
    });
    const ms = Math.round(performance.now() - started);
    if (response.status === 429) {
      metric({ event: "llm", provider: "groq", ok: false, ms, reason: "rate-limited" });
      return { ok: false, reason: "rate-limited" };
    }
    if (!response.ok) {
      metric({ event: "llm", provider: "groq", ok: false, ms, reason: `http-${response.status}` });
      return { ok: false, reason: "error" };
    }
    const body = (await response.json()) as { choices?: { message?: { content?: string } }[]; usage?: { total_tokens?: number } };
    const text = body.choices?.[0]?.message?.content ?? "";
    metric({ event: "llm", provider: `groq:${configured.model}`, ok: text.length > 0, ms, tokens: body.usage?.total_tokens });
    return text ? { ok: true, text, model: configured.model, ms, tokens: body.usage?.total_tokens ?? null } : { ok: false, reason: "error" };
  } catch (error) {
    const timeout = (error as Error).name === "TimeoutError";
    metric({ event: "llm", provider: "groq", ok: false, ms: Math.round(performance.now() - started), reason: timeout ? "timeout" : "error" });
    return { ok: false, reason: timeout ? "timeout" : "error" };
  }
}

/**
 * Probability (0–1) that a question is a prompt-injection attempt, from
 * Llama Prompt Guard 2. A question scored as an attack is still answered —
 * from records, deterministically — but is never handed to the model. If the
 * classifier is unreachable this returns null and the caller proceeds: the
 * model is already confined to the records it is given.
 */
export async function injectionScore(text: string): Promise<number | null> {
  const key = process.env.GROQ_API_KEY;
  if (!key) return null;
  try {
    const response = await fetch(GROQ_URL, {
      method: "POST",
      signal: AbortSignal.timeout(4_000),
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({ model: GUARD_MODEL, messages: [{ role: "user", content: text.slice(0, 2000) }] }),
    });
    if (!response.ok) return null;
    const body = (await response.json()) as { choices?: { message?: { content?: string } }[] };
    const score = Number.parseFloat(body.choices?.[0]?.message?.content ?? "");
    return Number.isFinite(score) ? score : null;
  } catch {
    return null;
  }
}
