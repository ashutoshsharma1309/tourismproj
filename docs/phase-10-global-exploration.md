# Phase 10 — Global Exploration & Discovery

**Completed 2026-08-25.** TerraStory now opens with the world rather than with Sikkim. Fifteen destinations on one map, the same fifteen in a list beside it, and every one honest about how much is actually known.

**Built entirely without an AI provider.** No key exists, none was waited for, and nothing in this phase depends on one.

---

## 1. What the global experience is

`/destinations` — one page, two complete paths in:

```
World map (15 markers)  ──┐
                          ├──► destination preview ──► /destinations/<id>
Country-grouped list  ────┘                             (existing experience)
```

The map is the faster way to see where these places are. The list is the way that works on a phone, from a keyboard, and for anyone who would rather read than aim. **Both carry all fifteen** — the list is not a fallback, and a visitor is never required to touch the map to reach a destination.

The headline states the differentiator without sloganeering: *"Explore a place through what is known about it."* Then, immediately: *"Not a directory of descriptions… every fact names the source it came from. Where nothing has been verified yet, the page says so."*

## 2. Map implementation

**No new mapping stack.** `WorldMap.tsx` wraps the existing `LeafletMap` component — the same one `/explore` has used since before TerraStory existed — with `dynamic(..., { ssr: false })` so it stays out of the initial payload. No new runtime dependency; `leaflet` remains the only mapping package.

**`fitToMarkers` rather than a fixed viewport.** A fixed centre and zoom framing Europe and Asia pushed New York off the left edge at 390px — making a destination unreachable without panning, on the one page whose job is that every destination is discoverable. Fitting keeps all fifteen in frame at any width, and keeps working when a sixteenth is added. Verified: **15/15 markers in view at both 390px and 1440px.**

Marker colour carries knowledge status — and the legend says exactly that: *"Marker colour shows how much verified knowledge exists, not how interesting a place is."* Each state also carries a text label, so state is never colour-only.

## 3. Destination discovery and the single registry

Markers come from `buildDestinationMarkers()` in the canonical registry. The map component **defines no coordinates**, and a test enforces it.

The projection is deliberately not a `Destination`: it carries id, name, country, region, one coordinate, depth, a knowledge flag and the names of available experience areas — roughly 150 bytes each. That is what crosses to the browser for all fifteen.

**Adding a destination is a registry entry.** Asserted by test: no per-destination branching exists in any component, and no file outside `src/data/destinations/` holds a destination list with coordinates.

## 4. Destination preview

Selecting a marker shows name, region and country, the knowledge status, and either the areas a visitor can explore or — for the twelve with no research — a plain statement:

> *"Research is not yet available for Delhi. It is registered in the architecture, and nothing is shown for it until sources have been found and reviewed."*

**No fabricated statistics anywhere:** no visitor numbers, rankings, hotel counts or popularity scores. Enforced by a test that scans the component's code with comments stripped.

## 5. Routing and integration

The global page is an entry point, not a second application. It links into the existing `/destinations/<id>` experience built in Phases 5 and 7 — narrative, timeline, threads, evidence, sources — and reuses the registry, depth model, capability system, published-knowledge layer and search index unchanged.

**Sikkim was not rebuilt.** Jaipur and Kyoto resolve through the same components; a test asserts no `Jaipur.tsx` or `Kyoto.tsx` exists.

## 6. Isolation

The global page shows **status, never content**. Verified on the prerendered page: zero occurrences of Rumtek, Pemayangtse, Gangtok, Nyingma, Chogyal or Karma Kagyu in its visible region, and zero claim ids.

Search is unchanged from Phases 6–7: grouped by owning destination, destination-scoped by default, current-destination ranking in global mode.

## 7. Sikkim regression

Baseline captured before any change and compared after: **all 13 Sikkim routes identical, all 200.** Content counts unchanged — 180 audio files, 12 languages, 347 images. No diff to `monasteries.ts`, `places.ts`, `history.ts` or `stories/`. Depth still `deep`.

## 8–9. Jaipur and Kyoto

| | Depth | Basis | Facts | Timeline | Threads | Marker |
|---|---|---|---|---|---|---|
| Jaipur | `curated` | earned | 35 | 22 | 8 | blue, emphasised |
| Kyoto | `researched` | earned | 15 | 7 | 4 | amber, emphasised |

Both resolve through the identical component path. Their distinctness comes from evidence, not from code.

## 10. Mobile

