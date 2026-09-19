"use client";

import { Loader2, Mic, Square } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/cn";

/**
 * Ask by voice. The recording goes to the server's speech recogniser and the
 * transcript comes back into the question box — for the traveller to read and
 * correct — rather than being sent as a question. A mis-heard place name is
 * cheaper to fix than a wrong answer.
 *
 * States: idle → listening → processing → idle. Recording stops at 15 s.
 * Denied microphones, missing MediaRecorder support and recogniser failures
 * all fall back to typing with a plain message; nothing is sent from noise.
 */

type State = "idle" | "listening" | "processing";
const MAX_MS = 15_000;

function pickMime(): string | null {
  if (typeof MediaRecorder === "undefined") return null;
  for (const type of ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/mp4"]) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return "";
}

export function GuideVoice({
  language,
  destinationId,
  onTranscript,
  onMessage,
}: {
  language: string;
  destinationId: string | null;
  onTranscript: (text: string) => void;
  onMessage: (text: string) => void;
}) {
  const [state, setState] = useState<State>("idle");
  /* Rendered only inside the opened panel, so the browser is always there. */
  const [supported] = useState(
    () => typeof navigator !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia) && pickMime() !== null,
  );
  const recorder = useRef<MediaRecorder | null>(null);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
      recorder.current?.stream.getTracks().forEach((t) => t.stop());
    };
  }, []);

  if (!supported) return null;

  const send = async (blob: Blob) => {
    setState("processing");
    try {
      const form = new FormData();
      form.set("audio", new File([blob], `question.${blob.type.includes("mp4") ? "m4a" : blob.type.includes("ogg") ? "ogg" : "webm"}`, { type: blob.type.split(";")[0] || "audio/webm" }));
      form.set("language", language);
      if (destinationId) form.set("destinationId", destinationId);
      const response = await fetch("/api/assistant/transcribe", { method: "POST", body: form });
      const body = (await response.json()) as { text?: string; note?: string; error?: string };
      if (!response.ok) onMessage(body.error ?? "Voice input didn't work. Please type your question.");
      else if (body.text) onTranscript(body.text);
      else onMessage(body.note ?? "I didn't catch a question.");
    } catch {
      onMessage("Voice input didn't respond. Please type your question.");
    } finally {
      setState("idle");
    }
  };

  const start = async () => {
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (error) {
      onMessage((error as DOMException).name === "NotAllowedError" ? "Microphone access was declined. You can type your question instead." : "No microphone is available. You can type your question instead.");
      return;
    }
    const mime = pickMime();
    const rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
    const parts: Blob[] = [];
    rec.ondataavailable = (event) => {
      if (event.data.size > 0) parts.push(event.data);
    };
    rec.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      if (timer.current) window.clearTimeout(timer.current);
      const blob = new Blob(parts, { type: rec.mimeType || "audio/webm" });
      /* Under half a second is a tap, not a question. */
      if (blob.size < 2_000) {
        setState("idle");
        onMessage("That was too short to hear. Hold on a moment longer, or type.");
        return;
      }
      void send(blob);
    };
    recorder.current = rec;
    rec.start();
    setState("listening");
    timer.current = window.setTimeout(() => rec.state === "recording" && rec.stop(), MAX_MS);
  };

  const stop = () => {
    if (recorder.current?.state === "recording") recorder.current.stop();
  };

  const label = state === "listening" ? "Stop recording" : state === "processing" ? "Transcribing" : "Ask by voice";
  return (
    <button
      type="button"
      onClick={state === "listening" ? stop : state === "idle" ? () => void start() : undefined}
      aria-label={label}
      title={label}
      aria-pressed={state === "listening"}
      disabled={state === "processing"}
      data-voice={state}
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none",
        state === "listening" ? "animate-pulse bg-error text-white" : "text-foreground-inverse/70 hover:bg-white/10 hover:text-foreground-inverse",
      )}
    >
      {state === "listening" ? <Square className="size-3.5" aria-hidden /> : state === "processing" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Mic className="size-4" aria-hidden />}
      <span className="sr-only" aria-live="polite">{state === "listening" ? "Listening" : state === "processing" ? "Processing" : ""}</span>
    </button>
  );
}
