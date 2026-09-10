# TerraStory

**A tourism intelligence platform that publishes what it can prove — and says so
when it cannot.**

*TerraStory is the platform. **Sikkim Darshan** is the deep archive it was built
around, and keeps that name on its own pages.*

Smart India Hackathon 2026 · Problem Statement **26202** · Theme *Travel & Tourism* ·
Category *Software* · AICTE, MIC-Student Innovation

> *"A solution/idea that can boost the current situation of the tourism industries
> including hotels, travel and others."*

Every number in this document was measured against this repository on **2026-08-28**
(Phase 22, the final freeze).
Nothing here is estimated. Where a figure is zero, it is printed as zero.
The commands that reproduce each one are in [§12](#12--how-to-verify-every-number-here).

---

## 1 · The problem, and how we read it

Three words in the statement carry the whole thing.

| Word | What it means | What it rules out |
| --- | --- | --- |
| **"industries"** | Plural, and *industries* — not *tourists*. The **supply side**: the businesses that constitute tourism. | Reading this as a purely tourist-facing brief |
| **"boost"** | A change verb. Something must be measurably better afterwards. | Shipping a brochure and calling it a boost |
| **"the current situation"** | The state of things **now**, with evidence. | Generic tourism promotion |

**"Boost the current situation" is the load-bearing phrase, and the one most entries
will fail.** You cannot claim to have improved a situation you cannot first *state*.
So the organising question is not *"what could we build for tourists?"* but:

> **What is the actual, present, measurable condition of the tourism trade — and who
> is in a position to say?**

The statement then names its scope explicitly: **hotels**, **travel**, and **others**.
The Sikkim Registration of Tourist Trade Act defines a *"tourism entity"* in almost the
same breath — §2 lists *"hotels, resorts, spa… **homestays**, holiday homes… **travel
agents, tour operators, tour guides**, logistic service providers, dealers in tourist
merchandize, adventure sports operator, farm based tourism service providers…"*

That is the problem statement, enumerated in statute.

*Full derivation: [`docs/current-problem-statement.md`](docs/current-problem-statement.md).*

---

## 2 · The finding

**The Government of Sikkim already registers, vets and publishes its entire tourism
industry. That data is, in practice, unreadable.**

The Tourism & Civil Aviation Department publishes both registers in full — as
paginated tables inside an Angular bundle with no JSON API. Seventy-five pages for the
travel agents alone. No search. No district filter. `curl` returns an app shell. So we
rendered the pages and read the DOM, which is the only way to get the data out.

What came out:

| | Hotels | Travel agencies |
| --- | ---: | ---: |
| Entries on the register | **905** (dept. reports 907) | **1,858** (matches dept. total) |
| Carrying a grade from the state | 22 | 70 |
| Carrying **no** grade | **883** | **1,788** |
| Past their printed validity date | **817 of 897** (91.1%) | **1,747 of 1,850** (94.4%) |
| Reachable — telephone on the register | 795 | 1,706 |
| Email on the register | — | 1,139 |

**2,763 licensed businesses. 2,564 entries past their printed validity date.
2,671 carrying no grade at all. Not one of them searchable.**

### 2.1 · The dispersal gap

Cross-referencing those registers against this project's 53 sourced heritage sites —
two government datasets that nobody currently publishes together:

| District | Heritage sites | % heritage | Hotels | % hotels | Agencies | % agencies | Index |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| **Gangtok** | 14 | 26.4% | **675** | **74.6%** | **1,547** | **83.3%** | **2.82** |
| **Mangan** | 13 | **24.5%** | **20** | **2.2%** | **17** | **0.9%** | **0.09** |
| Gyalshing | 10 | 18.9% | 102 | 11.3% | 127 | 6.8% | 0.60 |
| Namchi | 9 | 17.0% | 51 | 5.6% | 93 | 5.0% | 0.33 |
| Soreng | 4 | 7.5% | 10 | 1.1% | 34 | 1.8% | 0.15 |
| Pakyong | 3 | 5.7% | 47 | 5.2% | 40 | 2.2% | 0.92 |
| **Total** | **53** | | **905** | | **1,858** | | |

**Sikkim's heritage is distributed. Its tourism industry is not.** Heritage runs
26 / 25 / 19 / 17 / 8 / 6 percent across six districts. Registered accommodation runs
**75 / 2 / 11 / 6 / 1 / 5**. Mangan holds very nearly as much catalogued heritage as
Gangtok and about a thirty-fourth of its registered hotel supply.

**The index** is share of registered hotels ÷ share of catalogued heritage. 1.00 means
parity. It is a ratio of two shares — *not a score, not a ranking, not a
recommendation.*

### 2.2 · Why this is worth publishing

Because nobody else has. Our research established a hard negative:

> **No count of renewals, de-registrations, inspections, fines or compliance rates
> appears in any Government of Sikkim publication, press release, assembly answer or
> news report we could locate.** The department publishes the register; it publishes
> no statistic about how the register is maintained.

Which makes the 91% and 94% figures, as far as we can establish, **the only
quantitative statement about renewal compliance in Sikkim's tourist trade that exists
in public.**

---

## 3 · The rule this project is built on

> **Every factual claim rendered in the product points at an entry in
> [`src/data/sources.ts`](src/data/sources.ts) — 29 registered sources — or it does
> not ship.**

Where a fact is missing, the UI says so — *"Data not available"*, *"Not yet
captured"* — instead of estimating. The gaps are published on purpose;
[`/preservation`](src/app/preservation/page.tsx) exists to show them.

This is a deliberate position, and it cost the project features. An earlier build
shipped invented hotel tariffs, star ratings, guest reviews, synthetic bookings, a
fabricated TSD remittance ledger, invented festival dates and phone numbers, and
European panoramas reused as Sikkim prayer halls. **All of it was deleted rather than
relabelled.** What remains is smaller and true.

Four consequences you will see in the UI:

- **Stays carry no prices or ratings.** No licensed feed supplies them.
- **The planner quotes one cost line** — the statutory ₹50 Tourism Sustainability
  Development fee. Accommodation and transport totals are not estimated.
- **Monasteries with disputed coordinates are not plotted.** A missing pin beats a
  guessed one.
- **A past licence date is a fact about the register, never about the business.**

### 3.1 · Honesty enforced mechanically, not by good intentions

The trade registers are the first data here that is *about named businesses with
published telephone numbers*, and that changes what a mistake costs. A wrong founding
year on a monastery is an error. A wrong licence state against a named hotel is closer
to a defamation.

So three rules are enforced by [`npm run qa:industry`](scripts/qa/industry-integrity.mjs),
which fails the build:

1. **No visitor-facing string may call a business *unlicensed*, *illegal*, *closed
   down* or *untrustworthy*.** The harness scans the rendering layer for those words.
   *It caught our own disclaimer copy once — we rewrote the sentence rather than
   weaken the check.*
2. **An absent grade never renders as a bad grade.** 2,671 of 2,763 entries carry no
   grade; the register states none, and the UI shows none.
3. **Licence currency is assessed against the date the register was read, not against
   today** — because "today" silently assumes the register has not changed since, and
   would make a prerendered page's content depend on when the build ran. The harness
   fails if `new Date()` appears in that code path.

### 3.2 · The caveats travel with the numbers

In the product, not in a footnote:

- **Expired ≠ closed.** A register is not necessarily rewritten on renewal.
- **The heritage denominator is *our* 53 catalogued sites**, not an inventory of
  Sikkim — no such public inventory exists.
- **Thin supply ≠ neglect.** Mangan is North Sikkim, where the October 2023 South
  Lhonak glacial-lake outburst destroyed thirteen bridges and much of the connectivity
  infrastructure along the Teesta. A gap may record damage rather than an opening.
- **We could not verify how long a Sikkim registration lasts.** §8(2) of the Act defers
  it to the 2025 Rules, whose text is not published anywhere public. So the product
  makes no claim about it and uses only the per-row date the register prints.

---

## 4 · Features

### 4.1 · The tourism trade — `/industry`

The supply-side surface, and the direct answer to PS 26202.

| Feature | Detail |
| --- | --- |
| **Licensed-operator directory** | All **2,763** establishments — 905 hotels + 1,858 agencies — searchable by name, district or registration number, filterable by type, district and registration status. Ordered by district then name; **nothing is ranked**. |
| **Licence currency** | Every entry carries *Registration current* / *Registration date passed* / *No date printed*, phrased about the register entry. |
| **Capacity table** | Heritage share against registered-supply share, per district. Server-rendered — it is in the HTML whether or not JavaScript runs. |
| **Permit routing** | The department routes **Nathula, Tsomgo, Singalila, Green Lake and Maenam** permits *through a registered travel agency*. Derived from the permit records, not hardcoded — if the department changes a route, the page changes with it. |
| **Performance** | **375 KB** — lighter than `/hotels` (411 KB), `/monasteries` (416 KB) and `/preservation` (513 KB) despite carrying 2,763 records, because the index is fetched on demand from a static route rather than inlined. |

**Why the agency register is load-bearing rather than decorative:** for Nathula, a
domestic tourist *cannot* obtain the permit except through a registered agency. Every
foreign tourist's PAP for Tsomgo, Thangu–Chopta and the trekking routes must go through
a department-registered agent. A tourist engaging an unregistered operator for those
destinations is buying a permit application that cannot legally be filed — and until
now had no searchable way to check. *(The requirement is destination- and
nationality-specific, and the page does not flatten that into a blanket rule.)*

### 4.2 · Heritage — the Sikkim archive

| Surface | What it holds |
| --- | --- |
| `/monasteries` · `/monasteries/[slug]` | **15** monasteries with history, significance, architecture, provenance badges, gallery, audio guide and an honest availability panel. Debounced search, district/tradition/feature filters, grid ⇄ Leaflet map toggle. |
| `/places/[slug]` | **38** non-monastery heritage and natural sites, each with an article and a published coordinate. No "coming soon" padding. |
| `/stories` · `/stories/[slug]` | **70** sourced cultural stories across 19 categories, filterable by category and community. Each says whether it is documented history, oral tradition or legend. |
| `/history` · `/history/[slug]` | **26**-event timeline across 6 eras. Every event carries a verification grade: verified, source-backed, oral tradition or unverified. |
| `/archive` · `/archive/[id]` | **77** catalogued objects across 15 categories, each with its licence, its creator, and a flag stating whether the photograph was actually taken in Sikkim. |
| `/archive/contribute` | Community submission. Every record is created `pending-review`; **no code path in the app can publish one.** |
| `/explore` | Full-screen heritage map of every coordinate-bearing site, in 7 marker families, each carrying the count of stories that reference it. |
| `/culture` | **50** curated culture videos across 9 categories, from institutional and official channels where available. |
| `/preservation` | Coverage bars, a per-site register, verified tourism statistics, the full source registry, and the curator's review queue. |

### 4.3 · Multilingual audio — 180 guides, 12 languages

**15 sites × 12 languages = 180 narrated guides.** Regional first
(English, Hindi, Bengali, Nepali), then international (Japanese, Korean, Chinese,
Arabic, Russian, German, French, Spanish).

Each guide ships with QA metadata the player discloses: duration, word count, signal
peak/RMS/silence/clipping ratios, a language-purity check, the voice and engine used,
and a `machineGenerated` flag.

**Four languages are documented as *blocked*, with the specific blocker:**

| Language | Why it cannot be produced |
| --- | --- |
| **Bhutia (Sikkimese)** | An official language of Sikkim with **no speech voice in any engine on earth** |
| **Lepcha** | The language of Sikkim's earliest inhabitants. No TTS engine supports it; its script has no synthesis support |
| **Assamese** | No voice in macOS speech or Piper's 50 languages |
| **Dzongkha** | No voice available, and no Dzongkha speaker to review a translation about Buddhist practice |

*Publishing that gap is the point: the languages of the people whose heritage this is
cannot currently be spoken by a machine at all.*

### 4.4 · Travel and planning

| Surface | What it does |
| --- | --- |
| `/planner` · `/planner/result` | Preference form → day-by-day itinerary with a route map and **one** cost line: the statutory ₹50 TSD fee, with under-5s and government-work visitors exempted exactly as the rules define. Headcount is **counted, not inferred** from travel style. |
| `/permits` | PAP/RAP rules, per-destination issuing authority, documents required, and how it differs for foreign nationals. |
| `/hotels` | **22** state-graded properties that can be shown in their own photographs. The 905-entry register sits behind it as the reference layer. No tariff, rating or review. |
| `/responsible` | The department's own 64 do/don't guidelines. |

### 4.5 · The trip guide — retrieval, not generation

A grounded assistant with **no language model in it and no network call**. Pure,
synchronous, deterministic: the same question always produces the same answer, because
the answer is **retrieved rather than written**.

- It **may** say *"Pemayangtse, founded 1705, Nyingma, Gyalshing district"* — each of
  those four values is a field on a record that cites its source.
- It **may** say *"three monasteries in Gyalshing"* — that is a count.
- It **may not** say *"Pemayangtse is best visited in the morning"* — no record holds
  that, and **there is no code path that could produce it.**

When nothing matches, it says so and offers what it does hold. `openQuestions` lists
the things visitors reasonably ask that this archive genuinely cannot answer — opening
hours, festival dates, room rates, weather — each with the reason.

**This is a better answer to "AI hallucinates" than a chatbot is.** It is structurally
incapable of inventing a founder, a date or a price.

### 4.6 · Multi-destination — `/destinations` and `/review`

The architecture holds **15 destinations across 6 countries**, so "add Kyoto" is a
data task rather than a compile error. Each carries a **depth**, rendered to the
visitor *before* they click:

| Depth | Meaning | Currently |
| --- | --- | --- |
| **Deep archive** | Human-curated, source-registry-backed, QA-enforced | **Sikkim** — 15 monasteries, 70 stories, 26 timeline events, 38 places, 78 archive records |
| **Curated** | Human-reviewed, narrower coverage, same sourcing standard | **Jaipur** — 35 claims, 4 categories, 21 from higher-tier sources |
| **Researched** | Machine-assembled from retrieved sources. Always labelled | **Kyoto** — 15 claims, 3 distinct sources |
| **Tourism capsule** | 5–7 places, each sentence a span quoted verbatim from a cited source. Not human-reviewed, and every file says so | **12 destinations** — Delhi, Agra, Varanasi, Mumbai, Kolkata, Hyderabad, Kochi, Goa (Phase 18); Paris, Rome, Istanbul, New York City (Phase 19) |
| **Not yet available** | Registered in the architecture; renders nothing | **0 destinations today.** The path is still live and is what a sixteenth destination gets on the day it is registered — see the limitation recorded in `docs/phase-19-global-capsules.md` §6 |

The three depths above the capsule line are **human-reviewed**. The capsules are
**retrieved and quoted, not reviewed** — 66 places whose every sentence is a verbatim
span from a page that was actually fetched, with the URL beside it. That distinction
is the honest one, it is printed on every capsule page, and it is the first thing to
say if a judge asks how twelve destinations appeared in two phases.

**Depth may lower a claim's presentation, never raise it, and nothing automated may
promote a destination.** Promotion is a human decision — exactly as an archive
submission can only be published by a curator. Sikkim's depth is *declared* `deep`
while its *earned* depth is `researched`, and the record says so, listing the reasons
(*"16 approved claims (needs 20)"*, *"no claim from an official, institutional or
academic source"*).

Machine-researched content passes a **seven-condition approval gate**, a human
reviewer, and a **re-verification at publication that re-checks the evidence span
against the source document**. Raw research lives in `.data/research/jobs/`, which
nothing in `src/` reads. `/review` is the reviewer's queue.

### 4.7 · Global

Scroll-condensing glass navbar · ⌘K command palette indexing monasteries, places, stays
and stories (**built on the server**, not shipped to the client) · muted-by-default
ambient audio (two Commons-licensed layers) · toaster · custom 404, error and loading
states · `sitemap.xml`, `robots.txt` and structured data.

---

## 5 · What we deliberately did **not** build

Named explicitly, because the refusals are the argument.

| Not built | Why |
| --- | --- |
| **An AI chatbot** | The product already answers hallucination better — by *retrieving* instead of generating (§4.5). Bolting an LLM on would **destroy** the differentiator, not add one. |
| **Booking / payments** | No licensed inventory or tariff feed exists. Building it means inventing prices. This project shipped invented tariffs once and deleted them; doing it again to win a hackathon forfeits the only thing that makes the data credible. |
| **Ratings and reviews** | Same failure, same history. The state grades 92 of 2,763 businesses; we are not going to rate the other 2,671. |
| **AR / VR / 360° tours** | A sweep of **35 sites** established that no openly licensed 360° capture of any Sikkim monastery exists — Wikimedia Commons has no such category for this state at all. The constraint is the world's, not the code's. |
| **"Are you a first-time visitor?" onboarding** | Intent is inferable from search and filters. A quiz is not a product. |

---

## 6 · Why an ordinary tourism website cannot do this

| Platform | What it has | What it cannot do |
| --- | --- | --- |
| **MakeMyTrip / Booking.com** | Bookable inventory | 883 of 905 registered Sikkim hotels have no grade and most no online presence — commercially invisible, and will stay so |
| **Google Maps / Travel** | Where a hotel is | Whether its registration is current; no relationship to a heritage inventory |
| **sikkimtourism.gov.in** | **The data itself** | Surface it — no search, no filter, no API, 75 pages of pagination |
| **TripAdvisor** | Crowd reviews | Licence status; lesser-known destination coverage |
| **Incredible India** | National promotion | District-level supply analysis |

**None of them can compute a heritage-against-supply figure, because none holds both
halves.** That join is only available to something that is already a sourced heritage
archive *and* has read the licensing registers.

That is the honest answer to *why does this need to exist*: not because it is a
prettier tourism site, but because it is the only artefact positioned to make that
particular join — and the join is the finding.

---

## 7 · Impact model

Measurable without inventing a baseline, because every figure is recomputed from the
registers on each ingest:

| Outcome | Measure |
| --- | --- |
| **Supply-side visibility** | **2,763** licensed businesses made findable; **1,858** of them (the entire agency register) published for the first time in usable form |
| **Administrative signal** | A renewal-compliance figure where none is currently published — per district, per register |
| **Tourism dispersal** | Heritage against registered supply, per district, recomputed whenever either side changes |
| **Permit access** | A permit → licensed-operator path for the five destinations the state routes through agencies |
| **Heritage preservation** | 77 catalogued objects, 200 evidenced photographs, 180 narrated guides, 4 blocked languages documented |
| **Cultural accessibility** | 12 languages published; the gap for Sikkim's own languages stated rather than hidden |

**For the department**, the refresh path is two commands and every promotion is
reproducible and diffable. **For an operator**, being on the register is now worth
something publicly. **For a visitor**, *"who can legally take me to Nathula?"* has an
answer for the first time.

---

## 8 · Stack and architecture

**Next.js 16.3** (App Router, RSC, Turbopack) · **React 19.2** · **TypeScript 5.7** ·
**Tailwind CSS 4** · Framer Motion 13 · Leaflet 1.9 · lucide-react ·
class-variance-authority · clsx · tailwind-merge · @supabase/supabase-js 2.112
Dev/QA: ESLint 9 · @axe-core/cli · Playwright 1.62

| | Count |
| --- | ---: |
| Prerendered pages | **286** |
| Page routes | 25 |
| API routes | 2 (both `force-static`) |
| React components | 55 |
| Library modules | 19 |
| Typed data modules | 37 |
| Offline agent scripts | 27 |
| QA scripts | 18 |
| Photography | 102 MB |
| Audio | 156 MB |

**Type system:** Fraunces (display), Plus Jakarta Sans (UI), IBM Plex Mono (numerics).
**Palette:** warm ivory plaster ground, lamp-black text, forest-ridge primary,
bronze/gilt accent, Tibetan red for error — drawn from monastery material culture.
Tokenised in [`src/app/globals.css`](src/app/globals.css); components consume tokens,
never raw hex. Contrast ratios are recorded beside each token.

### 8.1 · Two deliberate performance decisions

Both API routes exist for the same reason and say so in their own comments:

- **`/api/guide`** — building the guide index in the root layout put ~313 KB of JSON
  into the HTML of *every* page. Most visitors never open the guide. Now fetched once,
  on first open.
- **`/api/operators`** — the two registers are 2,763 records; inlining them would make
  every visitor download the licensing apparatus of the state of Sikkim to read a page
  about monasteries. Now fetched on demand by the one page that needs it.

The ⌘K palette can afford its prop because it carries four short strings per record.
**The agency register was deliberately kept out of it** for the same reason.

### 8.2 · Resilience

Nothing in the product requires a network at runtime. The archive ships as typed data
in `src/data`, so the app renders fully offline of any service. Supabase is an optional
live overlay — [`src/lib/supabase.ts`](src/lib/supabase.ts) returns `null` when
unconfigured and every caller handles it.

Verified by [`npm run qa:industry-flows`](scripts/qa/industry-flows.mjs) (18/18):
an aborted `/api/operators` degrades to a stated error rather than a blank page, the
server-rendered capacity table survives that failure intact, and the page remains
readable with **JavaScript disabled entirely**.

---

## 9 · The data layer

Everything the product renders is typed data under [`src/data/`](src/data/).

| File | Contents |
| --- | --- |
| `sources.ts` | **29** registered sources, each recording what may legitimately be cited from it. Exports the `Provenance` type carried by every record. |
| `monasteries.ts` | 15 monasteries. Coordinates only where a source publishes one. |
| `places.ts` | 38 heritage and natural sites. |
| `stories/` | 70 stories across 8 category files, plus an index that makes cross-links symmetric and drops any slug that does not resolve. |
| `history.ts` | 26 timeline events over 6 eras, each with sources and a verification grade. |
| `archive.ts` | 77 archive objects — the agent refuses to emit one unless the subject's article, a Commons file, **and** a licence with a named author all resolve. |
| `galleries.ts` · `gallery-rejections.ts` | 53 gallery subjects, **200 photographs published**, and the hand-reviewed deny-list of **17** that passed every automated check without depicting their subject. |
| `hotels.ts` | The 905-entry state register, with licence currency computed per row. |
| **`travel-agents.ts`** | The **1,858**-entry agency register — the department's own total, published here for the first time in queryable form. |
| `audio.ts` | 180 narrated guides, plus `BLOCKED_AUDIO_LANGUAGES` with the specific blocker for each. |
| `panoramas.ts` | **Exactly one** verified capture, published as the flat panorama it is and never called a sphere. |
| `permits.ts` | PAP/RAP destinations, authorities and documents. The 13-office RAP address list is **deliberately absent** — its markup pairs each office with the *next* one's address, and a wrong number for a permit office is worse than none. |
| `published-knowledge.ts` | Reviewed, re-verified destination knowledge for Sikkim, Jaipur and Kyoto. |
| `generated/` | Raw agent output, committed as an audit trail. |

**Verified statistics** ([`src/lib/stats.ts`](src/lib/stats.ts)): 2025 arrivals of
17,12,360 total / 16,35,650 domestic / 61,710 foreign, with 2024 comparisons. **The TSD
Fund total is `null`** — the fund exists but no collection figure is published, so the
dashboard renders "Data not available" rather than an estimate.

---

## 10 · The agent pipeline

Offline Node agents in [`scripts/`](scripts/) build and audit the archive. Their shared
constraint:

> **No language model composes prose anywhere in this pipeline.** Every published clause
> is assembled from a verified field on a record, and a clause is omitted entirely when
> its field is absent.

That is what makes it *structurally impossible* for a guide to invent a founder, a date
or a legend the sources do not contain.

- **`heritage-discovery.mjs`** — walks Wikipedia categories and Commons, cross-checks
  fields, scores confidence, stores evidence. Uncorroborated records become candidates
  for human review, not publications.
- **`heritage-360-finder.mjs`** — looks for a panorama that genuinely depicts a given
  monastery. **Records an explicit negative result when none is found** — a negative is
  a valid answer here.
- **`heritage-audio-agent.mjs`** — 60–90 second guides composed *per language* rather
  than translated across them, each with full QA metadata.
- **`heritage-gallery-agent.mjs`** — collects Commons photography on three kinds of
  evidence and drops any candidate missing a licence or named author.
- **`heritage-archive-agent.mjs`** — quotes each subject's own lead rather than
  paraphrasing, so the archive adds no unsourced prose.
- **`ingest-sikkim-tourism.mjs`** — renders the department's SPA and reads the DOM.
  Everything lands in `reports/ingest/` as `PENDING_REVIEW`; **nothing it writes is
  ever served.**
- **`promote-registers.mjs`** — the review gate, as a script. Promotion into
  `src/data/generated/` was previously done by hand, which meant the one step deciding
  what the public sees left no record of how it was performed.

---

## 11 · Quality assurance

Every check below was run on 2026-08-25 against this tree.

| Command | Result |
| --- | --- |
| `npm run typecheck` | **PASS** |
| `npm run lint` | **PASS** |
| `npm run build` | **PASS** — 286 pages |
| `npm run qa:heritage` | **21/21** |
| `npm run qa:industry` | **25/25** |
| `npm run qa:gallery` | **13/13** — 200 photographs, 17 rejected, 48/53 subjects |
| `npm run qa:integrity` | **40/40** |
| `npm run qa:a11y` | **15/15 routes, 0 axe violations** |
| `npm run qa:industry-flows` | **18/18** browser checks |

### 11.1 · Why a green QA run is not proof the content is right

`qa:gallery` checked licence, authorship, file existence and duplicate use, and passed
**11/11 while the gallery for a Sikkim town filled with photographs of Normandy** —
"Soreng" had substring-matched a commune in Seine-Maritime, and "Mangan" had matched
"Manganese".

**Geo evidence proves where the camera stood, not what it was pointed at.** The fix was
a hand-reviewed deny-list, and `place/soreng` now ends with an empty gallery. *An empty
gallery is a true statement about what has been found; four photographs of Normandy are
not.*

---

## 12 · How to verify every number here

```bash
npm install
npm run dev                 # http://localhost:3000 — no env vars required

npm run typecheck
npm run lint
npm run build               # 286 pages
npm run qa:heritage         # 21/21
npm run qa:industry         # 25/25 — includes the honesty scans in §3.1
npm run qa:gallery          # 13/13
npm run qa:integrity        # 40/40

npm run start &             # the browser checks need a running server
npm run qa:a11y             # 15 routes, 0 violations
npm run qa:industry-flows   # 18/18

npm run ingest:tourism      # re-read both registers from the department
npm run registers:promote   # promote a reviewed register into src/data/generated
```

No environment variables are required — the archive ships as typed data, so the app
renders fully offline of any service. Copy `.env.example` to `.env.local` only for the
optional Supabase overlay or to run the discovery agents.

**Supporting documents:**
[`docs/current-problem-statement.md`](docs/current-problem-statement.md) — the statement and what it licenses ·
[`docs/gap-matrix.md`](docs/gap-matrix.md) — what changed and what was built ·
[`docs/pitch-26202.md`](docs/pitch-26202.md) — the pitch ·
[`docs/audit/tourism-domain.md`](docs/audit/tourism-domain.md) — sourced external research

---

## 13 · Demo path — four minutes

1. **The statement, and the register.** Open the department's travel-agent page. Show
   the pagination. *"1,858 licensed businesses the state has already vetted. Try
   finding one."*
2. **`/industry`.** Same data, one search box. Filter to Mangan, filter to current
   registrations. *The state did the vetting; we did the retrieval.*
3. **The capacity table.** Mangan: 24.5% of the heritage, 2.2% of the hotels. Let it
   sit. Then **read the caveat aloud — including the flood — because the caveat is the
   credibility.**
4. **The licence panel.** 91% and 94%. Then: *"and no government publication anywhere
   states this, which is why we are careful about what it means."*
5. **Close on the QA run.** `npm run qa:industry` — 25/25, including a check that fails
   the build if any string in the product calls a business unlicensed. *We enforce our
   own honesty in CI.*

---

## 14 · Known limitations

All surfaced in the UI rather than hidden.

- **No 360° tour is live, and Pannellum has been uninstalled.** No openly licensed 360°
  sphere of any Sikkim monastery exists. Exactly one genuine wide capture survived
  inspection — Rumtek's courtyard — published as the flat panorama it is.
- **Audio guides are machine-narrated and not translation-reviewed.** Every guide
  carries `translationReviewed` and `machineGenerated` flags, and the player discloses
  both.
- **Four languages cannot be produced at all**, two of them official languages of
  Sikkim (§4.3).
- **Stay records carry no commercial detail.** That needs a licensed Places or booking
  integration.
- **The TSD Fund collection total is unpublished** and rendered as unavailable.
- **The 2025 Rules are unpublished**, so licence-term semantics remain unverifiable.
- **The registers are a snapshot** read on 2026-08-18. Everything is assessed against
  that date, and the date is on the page.
- **Expired-entry share is not a compliance rate.** It is the share of published entries
  past a printed date.
- **`culture-videos.json` carries a stale summary.** The file renders 50 videos and
  holds 75 rejected candidates, but its own `summary.accepted` field reports 34 — it
  was not regenerated when the video set grew. The site renders the array, not the
  summary, so nothing displayed is wrong; the summary field should not be quoted until
  the agent is re-run.
- **External research reached 4 of 8 planned sections** — the competitive matrix and
  small-operator interviews were not completed. What is cited is sourced; what is
  missing is named rather than improvised.

---

## 15 · Credits

Monastery records and history from Wikipedia. Photography from Wikimedia Commons under
its published licences, credited per image. Coordinates from Wikipedia and
OpenStreetMap. Hotel and travel-agent registers, permit rules, responsible-tourism
guidelines and tourism statistics from the Tourism & Civil Aviation Department,
Government of Sikkim. The Sikkim Registration of Tourist Trade Act, 2024 via PRS India.
The October 2023 GLOF via *Science*. Ambient audio from Wikimedia Commons.

The full registry, with what may be cited from each source, is in
[`src/data/sources.ts`](src/data/sources.ts) and rendered at `/preservation`.
