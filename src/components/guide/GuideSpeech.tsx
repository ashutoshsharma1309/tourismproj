"use client";

import { Pause, Play, RotateCcw, Volume2, VolumeX } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";

import pronunciation from "@/data/pronunciation.json";
import { respell } from "@/lib/assistant/text";
import { cn } from "@/lib/cn";

/**
 * Hear an answer — compact controls, one line.
 *
 * WHICH VOICE
 * -----------
 * When the deployment has server speech for this language (a cached,
 * generated file), that file plays in an <audio> element. Otherwise the
 * traveller's own device reads it, through the Web Speech API, in a voice the
 * device actually has for this language. If the device has none, the control
 * says so; it never reads Tamil text with an English voice.
 *
 * English device voices get phonetic respellings for the names they are
 * known to mangle (data/pronunciation.json) — applied to the spoken text
 * only, never to the words on screen.
 *
 * The text is always on screen beside the control: audio is never the only
 * way to reach an answer.
 */

type Status = "idle" | "loading" | "playing" | "paused" | "unavailable";
const RATES = [0.75, 1, 1.25, 1.5] as const;
const STOP_OTHERS = "terrastory:guide-speech";

function voiceFor(tag: string, language: string): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  const lower = tag.toLowerCase();
  return (
    voices.find((v) => v.lang.toLowerCase() === lower) ??
    voices.find((v) => v.lang.toLowerCase().startsWith(`${language}-`)) ??
    voices.find((v) => v.lang.toLowerCase() === language) ??
    null
  );
}

/** Sentences of a speakable length: long utterances are cut off by some browsers. */
function chunks(text: string): string[] {
  const sentences = text.match(/[^.!?।]+[.!?।]?/g) ?? [text];
  const out: string[] = [];
  let current = "";
  for (const sentence of sentences) {
    if ((current + sentence).length > 220 && current) {
      out.push(current.trim());
      current = "";
    }
    current += sentence;
  }
  if (current.trim()) out.push(current.trim());
  return out;
}

function createAudio(url: string, rate: number, muted: boolean, onProgress: (p: number) => void, onEnd: () => void): HTMLAudioElement {
  const element = new Audio(url);
  element.playbackRate = rate;
  element.muted = muted;
  element.ontimeupdate = () => onProgress(element.duration ? element.currentTime / element.duration : 0);
  element.onended = onEnd;
  return element;
}

