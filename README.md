# Ney Heritage

**Digitizing the Sacred Heritage of Sikkim** — *Explore. Experience. Preserve.*

A digital cultural-heritage platform for Sikkim: a sourced archive of the
state's monasteries, an interactive heritage map, narrated audio guides in four
languages, a rule-based trip planner, a directory of registered stays, and a
public preservation dashboard that reports the archive's own coverage and gaps.

---

## The rule this project is built on

> Every factual claim rendered in the product points at an entry in
> [`src/data/sources.ts`](src/data/sources.ts), or it does not ship.

Where a fact is missing, the UI says so — *"Data not available"*, *"Not yet
captured"* — instead of estimating. The gaps are published on purpose;
[`/preservation`](src/app/preservation/page.tsx) exists to show them.

This is a deliberate position, and it cost the project features. An earlier
build shipped invented hotel tariffs, star ratings, guest reviews, synthetic
bookings, a fabricated TSD remittance ledger, invented festival dates and phone
numbers, and European panoramas reused as Sikkim prayer halls. All of it was
deleted rather than relabelled. What remains is smaller and true.

Three consequences you will see in the UI:

- **Stays carry no prices or ratings.** No licensed feed supplies them, so the
  page is a directory that resolves each property to Google Maps and says as
  much.
- **The planner quotes one cost line** — the statutory ₹50 Tourism
  Sustainability Development fee. Accommodation and transport totals are not
  estimated.
- **Monasteries with disputed coordinates are not plotted.** A missing pin beats
  a guessed one, so the map's only input is `mappableMonasteries`.

---

## Stack

Next.js 16.3 (App Router, RSC) · React 19.2 · TypeScript 5.7 · Tailwind CSS 4
· Framer Motion 13 · Leaflet 1.9 · Recharts 3.10 · lucide-react ·
@supabase/supabase-js 2.112

**Type system:** Fraunces (display), Plus Jakarta Sans (UI), IBM Plex Mono
(numerics). Tokenised palette and utilities live in
[`src/app/globals.css`](src/app/globals.css) — petrol/ink surfaces, temple-tank
jade primary, marigold accent, glass surfaces, card-lift and media-zoom
interactions.

---

## Quick start

```bash
npm install
npm run dev          # http://localhost:3000
```

No environment variables are required — the archive ships as typed data in
`src/data`, so the app renders fully offline of any service. Copy
`.env.example` to `.env.local` only if you want the optional Supabase overlay
or plan to run the discovery agents.

### Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build (38 routes, mostly prerendered) |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint 9 + eslint-config-next |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run agent:discover` | Heritage discovery agent → sourced monastery records |
| `npm run agent:360` | 360° panorama finder → availability evidence |
| `npm run agent:audio` | Audio guide agent → narrated `.m4a` guides |
| `npm run agent:gallery` | Gallery agent → evidenced Commons photography per site |
| `npm run agent:report` | Aggregates agent output into one auditable report |
| `npm run qa:gallery` | Audits the galleries — licence, files, and no photograph reused across places |

---

## Routes

| Route | What it is |
| --- | --- |
| `/` | Parallax hero, live stat counters, featured monasteries, interactive heritage map, stories, planner CTA. Revalidates hourly. |
| `/monasteries` | Explorer with debounced search, district / tradition / feature filters, and a grid ⇄ Leaflet map toggle with tradition-coloured markers. |
| `/monasteries/[slug]` | Detail page, statically generated for all 15 sites — history, significance, architecture, provenance badges, audio guide, honest availability panel. |
| `/stories` · `/stories/[slug]` | 12 editorial pieces on Sikkim's monastic history and legend. |
| `/hotels` | "Stays" — a directory of 20 real properties by district. No price, rating or review, by design. |
| `/planner` · `/planner/result` | Preference form → day-by-day itinerary with a route map and a single statutory cost line. |
| `/preservation` · `/preservation/review` | Coverage bars (sourced / mapped / 360° / narrated), a per-site register, verified tourism statistics, and the full source registry. |

Global chrome: scroll-condensing glass Navbar, ⌘K command palette indexing
monasteries + places + stays, muted-by-default ambient audio (two
Commons-licensed layers), toaster, custom 404 and error boundary.

---

## Data layer

Everything the product renders is typed data under [`src/data/`](src/data/).

| File | Contents |
| --- | --- |
| `sources.ts` | Central source registry — 8 sources, each recording what may legitimately be cited from it. Exports the `Provenance` type carried by every record: `sourceId`, `sourceUrl`, `verifiedAt`, `confidence`, optional `caveat`. |
| `monasteries.ts` | 15 monasteries — names, districts, lineages, founding years and history from cited Wikipedia articles. Coordinates only where the article publishes one. |
| `places.ts` | 9 non-monastery heritage and natural sites, each with an article and a published coordinate. No "coming soon" padding. |
| `hotels.ts` | 20-entry stay directory, provenance marked `unverified` with an explicit caveat. |
| `stories.ts` | 12 long-form editorial pieces. |
| `audio.ts` | 60 narrated guides (15 sites × en/hi/ne/bn), plus `BLOCKED_AUDIO_LANGUAGES` — the languages that cannot yet be produced, with the specific blocker for each. |
| `images.ts` | Keyed image registry resolved through `img()`. |
| `generated/` | Raw agent output, committed as an audit trail. |