| Width | Overflow | Map | Markers in view | Destination links | Page errors |
|---|---|---|---|---|---|
| 390px | **0px** | 358×400 | **15/15** | 15 | 0 |
| 768px | **0px** | 720×448 | 15/15 | 15 | 0 |
| 1440px | **0px** | 732×512 | **15/15** | 15 | 0 |

## 11. Accessibility

- All 15 destinations are plain anchors in the DOM — reachable with **no map interaction at all**
- Keyboard-reachable (first destination link at 25 tabs from page load)
- Map region carries an accessible name; the preview is a labelled `<aside>`
- Marker state carried by label as well as colour
- `qa:a11y` (axe-core) passes

## 12. Performance

| Page | Baseline | Now | Change |
|---|---|---|---|
| `/` | 578,644 | 578,644 | **+0** |
| `/explore` | 516,583 | 516,583 | **+0** |
| `/destinations` | 347,094 | 356,773 | **+9,679** |

The +9.7 KB is the marker metadata for fifteen destinations. **No destination content is eagerly loaded** — the global page's own visible content is 12.6 KB, and it imports no content accessor.

Build unchanged at **286 pages**.

## 13. QA results

| Suite | Result |
|---|---|
| typecheck · lint · build | PASS · PASS · PASS (286 pages) |
| **`qa:global-explore`** | **PASS — 68 checks** |
| `qa:destination` | PASS — 89 checks |
| `qa:decision` · `qa:resilience` · `qa:experience` · `qa:composition` | PASS |
| `qa:publishing` · `qa:narrative` · `qa:research` | PASS |
| `qa:heritage` · `qa:gallery` · `qa:integrity` · `qa:industry` | PASS |
| `qa:flows` · `qa:a11y` · `qa:industry-flows` · `qa:immersive` | PASS |
| **`qa:stories-map`** | **FAIL — environmental** |

**`qa:stories-map` classification.** Tile host returns **400 on all 12** rapid requests. Evidence that application code is not responsible:

| Route | networkidle | Markers | Broken images | App failures | Page errors |
|---|---|---|---|---|---|
| `/explore` | reached | 46 | 0 | **0** | **0** |
| `/destinations` | reached | 15 | 0 | **0** | **0** |

Not weakened, not marked green.

## 14. Bugs found and fixed

1. **Stale server masked the whole feature.** The first visual QA reported the map missing at every breakpoint. The cause was `EADDRINUSE` — my new server never started and port 3000 was still held by the baseline server serving the pre-change build. I was inspecting the old page. Worth recording because the symptom (feature absent, zero errors) looks exactly like a broken component.
2. **New York unreachable at 390px** — fixed viewport pushed the Americas off-screen. Fixed with `fitToMarkers`.
3. **Floating widgets covered the map's status line** — added bottom clearance on mobile. (The widgets overlaying the map's lower edge is pre-existing and site-wide, identical on `/explore`, and covers **zero markers** on either page.)
4. **Three test bugs in my own new suite** — the duplicate-registry heuristic flagged `sources.ts` (where the ids are *source-scope* declarations, the opposite of a duplicate registry); the accessible-name check looked for a rendered attribute in a prerendered page for a client-only map; and the fabricated-statistics scan matched its own prohibition comment.
5. **A silently-skipped check.** The compensating assertion added to `qa:destination` was guarded by a wrong path and never ran — reading as a pass. Its absence now fails the suite.

## 15. Remaining risks

- **The floating-widget overlay** is pre-existing and site-wide; it covers no markers but does sit over map attribution on mobile. A site-wide layout change, out of scope here.
- **The ⌘K index still ships in full to every page** (~265 KB, 1,190 records). Unchanged by this phase and unrelated to it; splitting it per destination wants the route migration (`/sikkim/…`) done first.
- **Twelve destinations remain empty** — correct and honest, but a demo audience sees three populated destinations out of fifteen.
- **No clustering.** Fifteen markers do not need it; several hundred would.
- **The AI generator is still unmeasured** — unchanged from Phase 9, and unrelated to this phase, which works without it.

## 16. Next work package

1. **Route migration** — move Sikkim's content under `/sikkim/…` with 301s, which unblocks per-destination search payloads and removes the last place `DEFAULT_DESTINATION_ID` is load-bearing.
2. **Populate a fourth destination** end-to-end to prove the registry-entry-plus-content claim with a case nobody designed around.
3. **Live model evaluation** whenever a key exists — still the project's oldest open question.
