import { NextResponse } from "next/server";

import { classify } from "@/lib/assistant/intents";
import { metric } from "@/lib/assistant/metrics";
import { answer } from "@/lib/assistant/respond";
import { assistantRequestSchema } from "@/lib/assistant/types";
import { currentUser } from "@/lib/auth/session";
import { consumeQuota } from "@/lib/rate-limit";

/**
 * The TerraStory Guide: one question in, one validated reply out.
 *
 * Nothing is stored. The conversation's short-term memory travels with the
 * request from the browser; the question, the answer and any location are
 * used to answer and then forgotten. Logs carry counts and timings only.
 *
 * Limits: 30 questions per 10 minutes per network address. Deterministic
 * answers (distances, nearby, permits) cost nothing but still count, so the
 * limit cannot be dodged by phrasing.
 */
export const dynamic = "force-dynamic";

const noStore = { "cache-control": "private, no-store" };

export async function POST(request: Request) {
  const quota = await consumeQuota("guide-ask", 30, 10 * 60 * 1000);
  if (!quota.ok) {
    metric({ event: "rate_limited" });
    return NextResponse.json(
      { error: "You've asked a lot of questions in a short time. Please wait a few minutes." },
      { status: 429, headers: { ...noStore, "retry-after": String(quota.retryAfterSeconds) } },
    );
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Send a question as JSON." }, { status: 400, headers: noStore });
  }
  const parsed = assistantRequestSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "That request isn't one I can answer." }, { status: 400, headers: noStore });
  const { data: input } = parsed;

  /* Personal recommendations only where they are asked for; everything else
     needs no identity, so the Guide works the same signed in or not. */
  const userId = classify(input.question) === "NEXT" ? ((await currentUser())?.id ?? null) : null;
  try {
    const reply = await answer(input, { userId });
    return NextResponse.json(reply, { headers: noStore });
  } catch (error) {
    metric({ event: "error", reason: (error as Error).name });
    return NextResponse.json({ error: "The Guide couldn't answer just now." }, { status: 500, headers: noStore });
  }
}
