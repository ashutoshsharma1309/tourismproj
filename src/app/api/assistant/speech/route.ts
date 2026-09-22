import { NextResponse } from "next/server";
import { z } from "zod";

import { generateSpeech } from "@/lib/assistant/speech-server";
import { consumeQuota } from "@/lib/rate-limit";

/**
 * Server speech for an answer, when configured (lib/assistant/speech-server.ts).
 * Answers 501 when it is not — the interface then uses the device's own voice.
 */
export const dynamic = "force-dynamic";

const schema = z.object({ text: z.string().trim().min(1).max(1200), language: z.string().min(2).max(5) });

export async function POST(request: Request) {
  const quota = await consumeQuota("guide-speech", 30, 10 * 60 * 1000);
  if (!quota.ok) return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  const { data: input } = parsed;
  const outcome = await generateSpeech(input);
  if (!outcome.ok) {
    return NextResponse.json(
      { available: false, reason: outcome.reason },
      { status: outcome.reason === "unavailable" ? 502 : 501, headers: { "cache-control": "no-store" } },
    );
  }
  return NextResponse.json(
    { available: true, url: outcome.url, cached: outcome.cached, voice: outcome.voice, provider: outcome.provider },
    { headers: { "cache-control": "private, no-store" } },
  );
}
