# Sikkim Darshan

**Digitizing the Sacred Heritage of Sikkim** — *Explore. Experience. Preserve.*

A digital cultural-heritage platform for Sikkim: a sourced archive of 15
monasteries and 38 heritage places, 70 long-form cultural stories, a 26-event
historical timeline, a 77-object digital heritage archive open to community
contribution, narrated audio guides in four languages, an interactive heritage
map, a rule-based trip planner, a directory of registered stays, and a public
preservation dashboard that reports the archive's own coverage and gaps.

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

Next.js 16.3 (App Router, RSC, Turbopack) · React 19.2 · TypeScript 5.7 ·
Tailwind CSS 4 · Framer Motion 13 · Leaflet 1.9 · lucide-react ·
class-variance-authority · clsx · tailwind-merge · @supabase/supabase-js 2.112
Dev/QA: ESLint 9 · @axe-core/cli · Playwright 1.62

Pannellum and Recharts were uninstalled — see [Status](#status) for why the
360° viewer went with them.

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
| `npm run build` | Production build (203 pages, almost all prerendered) |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint 9 + eslint-config-next |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run agent:discover` | Heritage discovery agent → sourced monastery records |
| `npm run agent:360` | 360° panorama finder → availability evidence |
| `npm run agent:audio` | Audio guide agent → narrated `.m4a` guides |
| `npm run agent:gallery` | Gallery agent → evidenced Commons photography per site |
| `npm run agent:report` | Aggregates agent output into one auditable report |
| `npm run qa:audit` | Broad page audit across breakpoints |
| `npm run qa:flows` | Playwright user flows |
| `npm run qa:a11y` | axe-core over 10 representative routes |
| `npm run qa:heritage` | Enforces the sourcing rules mechanically — run after any slug change |
| `npm run qa:gallery` | Audits the galleries — licence, files, and no photograph reused across places |
| `npm run qa:immersive` | Panorama and media viewer checks |
| `npm run qa:stories-map` | Stories archive and explore-map browser flows |

---

## Routes

| Route | What it is |
| --- | --- |
| `/` | Parallax hero, live stat counters, featured monasteries, interactive heritage map, stories, planner CTA. Revalidates hourly. |
| `/monasteries` | Explorer with debounced search, district / tradition / feature filters, and a grid ⇄ Leaflet map toggle with tradition-coloured markers. |
| `/monasteries/[slug]` | Detail page, statically generated for all 15 sites — history, significance, architecture, provenance badges, gallery, audio guide, honest availability panel. |
| `/stories` · `/stories/[slug]` | **70** sourced cultural stories across 19 categories, filterable by category and by community. Each says whether it is documented history, oral tradition or legend. |
| `/history` · `/history/[slug]` | The Story of Sikkim — a 26-event timeline across 6 eras. Every event carries a verification grade: verified, source-backed, oral tradition or unverified. |
| `/archive` · `/archive/[id]` | The NEY Digital Heritage Archive — 77 catalogued objects across 15 categories, each with its licence, its creator, and a flag stating whether the photograph was actually taken in Sikkim. |
| `/archive/contribute` | Community submission. Every record is created `pending-review`; no code path in the app can publish one. |
| `/explore` | Full-screen heritage map of every coordinate-bearing site, grouped into 7 marker families, each carrying the count of stories that reference it. |
| `/hotels` | "Stays" — a directory of 20 real properties by district. No price, rating or review, by design. |
| `/planner` · `/planner/result` | Preference form → day-by-day itinerary with a route map and a single statutory cost line. |
| `/preservation` · `/preservation/review` | Coverage bars (sourced / mapped / 360° / narrated), a per-site register, verified tourism statistics, the full source registry, and the curator's review queue. |

Plus `sitemap.xml`, `robots.txt` and structured data.

Global chrome: scroll-condensing glass Navbar, ⌘K command palette indexing
monasteries + places + stays + stories (built on the server, not shipped to the
client), muted-by-default ambient audio (two Commons-licensed layers), toaster,
custom 404, error and loading states.

---

## Data layer

Everything the product renders is typed data under [`src/data/`](src/data/).

| File | Contents |
| --- | --- |
| `sources.ts` | Central source registry — 19 sources, each recording what may legitimately be cited from it. Exports the `Provenance` type carried by every record: `sourceId`, `sourceUrl`, `verifiedAt`, `confidence`, optional `caveat`. |
| `monasteries.ts` | 15 monasteries — names, districts, lineages, founding years and history from cited articles. Coordinates only where a source publishes one. |
| `places.ts` | 38 non-monastery heritage and natural sites, each with an article and a published coordinate. No "coming soon" padding. |
| `stories/` | 70 stories across 8 category files, plus an index that makes cross-links symmetric and drops any slug that does not resolve. |
| `history.ts` | 26 timeline events over 6 eras, each with sources and a verification grade. Illustrations point at catalogued archive objects, never loose files. |
| `archive.ts` | 77 archive objects from the archive agent, which refuses to emit an item unless the subject's article, a Commons file, and a licence with a named author all resolve. |
| `galleries.ts` · `gallery-rejections.ts` | 53 evidenced site galleries, and the hand-reviewed deny-list of photographs that passed every automated check without depicting their subject. |
| `hotels.ts` | 20-entry stay directory, provenance marked `unverified` with an explicit caveat. |
| `audio.ts` | 60 narrated guides (15 sites × en/hi/ne/bn), plus `BLOCKED_AUDIO_LANGUAGES` — the languages that cannot yet be produced, with the specific blocker for each. |
| `panoramas.ts` | Exactly one verified capture, published as the flat panorama it is and never called a sphere. |
| `map-sites.ts` | One flat, serialisable list of everything `/explore` can plot. |
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

Offline Node agents in [`scripts/`](scripts/) build and audit the archive.
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
- **`heritage-gallery-agent.mjs`** — collects Commons photography on three
  kinds of evidence (a category named for the subject, a title naming it, or
  GPS within metres of it) and drops any candidate missing a licence or a named
  author. Two of those three kinds of evidence fail in ways the agent cannot
  see, which is what [`gallery-rejections.ts`](src/data/gallery-rejections.ts)
  exists to catch — see [Status](#status).
- **`heritage-archive-agent.mjs`** — emits an archive object only when the
  subject's reference article, a Commons file, and a readable licence with an
  author all resolve. It quotes each subject's own lead rather than
  paraphrasing it, so the archive adds no unsourced prose.
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
  components/     ui/ brand/ layout/ immersive/ maps/ monasteries/ history/
                  archive/ explore/ planner/ stories/ search/ media/ home/
                  hotels/ bookings/ seo/
  data/           The archive — typed records, stories/, generated/ agent output
  lib/            constants, stats, booking, generate-itinerary, archive-submissions,
                  search-index, geo, supabase, format, cn
  types/          Domain model
scripts/          Offline discovery, 360°, audio, gallery, archive and reporting
                  agents
scripts/qa/       The integrity harness — npm run qa:*
supabase/         schema.sql + seed.sql
public/           102 MB photography · 54 MB audio (60 guides) · 1 panorama
reports/          Agent and QA run output, kept as an audit trail
.data/            Community submissions awaiting review — gitignored, and
                  deliberately outside public/ so nothing unreviewed is served
```

---

## Status

`npm run lint`, `npm run typecheck` and `npm run build` all pass clean — 203
pages prerendered from 18 route files: 77 archive objects, 70 stories, 26
timeline events and 15 monasteries, plus the static shells. `npm run qa:a11y`
reports zero axe violations across 10 representative routes.

**Known limitations**, all surfaced in the UI rather than hidden:

- **No 360° tour is live, and Pannellum has been uninstalled.** A sweep of 35
  sites established that no openly licensed 360° sphere of any Sikkim monastery
  exists — Commons has no such category for this state at all. Exactly one
  genuine wide capture survived inspection, Rumtek's courtyard, and it is
  published as the flat panorama it is rather than dressed up as a sphere.
  Restoring tours needs a genuine capture programme in Sikkim.
- **A green QA run is not proof the content is right.** `qa:gallery` checked
  licence, authorship, file existence and duplicate use, and passed 11/11 while
  the gallery for a Sikkim town filled with photographs of Normandy — "Soreng"
  had substring-matched a commune in Seine-Maritime, and "Mangan" had matched
  "Manganese". Geo evidence proves where the camera stood, not what it was
  pointed at. The fix was a hand-reviewed deny-list, and `place/soreng` now
  ends with an empty gallery. An empty gallery is a true statement about what
  has been found; four photographs of Normandy are not.
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