export function GuideSpeech({
  text,
  language,
  languageLabel,
  speechTag,
  serverSpeech,
}: {
  text: string;
  language: string;
  languageLabel: string;
  speechTag: string;
  serverSpeech: boolean;
}) {
  const [status, setStatus] = useState<Status>("idle");
  const [rate, setRate] = useState<number>(1);
  const [muted, setMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  /* Rendered only inside the opened panel, so the browser is always there. */
  const [hasDeviceVoice, setHasDeviceVoice] = useState<boolean>(() =>
    typeof window !== "undefined" && "speechSynthesis" in window ? voiceFor(speechTag, language) !== null : false,
  );
  const audio = useRef<HTMLAudioElement | null>(null);
  const queue = useRef<string[]>([]);
  const position = useRef(0);
  const cancelled = useRef(false);
  const instance = useId();
  const speakRef = useRef<(index: number) => void>(() => undefined);

  /* Voices load asynchronously in most browsers: listen for them arriving. */
  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const check = () => setHasDeviceVoice(voiceFor(speechTag, language) !== null);
    window.speechSynthesis.addEventListener("voiceschanged", check);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", check);
  }, [speechTag, language]);

  const stop = useCallback(() => {
    cancelled.current = true;
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    audio.current?.pause();
    setStatus("idle");
  }, []);

  /* One voice at a time across every answer on the page. */
  useEffect(() => {
    const onOther = (event: Event) => {
      if ((event as CustomEvent<string>).detail !== instance) stop();
    };
    window.addEventListener(STOP_OTHERS, onOther);
    return () => {
      window.removeEventListener(STOP_OTHERS, onOther);
      stop();
    };
  }, [stop, instance]);

  const speakFrom = useCallback(
    (index: number) => {
      const voice = voiceFor(speechTag, language);
      if (!voice) {
        setStatus("unavailable");
        return;
      }
      const parts = queue.current;
      if (index >= parts.length) {
        setStatus("idle");
        setProgress(1);
        return;
      }
      position.current = index;
      const utterance = new SpeechSynthesisUtterance(parts[index]);
      utterance.voice = voice;
      utterance.lang = voice.lang;
      utterance.rate = rate;
      utterance.volume = muted ? 0 : 1;
      utterance.onend = () => {
        if (cancelled.current) return;
        setProgress((index + 1) / parts.length);
        speakRef.current(index + 1);
      };
      utterance.onerror = () => {
        if (!cancelled.current) setStatus("idle");
      };
      window.speechSynthesis.speak(utterance);
    },
    [speechTag, language, rate, muted],
  );
  useEffect(() => {
    speakRef.current = speakFrom;
  }, [speakFrom]);

  const play = useCallback(async () => {
    window.dispatchEvent(new CustomEvent(STOP_OTHERS, { detail: instance }));
    cancelled.current = false;
    if (status === "paused") {
      if (audio.current && !audio.current.ended && audio.current.src) await audio.current.play();
      else window.speechSynthesis.resume();
      setStatus("playing");
      return;
    }
    setProgress(0);
    if (serverSpeech) {
      setStatus("loading");
      try {
        const response = await fetch("/api/assistant/speech", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ text: text.slice(0, 1200), language }),
        });
        const body = (await response.json()) as { available?: boolean; url?: string };
        if (response.ok && body.available && body.url) {
          const element = createAudio(body.url, rate, muted, setProgress, () => setStatus("idle"));
          audio.current?.pause();
          audio.current = element;
          await element.play();
          setStatus("playing");
          return;
        }
      } catch {
        /* Fall through to the device voice. */
      }
    }
    if (!("speechSynthesis" in window)) {
      setStatus("unavailable");
      return;
    }
    const spoken = language === "en" ? respell(text, (pronunciation as { en: Record<string, string> }).en) : text;
    queue.current = chunks(spoken);
    window.speechSynthesis.cancel();
    setStatus("playing");
    speakFrom(0);
  }, [status, serverSpeech, text, language, rate, muted, speakFrom, instance]);

  const pause = () => {
    if (audio.current && !audio.current.paused) audio.current.pause();
    else window.speechSynthesis.pause();
    setStatus("paused");
  };

  const replay = () => {
    stop();
    setStatus("idle");
    window.setTimeout(() => void play(), 50);
  };

  const cycleRate = () => {
    const next = RATES[(RATES.indexOf(rate as (typeof RATES)[number]) + 1) % RATES.length]!;
    setRate(next);
    if (audio.current) audio.current.playbackRate = next;
  };

  const toggleMute = () => {
    setMuted((m) => {
      if (audio.current) audio.current.muted = !m;
      return !m;
    });
  };

  if (!hasDeviceVoice && !serverSpeech) {
    return (
      <p className="text-[0.6875rem] text-foreground-inverse/45" data-speech="unavailable">
        Audio is unavailable for {languageLabel} on this device.
      </p>
    );
  }

  const button = "flex size-8 items-center justify-center rounded-full text-foreground-inverse/70 transition-colors hover:bg-white/10 hover:text-foreground-inverse focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none";
  return (
    <div className="flex items-center gap-1" role="group" aria-label={`Listen to this answer in ${languageLabel}`} data-speech={status}>
      {status === "playing" ? (
        <button type="button" onClick={pause} aria-label="Pause" className={button}>
          <Pause className="size-3.5" aria-hidden />
        </button>
      ) : (
        <button type="button" onClick={() => void play()} aria-label={status === "paused" ? "Resume" : "Play this answer"} className={button} disabled={status === "loading"}>
          <Play className="size-3.5" aria-hidden />
        </button>
      )}
      <button type="button" onClick={replay} aria-label="Replay from the start" className={button}>
        <RotateCcw className="size-3.5" aria-hidden />
      </button>
      <button type="button" onClick={toggleMute} aria-label={muted ? "Unmute" : "Mute"} aria-pressed={muted} className={button}>
        {muted ? <VolumeX className="size-3.5" aria-hidden /> : <Volume2 className="size-3.5" aria-hidden />}
      </button>
      <button type="button" onClick={cycleRate} aria-label={`Playback speed ${rate}×`} className={cn(button, "w-10 font-mono text-[0.6875rem]")}>
        {rate}×
      </button>
      <div className="ml-1 h-1 w-16 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-label="Playback progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}>
        <div className="h-full bg-accent transition-[width]" style={{ width: `${Math.round(progress * 100)}%` }} />
      </div>
      {status === "unavailable" ? <span className="ml-1 text-[0.6875rem] text-foreground-inverse/45">No {languageLabel} voice on this device.</span> : null}
      {status === "loading" ? <span className="ml-1 text-[0.6875rem] text-foreground-inverse/45">Preparing audio…</span> : null}
    </div>
  );
}
