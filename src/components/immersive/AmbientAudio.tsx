"use client";

import { SlidersHorizontal, Volume2, VolumeX } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { cn } from "@/lib/cn";
import { AMBIENT_SOUNDS } from "@/lib/constants";

interface AmbientSource {
  id: string;
  name: string;
  url: string;
  defaultVolume: number;
}

interface AmbientAudioProps {
  sources?: readonly AmbientSource[];
}

const STORAGE_KEY = "ney-ambient";

interface StoredState {
  volumes: Record<string, number>;
}

function readStoredVolumes(): Record<string, number> | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredState).volumes : null;
  } catch {
    return null;
  }
}

/**
 * Floating ambient-sound control. Always starts muted — browsers block
 * autoplay anyway, so restoring "playing" would show a lying toggle. Volume
 * choices persist in localStorage. Audio elements are created lazily on the
 * first enable, so the muted majority downloads nothing.
 */
export function AmbientAudio({ sources = AMBIENT_SOUNDS }: AmbientAudioProps) {
  const [enabled, setEnabled] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  // Lazy init reads localStorage on the client; the panel never renders on
  // the server, so the SSR default can't cause a hydration mismatch.
  const [volumes, setVolumes] = useState<Record<string, number>>(() => {
    const defaults = Object.fromEntries(
      sources.map((s) => [s.id, s.defaultVolume]),
    );
    if (typeof window === "undefined") return defaults;
    return { ...defaults, ...readStoredVolumes() };
  });
  const [failed, setFailed] = useState<Record<string, boolean>>({});
  const players = useRef<Map<string, HTMLAudioElement>>(new Map());

  const persist = useCallback((state: StoredState) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* Private mode — preference simply won't survive the session. */
    }
  }, []);

  const ensurePlayer = useCallback(
    (source: AmbientSource): HTMLAudioElement => {
      let audio = players.current.get(source.id);
      if (!audio) {
        audio = new Audio(source.url);
        audio.loop = true;
        audio.preload = "none";
        audio.onerror = () =>
          setFailed((f) => ({ ...f, [source.id]: true }));
        players.current.set(source.id, audio);
      }
      return audio;
    },
    [],
  );

  const startAll = useCallback(() => {
    for (const source of sources) {
      const audio = ensurePlayer(source);
      audio.volume = volumes[source.id] ?? source.defaultVolume;
      void audio.play().catch(() => {
        setFailed((f) => ({ ...f, [source.id]: true }));
      });
    }
  }, [sources, ensurePlayer, volumes]);

  const stopAll = useCallback(() => {
    for (const audio of players.current.values()) audio.pause();
  }, []);

  const toggle = () => {
    const next = !enabled;
    setEnabled(next);
    if (next) startAll();
    else stopAll();
  };

  const changeVolume = (id: string, volume: number) => {
    const next = { ...volumes, [id]: volume };
    setVolumes(next);
    const audio = players.current.get(id);
    if (audio) audio.volume = volume;
    persist({ volumes: next });
  };

  /* Stop playback if the component unmounts. */
  useEffect(() => {
    const map = players.current;
    return () => {
      for (const audio of map.values()) {
        audio.pause();
        audio.src = "";
      }
    };
  }, []);

  return (
    <div className="fixed right-4 bottom-4 z-50 flex flex-col items-end gap-2">
      {panelOpen ? (
        <div className="w-60 rounded-lg border border-border-inverse bg-surface-inverse/95 p-4 shadow-overlay backdrop-blur">
          <p className="text-eyebrow font-mono tracking-widest text-foreground-inverse/60 uppercase">
            Ambience
          </p>
          {sources.map((source) => (
            <label key={source.id} className="mt-3 block">
              <span className="flex items-center justify-between text-small text-foreground-inverse">
                {source.name}
                {failed[source.id] ? (
                  <span className="text-caption text-foreground-inverse/50">
                    unavailable
                  </span>
                ) : null}
              </span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={volumes[source.id] ?? source.defaultVolume}
                disabled={Boolean(failed[source.id])}
                onChange={(e) => changeVolume(source.id, Number(e.target.value))}
                className="mt-1 w-full accent-accent"
                aria-label={`${source.name} volume`}
              />
            </label>
          ))}
        </div>
      ) : null}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setPanelOpen((open) => !open)}
          aria-expanded={panelOpen}
          aria-label="Ambient sound settings"
          className="flex size-11 items-center justify-center rounded-full border border-border-inverse bg-surface-inverse/90 text-foreground-inverse/80 shadow-card backdrop-blur transition-colors hover:text-foreground-inverse"
        >
          <SlidersHorizontal className="size-4" aria-hidden />
        </button>
        <button
          type="button"
          onClick={toggle}
          aria-pressed={enabled}
          className={cn(
            "flex h-11 items-center gap-2 rounded-full border px-4 text-small font-medium shadow-card backdrop-blur transition-colors",
            enabled
              ? "border-accent bg-surface-inverse/90 text-accent"
              : "border-border-inverse bg-surface-inverse/90 text-foreground-inverse/80 hover:text-foreground-inverse",
          )}
        >
          {enabled ? (
            <Volume2 className="size-4" aria-hidden />
          ) : (
            <VolumeX className="size-4" aria-hidden />
          )}
          {enabled ? "Sound on" : "Immersive sound"}
        </button>
      </div>
    </div>
  );
}
