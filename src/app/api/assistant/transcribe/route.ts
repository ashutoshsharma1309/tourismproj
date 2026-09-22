import { NextResponse } from "next/server";

import { recordsFor } from "@/lib/assistant/knowledge";
import { capabilityFor } from "@/lib/assistant/languages";
import { metric } from "@/lib/assistant/metrics";
import { isKnownDestination } from "@/lib/destinations/registry";
import { consumeQuota } from "@/lib/rate-limit";

/**
 * Speech to text for the Guide's microphone: Whisper large-v3 on Groq.
 *
 * The recording is sent to the recogniser and discarded — never stored, never
 * logged. Whisper is given the destination's place names as a hint, because
 * without it "Pemayangtse" comes back as "Pemiang Tsieng's". The transcript is
 * returned for the traveller to read and correct before anything is asked.
 */
export const dynamic = "force-dynamic";

const MAX_BYTES = 2 * 1024 * 1024;
const TYPES = /^audio\/(webm|ogg|mp4|mpeg|wav|x-m4a|m4a|aac)(;.*)?$/;
const noStore = { "cache-control": "private, no-store" };

export async function POST(request: Request) {
  const key = process.env.GROQ_API_KEY;
  if (!key) return NextResponse.json({ error: "Voice input is not configured." }, { status: 503, headers: noStore });
  const quota = await consumeQuota("guide-voice", 20, 10 * 60 * 1000);
  if (!quota.ok) return NextResponse.json({ error: "Too many recordings in a short time." }, { status: 429, headers: noStore });

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Send the recording as a form." }, { status: 400, headers: noStore });
  }
  const file = form.get("audio");
  const language = typeof form.get("language") === "string" ? String(form.get("language")) : "en";
  const destinationId = typeof form.get("destinationId") === "string" ? String(form.get("destinationId")) : "";
  if (!(file instanceof File) || file.size === 0 || file.size > MAX_BYTES || !TYPES.test(file.type)) {
    return NextResponse.json({ error: "The recording is missing, too long, or not audio." }, { status: 400, headers: noStore });
  }
  if (!capabilityFor(language).voiceInput) {
    return NextResponse.json({ error: "Voice input isn't available in this language yet." }, { status: 400, headers: noStore });
  }

  const names = isKnownDestination(destinationId)
    ? (await recordsFor(destinationId)).filter((r) => r.kind === "monastery" || r.kind === "place").map((r) => r.name).slice(0, 60)
    : [];
  const upstream = new FormData();
  upstream.set("file", file, file.name || "question.webm");
  upstream.set("model", "whisper-large-v3-turbo");
  upstream.set("response_format", "json");
  upstream.set("language", language);
  /* Whisper's prompt is limited to about 224 tokens. */
  if (names.length) upstream.set("prompt", `Places: ${names.join(", ")}`.slice(0, 800));

  const started = performance.now();
  try {
    const response = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      signal: AbortSignal.timeout(20_000),
      headers: { authorization: `Bearer ${key}` },
      body: upstream,
    });
    const ms = Math.round(performance.now() - started);
    if (!response.ok) {
      metric({ event: "stt", provider: "groq-whisper", ok: false, ms, reason: `http-${response.status}` });
      return NextResponse.json({ error: "I couldn't make out the recording. Please try again or type." }, { status: 502, headers: noStore });
    }
    const body = (await response.json()) as { text?: string };
    const text = (body.text ?? "").trim();
    metric({ event: "stt", provider: "groq-whisper", ok: text.length > 0, ms });
    /* Silence or noise comes back empty or as a filler phrase: don't pretend it was a question. */
    if (text.length < 2 || /^(thank you|thanks for watching|you)\.?$/i.test(text)) {
      return NextResponse.json({ text: "", note: "I didn't catch a question. Try again closer to the microphone, or type." }, { headers: noStore });
    }
    return NextResponse.json({ text: text.slice(0, 600) }, { headers: noStore });
  } catch {
    metric({ event: "stt", provider: "groq-whisper", ok: false, reason: "error" });
    return NextResponse.json({ error: "Voice input didn't respond. Please type instead." }, { status: 502, headers: noStore });
  }
}
