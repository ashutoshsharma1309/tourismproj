"use client";

import { Pause, Play, RotateCcw, RotateCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { BLOCKED_AUDIO_LANGUAGES } from "@/data/audio";
import type { AudioGuide } from "@/data/audio";

function clock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** "Listen to Heritage" — real generated narration, disclosed as machine-made. */
export function HeritageAudioPlayer({ guides }: { guides: AudioGuide[] }) {
  const [lang, setLang] = useState(guides[0]?.language ?? "en");
  const guide = guides.find((g) => g.language === lang) ?? guides[0];
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [rate, setRate] = useState(1);
  const [showTranscript, setShowTranscript] = useState(false);

  // Switching language restarts the track rather than seeking into a different one.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.load();
    setPlaying(false);
    setPosition(0);
  }, [lang]);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) audio.playbackRate = rate;
  }, [rate]);

  if (!guide) return null;

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      void audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    }
  };

  const skip = (delta: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.min(
      Math.max(0, audio.currentTime + delta),
      guide.durationSeconds,
    );
  };

  return (
    <div className="w-full min-w-0 rounded-xl border bg-surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-h4 font-semibold">Listen to Heritage</h3>
        {guides.length > 1 ? (
          <div className="flex min-w-0 flex-wrap gap-1.5" role="group" aria-label="Narration language">
            {guides.map((g) => (
              <button
                key={g.language}
                type="button"
                onClick={() => setLang(g.language)}
                aria-pressed={g.language === lang}
                className={cn(
                  "h-9 rounded-full border px-3.5 text-label font-medium transition-colors",
                  g.language === lang
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border-strong text-muted hover:border-primary hover:text-primary",
                )}
              >
                {g.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <audio
        ref={audioRef}
        src={guide.audioUrl}
        preload="none"
        onTimeUpdate={(e) => setPosition(e.currentTarget.currentTime)}
        onEnded={() => setPlaying(false)}
      >
        <track kind="captions" />
      </audio>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button size="icon" onClick={toggle} aria-label={playing ? "Pause" : "Play"}>
          {playing ? <Pause className="size-4" aria-hidden /> : <Play className="size-4" aria-hidden />}
        </Button>
        <Button variant="ghost" size="icon" onClick={() => skip(-10)} aria-label="Back 10 seconds">
          <RotateCcw className="size-4" aria-hidden />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => skip(10)} aria-label="Forward 10 seconds">
          <RotateCw className="size-4" aria-hidden />
        </Button>
        <div className="order-last flex w-full min-w-0 items-center gap-2 sm:order-none sm:w-auto sm:flex-1">
          <span data-numeric className="font-mono text-caption text-muted">{clock(position)}</span>
          <input
            type="range"
            min={0}
            max={guide.durationSeconds}
            step={0.5}
            value={position}
            onChange={(e) => {
              const audio = audioRef.current;
              if (audio) audio.currentTime = Number(e.target.value);
              setPosition(Number(e.target.value));
            }}
            aria-label="Seek"
            className="min-w-0 flex-1 accent-primary"
          />
          <span data-numeric className="font-mono text-caption text-muted">
            {clock(guide.durationSeconds)}
          </span>
        </div>
        <label className="flex items-center gap-1.5 text-caption text-muted">
          <span className="sr-only">Playback speed</span>
          <select
            value={rate}
            onChange={(e) => setRate(Number(e.target.value))}
            className="h-9 rounded-lg border border-border-strong bg-surface px-2 text-caption"
          >
            {[0.75, 1, 1.25, 1.5].map((r) => (
              <option key={r} value={r}>{r}×</option>
            ))}
          </select>
        </label>
      </div>

      <button
        type="button"
        onClick={() => setShowTranscript((v) => !v)}
        aria-expanded={showTranscript}
        className="mt-4 text-small font-medium text-primary hover:underline"
      >
        {showTranscript ? "Hide transcript" : "Show transcript"}
      </button>
      {showTranscript ? (
        <p className="mt-2 rounded-lg bg-surface-muted p-4 text-small leading-relaxed text-muted">
          {guide.transcript}
        </p>
      ) : null}

      <p className="mt-4 text-caption leading-relaxed text-muted">
        Narration is machine-generated from this page&apos;s cited sources — no
        detail is added that the sources do not contain.
        {guide.translationReviewed === false
          ? " The translation is written from the same verified facts and has not yet been reviewed by a native speaker."
          : ""}
      </p>
      {guide.attribution ? (
        <p className="mt-1 text-caption text-subtle">{guide.attribution}</p>
      ) : null}
      <p className="mt-1 text-caption text-subtle">
        Not offered yet: {BLOCKED_AUDIO_LANGUAGES.map((l) => l.label).join(", ")} —
        no speech voice is available for these, and narration in the wrong
        phonology would serve nobody.
      </p>
    </div>
  );
}
