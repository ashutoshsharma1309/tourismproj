# Protected Features

Everything that must not break during the TerraStory migration. **Sikkim must remain fully functional after generalization.**

This is a contract. Every item below has a verification command or a concrete check. If a Phase 2+ change cannot keep these green, the change is wrong — not the contract.

---

## Tier 0 — Inviolable invariants

Not features but *rules*. Breaking one is a product failure, not a bug.

| # | Invariant | Where enforced | Why it exists |
|---|---|---|---|
| **I1** | **Every rendered factual claim points at a source in the registry, or renders "Data not available".** | `data/sources.ts`, `qa:heritage` | The §22 rule. The project's entire differentiator. Adopting Tapestry's uncited schema would silently void it |
| **I2** | **No fabricated data.** No tariffs, ratings, reviews, room inventories, bookings, occupancy, remittance or arrival figures without a licensed feed. | 2026-08-16 integrity pass | These were deliberately deleted once. They must not return as "sample data for the demo" |
| **I3** | **Missing data renders as missing.** Never estimated, interpolated or inferred. | Type-level (`{status:"unpublished"}`, optional coordinates) | Absence is a first-class state throughout the model |
| **I4** | **No submission or machine output self-publishes.** Everything enters `pending-review`; only a human promotes it. | `archive-submissions.ts` | Applies to AI research output too (research-engine rule 9) |
| **I5** | **Claim type is always rendered.** History, oral tradition, legend and travel story are never silently merged. | `stories/types.ts`, `StoryCard`, `StoryHero` | Nothing is quietly upgraded to fact |
| **I6** | **Media is licence-verified and credited.** No photograph reused across places. | `licence.ts`, `qa:gallery` | Legal + editorial |
| **I7** | **AI-generated imagery is never presented as documentary evidence.** | `ImageAsset.origin` (new) | The Tapestry adoption risk (R2) |
| **I8** | **Practical data is never synthesised** — hours, fees, permits, entry rules come from official sources or render `unpublished`. | Research-engine rule 3 | Wrong permit guidance causes real traveller harm |

## Tier 1 — Sikkim content that must survive intact

| Asset | Count | Verify |
|---|---|---|
| Monastery records | 15 | `npm run qa:heritage` |
| Cultural stories | 74 across 19 categories | `npm run qa:stories-map` |
| Places | 42 | `npm run build` |
| Source registry | 25 sources, incl. negative findings | `npm run qa:heritage` |
| Audio guides | **180 files** = 15 sites × 12 languages (ar bn de en es fr hi ja ko ne ru zh) | `npm run qa:immersive` + file count |
| Images | 347 tracked, credited | `npm run qa:gallery` |
| History timeline | `history.ts`, 1,072 lines | `npm run build` |
| Archive objects | with licence + creator | `npm run qa:integrity` |
| Registered hotels / travel agents | ~905 properties | `npm run qa:industry` |
| Panorama placeholders | flagged `placeholder:true` | `npm run qa:immersive` |

**Verified facts that must not be re-invented** (established 2026-08-14, re-litigating them wastes a day and risks reintroducing errors):

- TSD levy is a **flat ₹50 per person**, collected at hotel check-in, one month validity, under-5s and government-work visitors exempt. **Not** a percentage of tariff — an earlier build wrongly charged 2–4%.
- Sikkim arrivals **2025 = 17,12,360** (16,35,650 domestic + 61,710 foreign); **2024 = 16,25,241**. An earlier build wrongly claimed 21,47,892.
- **Zero** openly licensed 360° panoramas exist for any Sikkim monastery — a verified negative from a 35-site sweep, published on `/preservation`.
- Wikipedia articles exist for 13 of 15 monasteries; only 8 publish coordinates; **Dubdi's coordinate is disputed and it is deliberately unplotted**.
- TSD Fund collection total is deliberately `null` in `stats.ts`.

## Tier 2 — Functionality

| Feature | Must keep working |
|---|---|
| Monastery pages | All 15 detail pages, galleries, audio, provenance blocks |
| Story pages | All 74, with sources and claim-type badges |
| Explore map | Only sourced coordinates plotted; disputed sites omitted |
| Trip planner | Sikkim itineraries with the real corridor route; the single TSD cost line |
| Trip guide | Retrieval-only; still says "I don't have that" rather than padding |
| Archive + contribute | Submission → `pending-review`; uploads outside `public/` |
| Audio playback | All 180 files reachable at their URLs |
| Panorama / gallery / video viewers | Including honest projection labelling |
| ⌘K palette | Search across all Sikkim content |
| `/preservation` | Continues to publish gaps, including the 360° negative |
| `/permits`, `/responsible` | Sourced guidance intact |
| `/industry` | Register + capacity |
| Visit history | Client-side, no accounts |

## Tier 3 — Technical guarantees

| Guarantee | Current | Check |
|---|---|---|
| Build passes | exit 0, **268 pages** | `npm run build` |
| Types pass | clean | `npm run typecheck` |
| Lint passes | clean | `npm run lint` |
| Accessibility | axe-core over 10 routes | `npm run qa:a11y` |
| User flows | Playwright | `npm run qa:flows` |
| Integrity suite | 10 QA scripts | `npm run qa:*` |
| Static rendering | 267 of 268 prerendered | build output |
| Zero-config run | app renders fully with **no** env vars | `npm run dev` with empty env |
| No runtime DB dependency | app must never *require* a database | — |

**The zero-config guarantee is easy to lose and worth defending.** Today the entire app builds and renders with an empty `.env`. Introducing a database in Phase 2 must not make an empty-env build fail — the local data layer stays the fallback.

## Tier 4 — URLs and SEO

Every currently-indexed URL must resolve. 268 pages are in the sitemap and `/monasteries/[slug]` links exist externally.

| Current | Must become |
|---|---|
| `/monasteries`, `/monasteries/[slug]` | **301** → `/sikkim/sites/[slug]` |
| `/stories`, `/stories/[slug]` | **301** → `/sikkim/stories/[slug]` |
| `/history[/slug]`, `/culture`, `/archive[/id]` | **301** → `/sikkim/...` |
| `/places/[slug]`, `/stays/[slug]` | **301** → `/sikkim/...` |
| `/explore`, `/planner`, `/permits`, `/responsible`, `/preservation`, `/hotels`, `/industry` | **301** → `/sikkim/...` |
| `/sitemap.xml`, `/robots.txt` | Must remain valid |
| `/audio/{slug}/{lang}.m4a` | Preserve or redirect — **externally linked media** |

**Required Phase 2 QA addition:** a redirect test asserting that every URL in the pre-migration sitemap returns 200 or 301 (never 404).

## Tier 5 — Editorial positioning

| Must not regress |
|---|
| Positioning as an **honest heritage archive**, not a tourism SaaS |
| Deleted dashboards (hotel-owner, monastery-admin) stay deleted |
| `/preservation` continues to advertise gaps |
| No claim of "360°" for a non-spherical capture |
| Sikkim's cultural and religious content is not flattened by generic templating |
| Community and language names (Lepcha, Bhutia, Nepali) are not lost in category generalization |

---

## Regression gate

**Before any generalization work begins**, capture a baseline:

```bash
npm run build && npm run typecheck && npm run lint
npm run qa:heritage && npm run qa:gallery && npm run qa:integrity
npm run qa:immersive && npm run qa:a11y && npm run qa:flows && npm run qa:stories-map
# record: page count (268), audio file count (180), image count (347), sitemap URLs
```

Re-run after every Phase 2+ milestone. **Any Tier 0 or Tier 1 regression blocks the merge.**
