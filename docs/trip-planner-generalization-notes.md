# Trip Planner — Generalization Notes

**Status after Phase 2: unchanged and intentionally Sikkim-specific.**

Phase 2 did not touch `src/lib/generate-itinerary.ts` beyond leaving it alone. This document records exactly what makes it Sikkim-bound, so Phase 7 can generalize it without rediscovering the problem — and so nobody mistakes the omission for an oversight.

---

## 1. Why it was excluded

The planner is not configuration that happens to hold Sikkim values. It is **encoded local geographic knowledge**: which mountain valleys connect to which, and how long each leg takes. That knowledge came from a person, not a dataset.

Generalizing it would mean either authoring an equivalent graph for fourteen more destinations — an unfunded data project — or deriving one from a routing API, which introduces cost, latency and error into the one feature that currently states nothing it cannot support. Neither belongs in an architecture phase.

The failure mode this avoids is specific and severe: a generalized planner with no corridor data for Kyoto would produce **confident fiction** — invented travel times between places whose road connections are unknown. That is the category of fabrication this project already deleted once.

**The current planner is more accurate precisely because it refuses to generalize.**

## 2. The Sikkim-specific structures

All in `src/lib/generate-itinerary.ts` (825 lines):

| Structure | Size | What it encodes |
|---|---|---|
| `BASES` | 7 towns | Overnight bases — Gangtok, Lachen, Lachung, Ravangla, Pelling and others, each mapped to a `placeSlug` in `src/data/places.ts` |
| `CORRIDOR` | 11 edges | The road graph. Each edge names two bases, the settlements it passes `via`, and the `stops` reachable along it |
| `CLUSTERS` | 15 clusters | Groups of attractions reachable from one base, tagged with interests, hold times and permit requirements |
| `corridorPath()` | — | Walks the graph between two bases |
| `routeSpecs()` / `repairRoute()` / `fillDays()` | — | Turn preferences into a day-by-day route over that graph |
| `paceFor()` | — | Party size and travel style → pace |

Its only imports are `TSD_FEE_PER_PERSON` from `@/lib/booking` and planner types from `@/types`. **It does not depend on the destination model**, and the destination model does not depend on it.

## 3. What Phase 2 did provide

One thing, deliberately minimal: the planner is declared as a **capability**, derived like every other.

```ts
// src/lib/destinations/content.ts — resolveCapabilities()
tripPlanner: destination.depth === "deep",
```

Only Sikkim resolves `true`. Every other destination reports `false`, so the destination shell does not link to a planner for it. A destination without a corridor graph cannot reach the planner at all — the absence is structural, not a runtime check somebody has to remember.

That is the entire coupling. No abstraction was invented in advance of the requirement.

## 4. What Phase 7 will need

**4.1 Move the graph out of code into per-destination data.** `BASES`, `CORRIDOR` and `CLUSTERS` become a `CorridorGraph` on a destination, e.g. `src/data/destinations/sikkim/corridor.ts`. The algorithm stays; the geography leaves.

**4.2 Keep the algorithm identical.** The routing, pacing and repair logic is destination-agnostic already. Extraction should be provably behaviour-preserving — see 4.5.

**4.3 Model the graph honestly.** Edge durations must be sourced or absent. A destination with no graph gets **no routed itinerary**, not an estimated one.

**4.4 Add a non-routed fallback.** Destinations without a corridor graph should degrade to themed day suggestions grouped by division — useful, and making no claim about travel time. This is the honest alternative to fabrication, and it is what makes shipping the planner for a `curated` destination possible at all.

**4.5 Golden-set regression.** Capture the current output for a spread of preference combinations before refactoring; the extracted engine must reproduce them exactly. This is the only reliable proof that 825 lines of hand-tuned routing survived the move.

**4.6 Generalize the cost line.** `ItineraryCostBreakdown` currently models exactly one thing: Sikkim's statutory ₹50 TSD levy with its under-5 exemption. It becomes a `MandatoryFee[]`, each requiring provenance, absent by default. Quoting a wrong statutory fee is worse than quoting none.

## 5. What must not happen

- **No AI-generated itineraries.** An LLM asked to plan a route between places whose connections it does not know will invent travel times fluently. This is risk C2 in the register.
- **No estimated durations.** Not from straight-line distance, not from a heuristic.
- **No silent degradation.** A destination without a graph must say it has no routed planner, not return a worse one that looks the same.
- **No partial extraction.** Half-moved geography is worse than none — the golden set is the gate.

## 6. Cross-references

- `docs/sikkim-dependency-map.md` — **D2**, the XL-complexity item
- `docs/terrastory-risk-register.md` — **H6**
- `docs/terrastory-roadmap.md` — **Phase 7**
- `docs/protected-features.md` — Tier 2: Sikkim itineraries must keep working
