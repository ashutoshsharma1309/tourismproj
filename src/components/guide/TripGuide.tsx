"use client";

import {
  ArrowUpRight,
  Compass,
  MessageCircle,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { destinationIdFromPath } from "@/lib/destinations/nav-path";
import { ALL_INTERESTS, INTEREST_LABEL } from "@/lib/planner/types";
import { useCallback, useEffect, useId, useRef, useState } from "react";

import { cn } from "@/lib/cn";
import { onGuideOpen } from "@/lib/guide-events";
import type { GuideIndex } from "@/lib/guide-index";
import { respond } from "@/lib/guide-respond";
import { sendEvent } from "@/lib/account/client";
import { clearSignedInHint, hasSignedInHint } from "@/lib/account/hint";
import { isNextIntent, personalBlocks, type RecommendationsBody } from "@/lib/personalization/guide";
import type { GuideBlock, GuideChip } from "@/lib/guide-respond";

/**
 * The trip guide.
 *
 * Deliberately NOT a chat model. Every reply comes from `guide-respond.ts`,
 * which retrieves from catalogued records and composes no prose — so the guide
 * cannot invent a founder, a date, a price or an opening time, and says plainly
 * when the archive does not hold something. The disclosure line under the
 * header tells the visitor that up front, because a floating chat bubble in
 * 2026 reads as "AI that might be making this up", and this one isn't.
 *
 * Trip planning is a three-question flow rather than free text. The questions
 * map exactly onto what `/destinations/sikkim/planner/result` accepts, so the guide hands off to
 * the existing rule-based itinerary engine instead of reimplementing it.
 *
 * The knowledge base arrives from /api/guide on first open rather than as a
 * prop. Passing it down from the layout was the first shape this took, and it
 * added ~313 KB of JSON to the HTML of every page for a widget most visitors
 * never open — the same trap `search-index.ts` documents.
 */

interface Turn {
  id: number;
  role: "visitor" | "guide";
  text?: string;
  blocks?: GuideBlock[];
}

type PlanStep = "duration" | "interests" | "style";

/*
 * SIKKIM'S vocabulary, and only Sikkim's. This list — monasteries, lakes,
 * trekking — was offered to a visitor planning Rome, and the planner it fed
 * was hardcoded to /destinations/sikkim/planner/result, so "Plan my trip"
 * on any of fourteen destinations produced an itinerary for Sikkim. Every
 * other destination now plans with the product's own interest vocabulary and
 * routes to its own planner.
 */
const SIKKIM_INTERESTS = ["Monasteries", "Culture", "Lakes", "Food", "Adventure", "Trekking"] as const;
const STYLES = ["Solo", "Couple", "Family", "Group"] as const;
const DURATIONS = [3, 4, 5, 7, 10, 14] as const;

/*
 * The greeting knows where it is. It opened with "Tashi delek" and "the
 * Sikkim archive" on every page of a many-destination product — the AI
 * defaulting to one destination as though it were the product. Inside a
 * destination it names that destination; outside one it names the product.
 */
function opening(
  destinationName: string | null,
  destinationId: string | null,
  destinationCount: number,
): GuideBlock[] {
  const sikkim = destinationId === "sikkim";
  return [
    {
      kind: "text",
      text: destinationName
        ? `Ask me anything about ${destinationName} — its places, history, food, festivals and where to stay. I answer only from verified records, so I have no prices, opening hours or forecasts, and I'll say so rather than guess.`
        : `Ask me about any of ${destinationCount} Indian destinations — their places, history, food, festivals and where to stay. I answer only from verified records, so I have no prices, opening hours or forecasts, and I'll say so rather than guess.`,
    },
    {
      kind: "chips",
      chips: sikkim
        /* Example questions, phrased the way a traveller asks them, so the
           empty panel teaches how the guide works instead of staring back. */
        ? [
            { label: "What should I see in Sikkim?", send: "what should I see" },
            { label: "Which monasteries are near Pelling?", send: "monasteries in Pelling" },
            { label: "Do I need a permit?", send: "permits" },
            { label: "What does it cost to visit?", send: "fees" },
            { label: "Plan my trip", send: "__plan__" },
          ]
        : destinationName
          ? [
              { label: `What should I explore in ${destinationName}?`, send: "what should I see" },
              { label: "What should I explore if I like history?", send: "history" },
              { label: "What local food should I try?", send: "food and festivals" },
              { label: "Where can I stay?", send: "where to stay" },
              { label: "Plan my trip", send: "__plan__" },
            ]
          : [
              { label: "Tell me about Jaipur", send: "Jaipur" },
              { label: "Tell me about Varanasi", send: "Varanasi" },
              { label: "Tell me about Kochi", send: "Kochi" },
              { label: "Which destination fits me?", send: "compare" },
            ],
    },
  ];
}

/*
 * The header line counts what the guide can answer from HERE. It read
 * "Answers from 15 monasteries, 38 places and 70 stories" on every page —
 * Sikkim's numbers, above a question box on Kyoto. Now it counts the
 * destination in scope, from the same records the engine searches.
 */
function scopeLine(
  index: GuideIndex | null,
  destinationId: string | null,
  destinationName: string | null,
): string {
  if (!index) return "Answers only from catalogued records. Nothing invented.";
  if (destinationId === "sikkim") {
    return `Answers from ${index.facts.monasteryCount} monasteries, ${index.facts.placeCount} places and ${index.facts.storyCount} stories. Nothing invented.`;
  }
  if (destinationId && destinationName) {
    const mine = (index.records ?? []).filter((r) => r.destinationId === destinationId);
    const count = (...kinds: string[]) => mine.filter((r) => kinds.includes(r.kind)).length;
    const parts = [
      count("place") > 0 ? `${count("place")} places` : null,
      count("history") > 0 ? `${count("history")} events` : null,
      count("food", "festival", "craft") > 0 ? `${count("food", "festival", "craft")} culture records` : null,
    ].filter(Boolean);
    return parts.length > 0
      ? `Answers from ${destinationName}'s ${parts.join(", ")}. Nothing invented.`
      : `Answers only from ${destinationName}'s catalogued records. Nothing invented.`;
  }
  return `Answers from the catalogued records of ${(index.destinations ?? []).length} Indian destinations. Nothing invented.`;
}

export function TripGuide({
  destinationNames = {},
}: {
  /** id -> display name for every destination. One string each from the
      server, so the registry itself never reaches the client bundle. */
  destinationNames?: Record<string, string>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const destinationId = destinationIdFromPath(pathname ?? "");
  const destinationName = destinationId ? (destinationNames[destinationId] ?? null) : null;
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState<GuideIndex | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [turns, setTurns] = useState<Turn[]>(() => [
    { id: 0, role: "guide", blocks: opening(destinationName, destinationId, Object.keys(destinationNames).length) },
  ]);
  const [draft, setDraft] = useState("");
  const [plan, setPlan] = useState<{
    step: PlanStep;
    duration?: number;
    interests: string[];
  } | null>(null);

  /* The header's "Ask the guide" control and the how-it-works strip open
     the panel through a DOM event (lib/guide-events.ts), so nothing outside
     this component has to hold its state. */
  useEffect(() => onGuideOpen(() => setOpen(true)), []);

  /* Fetch the knowledge base once, the first time the guide is opened. */
  useEffect(() => {
    if (!open || index || loadFailed) return;
    let cancelled = false;
    fetch("/api/guide")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((data: GuideIndex) => {
        if (!cancelled) setIndex(data);
      })
      .catch(() => {
        if (!cancelled) setLoadFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [open, index, loadFailed]);

  const nextId = useRef(1);
  /* One AI_GUIDE_USED per page load; the server also de-duplicates. */
  const guideUseRecorded = useRef(false);
  const scroller = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);

  const push = useCallback((turn: Omit<Turn, "id">) => {
    setTurns((prev) => [...prev, { ...turn, id: nextId.current++ }]);
  }, []);

  /* Keep the newest turn in view. */
  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [turns, plan]);

  /* Escape closes; focus moves to the field on open. */
  useEffect(() => {
    if (!open) return;
    input.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const startPlan = useCallback(() => {
    setPlan({ step: "duration", interests: [] });
    push({
      role: "guide",
      blocks: [
        {
          kind: "text",
          text: destinationName
            ? `How many days do you have in ${destinationName}?`
            : "How many days do you have?",
        },
      ],
    });
  }, [push, destinationName]);

  const ask = useCallback(
    (text: string) => {
      const clean = text.trim();
      if (!clean) return;

      if (clean === "__plan__") {
        push({ role: "visitor", text: "Plan my trip" });
        startPlan();
        return;
      }

      push({ role: "visitor", text: clean });

      /* A signed-in traveller's guide use is history (that it was used, and
         where — never what was asked). The server keeps one per half hour. */
      if (hasSignedInHint() && !guideUseRecorded.current) {
        guideUseRecorded.current = true;
        void sendEvent({ type: "AI_GUIDE_USED", destinationId: destinationId ?? null, entityId: null });
      }

      /* "What should I explore next?" — answered from the traveller's own
         signals when signed in. Facts and reasons come from the account
         recommendations endpoint, which builds them from TerraStory records. */
      if (isNextIntent(clean)) {
        if (hasSignedInHint()) {
          push({ role: "guide", blocks: [{ kind: "note", text: "Checking your interests and what you've explored…" }] });
          void (async () => {
            try {
              const scoped = destinationId ? `?destination=${encodeURIComponent(destinationId)}` : "";
              let response = await fetch(`/api/account/recommendations${scoped}`, { credentials: "same-origin" });
              if (response.status === 401) {
                clearSignedInHint();
                push({ role: "guide", blocks: [{ kind: "text", text: "Log in and I can suggest what to explore next from your interests and history." }, { kind: "link", href: "/login", label: "Log in" }] });
                return;
              }
              let body = (await response.json()) as RecommendationsBody;
              if (destinationId && body.hasSignal && (body.places ?? []).length === 0) {
                response = await fetch("/api/account/recommendations", { credentials: "same-origin" });
                body = (await response.json()) as RecommendationsBody;
                push({ role: "guide", blocks: personalBlocks(body, null) });
                return;
              }
              push({ role: "guide", blocks: personalBlocks(body, destinationId ? destinationName : null) });
            } catch {
              push({ role: "guide", blocks: [{ kind: "note", text: "I couldn't reach your account just now. Try again in a moment." }] });
            }
          })();
          return;
        }
        push({
          role: "guide",
          blocks: [
            { kind: "text", text: "I can suggest destinations from your interests and what you've explored once you log in. Without that, I won't guess what you like." },
            { kind: "link", href: "/login", label: "Log in" },
            { kind: "link", href: "/discover", label: "Or choose interests on For you" },
          ],
        });
        return;
      }

      if (!index) {
        push({
          role: "guide",
          blocks: [
            {
              kind: "note",
              text: loadFailed
                ? "I couldn't load the archive just now. Reload the page and I'll try again."
                : "One moment — I'm still loading the archive.",
            },
          ],
        });
        return;
      }
      /* The page's destination is the default scope: on Varanasi, "temples"
         means Varanasi's temples. A destination named in the question still
         wins, so "tell me about Jaipur" works from anywhere. */
      const reply = respond(clean, index, { destinationId });
      /* The engine can request the guided flow rather than answer in prose. */
      const wantsPlan = reply.blocks.some(
        (b) => b.kind === "chips" && b.chips.some((c) => c.send === "__plan__"),
      );
      push({ role: "guide", blocks: reply.blocks });
      if (wantsPlan && reply.blocks.length <= 2) {
        // The planning intent was unambiguous — don't make them tap again.
        startPlan();
      }
    },
    [index, loadFailed, push, startPlan, destinationId, destinationName],
  );

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    ask(draft);
    setDraft("");
  };

  /* ---------------------------------------------------------- plan handlers */

  /* Which interests to offer: Sikkim's own on Sikkim, the product's
     vocabulary — the same one /plan and /discover use — everywhere else. */
  const interestOptions: readonly string[] =
    destinationId === "sikkim"
      ? SIKKIM_INTERESTS
      : ALL_INTERESTS.map((interest) => INTEREST_LABEL[interest]);

  const chooseDuration = (days: number) => {
    push({ role: "visitor", text: `${days} days` });
    setPlan({ step: "interests", duration: days, interests: [] });
    push({
      role: "guide",
      blocks: [{ kind: "text", text: "What pulls you here? Pick as many as you like." }],
    });
  };

  const toggleInterest = (value: string) => {
    setPlan((p) =>
      p
        ? {
            ...p,
            interests: p.interests.includes(value)
              ? p.interests.filter((i) => i !== value)
              : [...p.interests, value],
          }
        : p,
    );
  };

  const confirmInterests = () => {
    if (!plan || plan.interests.length === 0) return;
    push({ role: "visitor", text: plan.interests.join(", ") });
    setPlan({ ...plan, step: "style" });
    push({ role: "guide", blocks: [{ kind: "text", text: "And who's travelling?" }] });
  };

  const chooseStyle = (style: string) => {
    if (!plan) return;
    push({ role: "visitor", text: style });
    /*
      `budget: "35000"` used to ride along here. Nothing has ever read it — the
      generator does not price anything — and the planner form no longer asks
      for it. `travellers` is what the fee is calculated from, so the party word
      the visitor picked is turned into a headcount rather than left to be
      inferred downstream.
    */
    const headcount: Record<string, number> = { Solo: 1, Couple: 2, Family: 4, Group: 6 };
    const params = new URLSearchParams({
      interests: plan.interests.join(","),
      duration: String(plan.duration ?? 5),
      style,
      travellers: String(headcount[style] ?? 2),
    });
    /* Sikkim keeps its own itinerary engine; every other destination has the
       capsule planner at /plan, which reads days, pace and interests. Global
       (no destination in scope) goes to the product planner. */
    const href =
      destinationId === "sikkim"
        ? `/destinations/sikkim/planner/result?${params.toString()}`
        : destinationId
          ? `/destinations/${destinationId}/plan?${params.toString()}`
          : `/plan?${params.toString()}`;
    setPlan(null);
    push({
      role: "guide",
      blocks: [
        {
          kind: "text",
          text: `${plan.duration} days, ${plan.interests.join(" and ").toLowerCase()}, travelling as ${style.toLowerCase()}. The planner routes that over real geography and keeps the drive times sane.`,
        },
        {
          kind: "note",
          text: `It quotes one cost line — the state's visitor fee. Accommodation and transport aren't estimated, because nothing here has a licensed rates feed.`,
        },
        { kind: "link", href, label: "Open my itinerary" },
      ],
    });
    router.prefetch(href);
  };

  /* ------------------------------------------------------------------ render */

  return (
    <>
      {/*
        THE LAUNCHER IS A CIRCLE, NOT A PILL.

        It was a 48px-tall pill reading "Ask the guide" — the widest floating
        element on the page, and on a phone it lay across the last card's
        actions. A circle says "control" without claiming a strip of the
        viewport, and its label lives in `aria-label` + `title` (the native
        tooltip) rather than in the layout. `bottom`/`right` include the
        safe-area inset so it clears a home indicator; the diameter drops on
        small screens for the same reason.
      */}
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-expanded={false}
          aria-controls={panelId}
          aria-label="Ask the guide"
          title="Ask the guide"
          className="fixed right-[max(1rem,env(safe-area-inset-right))] bottom-[max(1rem,env(safe-area-inset-bottom))] z-50 flex size-12 items-center justify-center gap-2 rounded-full border border-accent/50 bg-surface-inverse/95 text-accent shadow-overlay backdrop-blur transition-[transform,border-color,color] hover:border-accent hover:text-foreground-inverse motion-safe:hover:scale-105 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface focus-visible:outline-none sm:h-12 sm:w-auto sm:px-4"
        >
          <Compass className="size-5" aria-hidden />
          {/* A circle on a phone, where it must not claim a strip of the
              viewport; a labelled pill on wider screens, where a newcomer
              could not tell what the circle was for. */}
          <span className="sr-only sm:not-sr-only sm:text-small sm:font-medium">Ask the guide</span>
        </button>
      ) : null}

      {open ? (
        <div
          id={panelId}
          role="dialog"
          aria-modal="false"
          aria-label="Trip guide"
          className="fixed inset-x-3 bottom-3 z-50 flex max-h-[min(34rem,calc(100dvh-5rem))] flex-col overflow-hidden rounded-xl border border-border-inverse bg-surface-inverse/97 shadow-overlay backdrop-blur sm:inset-x-auto sm:right-4 sm:bottom-4 sm:w-[24rem]"
        >
          {/* ---------------------------------------------------- header */}
          <div className="flex items-start justify-between gap-3 border-b border-border-inverse px-4 py-3">
            <div className="min-w-0">
              <p className="flex items-center gap-2 font-display text-body text-foreground-inverse">
                <Compass className="size-4 shrink-0 text-accent" aria-hidden />
                {destinationName ? `Ask about ${destinationName}` : "Ask about any destination"}
              </p>
              {/*
                This line is not decoration. A floating chat bubble is read as a
                generative assistant, and this one is the opposite — it can only
                repeat catalogued records. Saying so is what stops a visitor
                trusting it for the things it deliberately refuses to answer.
              */}
              <p className="mt-0.5 text-caption leading-snug text-foreground-inverse/55">
                {scopeLine(index, destinationId, destinationName)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close the trip guide"
              className="-mr-2 -mt-2 flex size-11 shrink-0 items-center justify-center rounded-full text-foreground-inverse/60 transition-colors hover:bg-white/5 hover:text-foreground-inverse"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>

          {/* ------------------------------------------------ transcript */}
          <div
            ref={scroller}
            className="flex-1 space-y-3 overflow-y-auto px-4 py-4"
            aria-live="polite"
          >
            {turns.map((turn) =>
              turn.role === "visitor" ? (
                <p
                  key={turn.id}
                  className="ml-auto w-fit max-w-[85%] rounded-lg rounded-br-sm bg-accent/15 px-3 py-2 text-small text-foreground-inverse"
                >
                  {turn.text}
                </p>
              ) : (
                <div key={turn.id} className="space-y-2">
                  {turn.blocks?.map((block, i) => (
                    <GuideBlockView key={i} block={block} onChip={ask} />
                  ))}
                </div>
              ),
            )}

            {/* ------------------------------------------- guided flow */}
            {plan?.step === "duration" ? (
              <Choices
                options={DURATIONS.map((d) => ({ label: `${d} days`, value: String(d) }))}
                onPick={(v) => chooseDuration(Number(v))}
              />
            ) : null}

            {plan?.step === "interests" ? (
              <div className="space-y-2">
                <div className="flex flex-wrap gap-1.5">
                  {interestOptions.map((i) => {
                    const active = plan.interests.includes(i);
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => toggleInterest(i)}
                        aria-pressed={active}
                        className={cn(
                          "rounded-full border px-3 py-1.5 text-caption transition-colors",
                          active
                            ? "border-accent bg-accent/20 text-accent"
                            : "border-border-inverse text-foreground-inverse/70 hover:text-foreground-inverse",
                        )}
                      >
                        {i}
                      </button>
                    );
                  })}
                </div>
                <button
                  type="button"
                  onClick={confirmInterests}
                  disabled={plan.interests.length === 0}
                  className="flex items-center gap-1.5 rounded-full bg-accent px-3.5 py-1.5 text-caption font-medium text-surface-inverse transition-opacity disabled:opacity-40"
                >
                  <Sparkles className="size-3.5" aria-hidden />
                  Continue
                </button>
              </div>
            ) : null}

            {plan?.step === "style" ? (
              <Choices
                options={STYLES.map((s) => ({ label: s, value: s }))}
                onPick={chooseStyle}
              />
            ) : null}
          </div>

          {/* -------------------------------------------------- composer */}
          <form
            onSubmit={submit}
            className="flex items-center gap-2 border-t border-border-inverse px-3 py-2.5"
          >
            <MessageCircle
              className="size-4 shrink-0 text-foreground-inverse/40"
              aria-hidden
            />
            <input
              ref={input}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={
                destinationId === "sikkim"
                  ? "Ask about a monastery, a permit, a route…"
                  : destinationName
                    ? `Ask about a place, a festival, the history of ${destinationName}…`
                    : "Ask about a destination or a landmark…"
              }
              aria-label="Ask the trip guide"
              className="min-w-0 flex-1 bg-transparent text-small text-foreground-inverse placeholder:text-foreground-inverse/35 focus:outline-none"
            />
            <button
              type="submit"
              disabled={!draft.trim()}
              aria-label="Send"
              className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-surface-inverse transition-opacity disabled:opacity-30"
            >
              <Send className="size-3.5" aria-hidden />
            </button>
          </form>
        </div>
      ) : null}
    </>
  );
}

/* ------------------------------------------------------------- sub-components */

function Choices({
  options,
  onPick,
}: {
  options: { label: string; value: string }[];
  onPick: (value: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onPick(o.value)}
          className="rounded-full border border-border-inverse px-3 py-1.5 text-caption text-foreground-inverse/75 transition-colors hover:border-accent hover:text-accent"
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function GuideBlockView({
  block,
  onChip,
}: {
  block: GuideBlock;
  onChip: (send: string) => void;
}) {
  switch (block.kind) {
    case "text":
      return (
        <p className="text-small leading-relaxed text-foreground-inverse/90">{block.text}</p>
      );

    case "note":
      return (
        <p className="border-l-2 border-accent/40 pl-2.5 text-caption leading-relaxed text-foreground-inverse/55">
          {block.text}
        </p>
      );

    case "items":
      return (
        <ul className="space-y-1.5">
          {block.items.map((item) => {
            const inner = (
              <>
                <span className="flex items-start justify-between gap-2">
                  <span className="text-small font-medium text-foreground-inverse">
                    {item.title}
                  </span>
                  <ArrowUpRight
                    className="mt-0.5 size-3.5 shrink-0 text-foreground-inverse/40"
                    aria-hidden
                  />
                </span>
                <span className="mt-0.5 block font-mono text-[0.6875rem] tracking-wide text-accent/80">
                  {item.meta}
                </span>
                {item.blurb ? (
                  <span className="mt-1 block line-clamp-2 text-caption leading-snug text-foreground-inverse/55">
                    {item.blurb}
                  </span>
                ) : null}
              </>
            );
            const cls =
              "block rounded-lg border border-border-inverse/70 px-3 py-2 transition-colors hover:border-accent/50 hover:bg-white/[0.03]";
            return (
              <li key={item.href + item.title}>
                {item.external ? (
                  <a href={item.href} target="_blank" rel="noopener noreferrer" className={cls}>
                    {inner}
                  </a>
                ) : (
                  <Link href={item.href} className={cls}>
                    {inner}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      );

    case "link":
      return (
        <Link
          href={block.href}
          className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3.5 py-1.5 text-caption font-medium text-surface-inverse transition-opacity hover:opacity-90"
        >
          {block.label}
          <ArrowUpRight className="size-3.5" aria-hidden />
        </Link>
      );

    case "chips":
      return (
        <div className="flex flex-wrap gap-1.5 pt-0.5">
          {block.chips.map((chip: GuideChip) => (
            <button
              key={chip.send}
              type="button"
              onClick={() => onChip(chip.send)}
              className="rounded-full border border-border-inverse px-3 py-1.5 text-caption text-foreground-inverse/70 transition-colors hover:border-accent hover:text-accent"
            >
              {chip.label}
            </button>
          ))}
        </div>
      );
  }
}