**Verified statistics** live in [`src/lib/stats.ts`](src/lib/stats.ts): 2025
arrivals of 17,12,360 total / 16,35,650 domestic / 61,710 foreign, with 2024
comparisons. The TSD Fund total is `null` — the fund exists but no collection
figure is published, so the dashboard renders "Data not available" rather than
an estimate.

**The TSD fee** ([`src/lib/booking.ts`](src/lib/booking.ts)) is modelled as the
Government of Sikkim defines it in the Sikkim Registration of Tourist Trade
Rules, 2025: a flat ₹50 per person, one-time, valid one month, collected by
hotels at check-in, with under-5s and government-work visitors exempt. GST is
applied at 12% and labelled an estimate, not a quoted rate.

---

## The agent pipeline

Four offline Node agents in [`scripts/`](scripts/) build and audit the archive.
Their shared constraint is that **no language model composes prose anywhere in
this pipeline** — every published clause is assembled from a verified field on
a record, and a clause is omitted entirely when its field is absent. That is
what makes it structurally impossible for a guide to invent a founder, a date
or a legend the sources do not contain.

- **`heritage-discovery.mjs`** — walks Wikipedia categories and Wikimedia
  Commons, cross-checks fields, scores confidence and stores evidence. Records
  that cannot be corroborated are emitted as candidates for human review, not
  published.
- **`heritage-360-finder.mjs`** — looks for a panorama that genuinely depicts a
  given monastery, via the Street View Static metadata endpoint (the only
  sanctioned availability check). Records an explicit negative result when none
  is found; a negative is a valid answer here.
- **`heritage-audio-agent.mjs`** — produces 60–90 second narrated guides from
  the curated records, composed per language in
  [`audio-scripts.mjs`](scripts/audio-scripts.mjs) rather than translated
  across them. Each guide ships with QA metadata: duration, word count, signal
  peak/RMS/silence/clipping ratios, a language-purity check, the voice and
  engine used, and a `machineGenerated` flag the player discloses.
- **`data-quality-report.mjs`** — aggregates all of the above into one auditable
  file under [`reports/`](reports/).

`export-curated.mjs` keeps the agents reading the *reviewed* records the site
actually publishes, so slugs and facts stay in step with the site.

---

## Supabase (optional)

[`supabase/schema.sql`](supabase/schema.sql) defines two tables —
`monasteries` and `stays` — both with RLS enabled and a public SELECT-only
policy, provenance columns travelling with each row. `seed.sql` upserts on
slug.

[`src/lib/supabase.ts`](src/lib/supabase.ts) returns `null` when unconfigured
and every caller handles it. Supabase is an optional live overlay, never a hard
dependency.

---

## Project structure

```
src/
  app/            Routes (App Router) + globals.css design tokens
  components/     ui/ brand/ layout/ immersive/ maps/ monasteries/
                  planner/ stories/ search/ bookings/
  data/           The archive — typed records + generated/ agent output
  lib/            constants, stats, booking, generate-itinerary, supabase, format, cn
  types/          Domain model
scripts/          Offline discovery, 360°, audio and reporting agents
supabase/         schema.sql + seed.sql
public/audio/     60 narrated guides (15 sites × 4 languages)
reports/          Agent run output, kept as an audit trail
```

---

## Status

`npm run lint`, `npm run typecheck` and `npm run build` all pass clean — 38
routes, 15 monastery pages and 12 story pages prerendered.

**Known limitations**, all surfaced in the UI rather than hidden:

- **No 360° tour is live.** Pannellum is installed and typed, but no monastery
  has a verified capture, so the detail page renders an explicit
  "360° experience not yet available" notice. Restoring tours needs a genuine
  capture programme in Sikkim.
- **Audio guides are machine-narrated and not yet translation-reviewed.** Every
  guide carries `translationReviewed` and `machineGenerated` flags, and the
  player discloses both.
- **Stay records are name-and-district only**, marked `unverified`. Commercial
  detail needs a licensed Places or booking integration.
- **The TSD Fund collection total is unpublished** and therefore rendered as
  unavailable.

---

## Credits

Monastery records and history from Wikipedia. Photography from Wikimedia
Commons under its published licences, credited per image. Coordinates from
Wikipedia and OpenStreetMap. Tourism statistics and the TSD fee structure from
Government of Sikkim reporting and the Sikkim Registration of Tourist Trade
Rules, 2025. Ambient audio from Wikimedia Commons. The full registry, with what
may be cited from each source, is in [`src/data/sources.ts`](src/data/sources.ts)
and rendered at `/preservation`.
