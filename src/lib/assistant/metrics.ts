import "server-only";

/**
 * Structured operational metrics for the Guide — counts and timings only.
 *
 * Never the question, the answer, the traveller's identity or their location:
 * a log line says "DISTANCE answered from records in 38 ms with routing", not
 * what was asked or where the person stood.
 */
export interface GuideMetric {
  event: "request" | "tool" | "llm" | "tts" | "stt" | "fallback" | "rate_limited" | "error";
  intent?: string;
  tool?: string;
  provider?: string;
  ms?: number;
  ok?: boolean;
  cache?: "hit" | "miss";
  tokens?: number;
  reason?: string;
}

export function metric(entry: GuideMetric): void {
  console.info(JSON.stringify({ scope: "guide", at: new Date().toISOString(), ...entry }));
}

export async function timed<T>(fn: () => Promise<T>): Promise<{ value: T; ms: number }> {
  const started = performance.now();
  const value = await fn();
  return { value, ms: Math.round(performance.now() - started) };
}
