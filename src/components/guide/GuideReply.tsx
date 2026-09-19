"use client";

import { ArrowUpRight, Check, CloudSun, ExternalLink, Map as MapIcon, Navigation, Plus, Route } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import type { AssistantReply } from "@/lib/assistant/types";
import { formatDistanceKm } from "@/lib/geo";
import { useJourney } from "@/lib/journey/JourneyProvider";
import { cn } from "@/lib/cn";

import { GuideMap } from "./GuideMap";
import { GuideSpeech } from "./GuideSpeech";

/**
 * One answer from the TerraStory Guide, drawn from its validated shape.
 *
 * Only fields the schema allows are rendered, as text: there is no HTML from
 * the server and none from the model. Road distance and straight-line
 * distance are labelled as what they are. "Add to my journey" changes the
 * traveller's journey only when they press it.
 */

const minutes = (m: number) => (m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m} min`);

export function GuideReply({
  reply,
  onAsk,
  speech,
}: {
  reply: AssistantReply;
  onAsk: (question: string) => void;
  speech: { languageLabel: string; speechTag: string; serverSpeech: boolean };
}) {
  const journey = useJourney();
  const [showMap, setShowMap] = useState(false);
  const [showSources, setShowSources] = useState(false);
  const suggestion = reply.journeySuggestion;
  const suggestionSaved = suggestion?.recordId ? journey.hasPlace(suggestion.recordId) : suggestion ? journey.isSelected(suggestion.destinationId) : false;

  const mapPoints = [
    ...(reply.route
      ? [
          { id: `from:${reply.route.from.recordId ?? "you"}`, name: reply.route.from.name, coords: reply.route.from.coords },
          { id: `to:${reply.route.to.recordId ?? "target"}`, name: reply.route.to.name, coords: reply.route.to.coords, emphasis: true },
        ]
      : []),
    ...reply.places.filter((p) => p.coords).map((p) => ({ id: p.recordId, name: p.name, coords: p.coords!, href: p.href })),
    ...(reply.itinerary ?? []).map((s) => {
      const place = reply.places.find((p) => p.recordId === s.recordId);
      return place?.coords ? { id: s.recordId, name: s.name, coords: place.coords, href: s.href } : null;
    }).filter((p): p is NonNullable<typeof p> => p !== null),
  ];
  const uniquePoints = mapPoints.filter((p, i) => mapPoints.findIndex((q) => q.id === p.id) === i).slice(0, 12);

  return (
    <article className="space-y-2.5" aria-label="Guide answer" data-reply-intent={reply.intent} data-answered-by={reply.answeredBy} lang={reply.language}>
      <div className="space-y-1.5 text-small leading-relaxed text-foreground-inverse/90">
        {reply.message.split(/\n{2,}/).map((paragraph, i) => (
          <p key={i} className="whitespace-pre-line">{paragraph}</p>
        ))}
      </div>

      {reply.route ? (
        <div className="rounded-lg border border-border-inverse/70 p-3" data-route>
          <p className="flex items-center gap-1.5 text-caption font-medium text-foreground-inverse">
            <Route className="size-3.5 text-accent" aria-hidden />
            {reply.route.from.name} → {reply.route.to.name}
          </p>
          <dl className="mt-2 grid grid-cols-2 gap-2 text-caption">
            <div>
              <dt className="text-foreground-inverse/50">By road</dt>
              <dd className="font-mono text-foreground-inverse" data-numeric>
                {reply.route.road ? `${formatDistanceKm(reply.route.road.distanceKm)} · ${minutes(reply.route.road.durationMinutes)}` : "Not available"}
              </dd>
            </div>
            <div>
              <dt className="text-foreground-inverse/50">Straight line</dt>
              <dd className="font-mono text-foreground-inverse" data-numeric>{formatDistanceKm(reply.route.straightLineKm)}</dd>
            </div>
          </dl>
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" onClick={() => setShowMap((v) => !v)} aria-expanded={showMap} className="inline-flex items-center gap-1.5 rounded-full border border-border-inverse px-3 py-1.5 text-caption text-foreground-inverse/80 hover:border-accent hover:text-accent">
              <MapIcon className="size-3.5" aria-hidden />
              {showMap ? "Hide route" : "View route"}
            </button>
            <a
              href={`https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${reply.route.from.coords.lat},${reply.route.from.coords.lng};${reply.route.to.coords.lat},${reply.route.to.coords.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border border-border-inverse px-3 py-1.5 text-caption text-foreground-inverse/80 hover:border-accent hover:text-accent"
            >
              <Navigation className="size-3.5" aria-hidden />
              Directions
            </a>
          </div>
        </div>
      ) : null}

      {reply.itinerary && reply.itinerary.length > 0 ? (
        <ol className="space-y-1.5" data-itinerary>
          {reply.itinerary.map((stop, i) => (
            <li key={stop.recordId} className="rounded-lg border border-border-inverse/70 px-3 py-2">
              <Link href={stop.href} className="flex items-start justify-between gap-2 text-small font-medium text-foreground-inverse hover:text-accent">
                <span>{i + 1}. {stop.name}</span>
                <ArrowUpRight className="mt-0.5 size-3.5 shrink-0 opacity-50" aria-hidden />
              </Link>
              <p className="font-mono text-[0.6875rem] text-accent/80" data-numeric>
                {stop.legRoadMinutes !== null ? `${minutes(stop.legRoadMinutes)} by road` : `${formatDistanceKm(stop.legKm ?? 0)} straight line`}
              </p>
            </li>
          ))}
        </ol>
      ) : null}

      {reply.places.length > 0 && !reply.itinerary ? (
        <ul className="space-y-1.5" data-places>
          {reply.places.slice(0, 6).map((place) => (
            <li key={place.recordId}>
              <Link href={place.href} className="block rounded-lg border border-border-inverse/70 px-3 py-2 transition-colors hover:border-accent/50 hover:bg-white/[0.03]">
                <span className="flex items-start justify-between gap-2">
                  <span className="text-small font-medium text-foreground-inverse">{place.name}</span>
                  <ArrowUpRight className="mt-0.5 size-3.5 shrink-0 text-foreground-inverse/40" aria-hidden />
                </span>
                <span className="mt-0.5 block font-mono text-[0.6875rem] tracking-wide text-accent/80" data-numeric>
                  {[
                    place.category,
                    place.distanceKm === null ? null : place.distanceKm < 0.25 ? "You're here" : `${formatDistanceKm(place.distanceKm)} straight line`,
                  ].filter(Boolean).join(" · ")}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}

      {(showMap || (!reply.route && uniquePoints.length > 1)) && uniquePoints.length > 0 ? (
        <GuideMap points={uniquePoints} route={showMap ? reply.route?.geometry ?? null : null} label={`Map for: ${reply.message.slice(0, 80)}`} />
      ) : null}

      {reply.weather ? (
        <p className="flex items-center gap-1.5 text-caption text-foreground-inverse/70" data-weather>
          <CloudSun className="size-3.5 text-accent" aria-hidden />
          {reply.weather.placeName}: {reply.weather.summary}
          {reply.weather.temperatureC !== null ? `, ${Math.round(reply.weather.temperatureC)}°C` : ""}
        </p>
      ) : null}

      {reply.audioGuide ? (
        <div className="space-y-1.5 rounded-lg border border-border-inverse/70 p-3" data-audio-guide>
          <p className="text-caption font-medium text-foreground-inverse">
            Recorded guide: {reply.audioGuide.placeName} ({reply.audioGuide.languageLabel})
          </p>
          <audio controls preload="none" src={reply.audioGuide.url} className="w-full" lang={reply.audioGuide.language}>
            <track kind="captions" />
          </audio>
          <details className="text-caption text-foreground-inverse/70">
            <summary className="cursor-pointer text-foreground-inverse/80">Transcript</summary>
            <p className="mt-1 max-h-48 overflow-y-auto whitespace-pre-line leading-relaxed" lang={reply.audioGuide.language}>{reply.audioGuide.transcript}</p>
          </details>
        </div>
      ) : null}

      {reply.notices.length > 0 ? (
        <ul className="space-y-1" data-notices>
          {reply.notices.map((notice) => (
            <li key={notice} className="border-l-2 border-accent/40 pl-2.5 text-caption leading-relaxed text-foreground-inverse/55">{notice}</li>
          ))}
        </ul>
      ) : null}

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        {reply.speech ? (
          <GuideSpeech text={reply.speech} language={reply.language} languageLabel={speech.languageLabel} speechTag={speech.speechTag} serverSpeech={speech.serverSpeech} />
        ) : null}
        {reply.citations.length > 0 ? (
          <button type="button" onClick={() => setShowSources((v) => !v)} aria-expanded={showSources} className="text-caption text-foreground-inverse/60 underline-offset-2 hover:text-accent hover:underline">
            {showSources ? "Hide sources" : `Sources (${reply.citations.length})`}
          </button>
        ) : null}
        <span className="text-[0.6875rem] text-foreground-inverse/40">
          {reply.answeredBy === "model" ? "Worded by AI from TerraStory's records" : "From TerraStory's records"}
        </span>
      </div>

      {showSources ? (
        <ul className="space-y-1 rounded-lg border border-border-inverse/70 p-2.5" data-sources>
          {reply.citations.map((citation) => (
            <li key={citation.recordId} className="text-caption leading-snug">
              <Link href={citation.href} className="text-foreground-inverse hover:text-accent">{citation.label}</Link>
              {citation.sourceUrl ? (
                <>
                  {" — "}
                  <a href={citation.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-foreground-inverse/60 hover:text-accent">
                    {citation.sourceName ?? "Source"}
                    <ExternalLink className="size-3" aria-hidden />
                  </a>
                </>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      {suggestion ? (
        <button
          type="button"
          disabled={suggestionSaved}
          onClick={() => (suggestion.recordId ? journey.addPlace(suggestion.recordId) : journey.toggle(suggestion.destinationId))}
          data-journey-add={suggestion.recordId ?? suggestion.destinationId}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-caption font-medium transition-opacity",
            suggestionSaved ? "bg-white/10 text-foreground-inverse/70" : "bg-accent text-surface-inverse hover:opacity-90",
          )}
        >
          {suggestionSaved ? <Check className="size-3.5" aria-hidden /> : <Plus className="size-3.5" aria-hidden />}
          {suggestionSaved ? "In your journey" : suggestion.label}
        </button>
      ) : null}

      {reply.suggestions.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 pt-0.5">
          {reply.suggestions.map((s) => (
            <button key={s} type="button" onClick={() => onAsk(s)} className="rounded-full border border-border-inverse px-3 py-1.5 text-caption text-foreground-inverse/70 transition-colors hover:border-accent hover:text-accent">
              {s}
            </button>
          ))}
        </div>
      ) : null}
    </article>
  );
}
