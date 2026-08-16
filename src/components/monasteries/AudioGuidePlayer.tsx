"use client";

import { MapPin, Pause, Play, RotateCcw, RotateCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toast";
import { formatDuration } from "@/lib/format";

/**
 * Placeholder narration track — a licensed singing-bowl recording stands in
 * until real multilingual narration is recorded (Phase 3, via the admin CMS).
 */
const PLACEHOLDER_AUDIO =
  "https://upload.wikimedia.org/wikipedia/commons/7/70/The_sound_of_a_singing_bowl.wav";

interface AudioGuidePlayerProps {
  siteName: string;
  languages: string[];
}

function clock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function AudioGuidePlayer({ siteName, languages }: AudioGuidePlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [language, setLanguage] = useState(languages[0] ?? "English");
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const audio = new Audio(PLACEHOLDER_AUDIO);
    audioRef.current = audio;
    const onTime = () => setPosition(audio.currentTime);
    const onMeta = () => setDuration(audio.duration || 0);
    const onEnd = () => setPlaying(false);
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("ended", onEnd);
    return () => {
      audio.pause();
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("ended", onEnd);
      audioRef.current = null;
    };
  }, []);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      void audio.play().catch(() => setPlaying(false));
      setPlaying(true);
    }
  };

  const skip = (delta: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.min(Math.max(0, audio.currentTime + delta), duration || 0);
  };

  const scrub = (value: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = value;
    setPosition(value);
  };

  return (
    <div className="rounded-xl border bg-surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-h4 font-semibold">Audio guide</h3>
        <label className="flex items-center gap-2 text-small text-muted">
          Language
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="h-10 rounded-full border border-border-strong bg-surface px-3 text-small"
          >
            {languages.map((lang) => (
              <option key={lang}>{lang}</option>
            ))}
          </select>
        </label>
      </div>

      <p className="mt-4 rounded-lg bg-surface-muted p-3.5 text-small leading-relaxed text-muted">
        “You are now at the main entrance of {siteName}. Notice the guardian
        kings painted either side of the doorway — protectors of the four
        directions…”
        <span className="mt-1.5 block text-caption text-subtle">
          {language} narration · placeholder audio until Phase 3 recordings
        </span>
      </p>

      <div className="mt-4 flex items-center gap-3">
        <Button size="icon" onClick={toggle} aria-label={playing ? "Pause" : "Play"}>
          {playing ? (
            <Pause className="size-4" aria-hidden />
          ) : (
            <Play className="size-4" aria-hidden />
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => skip(-10)}
          aria-label="Back 10 seconds"
        >
          <RotateCcw className="size-4" aria-hidden />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => skip(10)}
          aria-label="Forward 10 seconds"
        >
          <RotateCw className="size-4" aria-hidden />
        </Button>

        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span data-numeric className="font-mono text-caption text-subtle">
            {clock(position)}
          </span>
          <input
            type="range"
            min={0}
            max={duration || 1}
            step={0.1}
            value={position}
            onChange={(e) => scrub(Number(e.target.value))}
            aria-label="Seek"
            className="min-w-0 flex-1 accent-primary"
          />
          <span data-numeric className="font-mono text-caption text-subtle">
            {duration ? clock(duration) : formatDuration(0)}
          </span>
        </div>
      </div>

      <Button
        variant="outline"
        size="sm"
        className="mt-4"
        onClick={() => toast("You're now approaching the Main Prayer Hall", "info")}
      >
        <MapPin className="size-3.5" aria-hidden />
        Simulate GPS trigger
      </Button>
    </div>
  );
}
