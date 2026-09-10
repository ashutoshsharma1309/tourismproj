# Phase 17 — Global Destination Content Framework

Post-freeze. Phase 16 declared the product feature-frozen; this phase reopens
it for one purpose — to make adding a destination affordable — and adds no
cities and no tourism content while doing so.

The problem it solves: **Sikkim is not a template.** Four megabytes of
hand-verified modules is the right shape for one flagship and an impossible
shape for a hundred cities. Phase 17 adds a second, compact content format and
the depth model that tells a visitor which one they are looking at.

---

## 1. What already existed, and was not rebuilt

The brief's first implementation rule is "inspect current architecture, avoid
duplicate systems, reuse existing patterns". Most of what it asks for was
already here:

| Asked for | Already existed | Phase 17 |
|---|---|---|
| Destination identity (name, country, region, coordinates, timezone, depth) | `Destination` in `src/types/destination.ts` | untouched |
| Depth levels | `DataDepth` = deep / curated / researched / planned | **added `capsule`** |
| Places, history, stories, sources | Sikkim's deep modules + published knowledge | **added a compact format** |
| Experiences with themes | planner + discovery, interests derived from content | reused verbatim |
| Provenance on every claim | `Provenance`, source registry, published claims | reused, enforced by a validator |
| Lazy per-destination loading | `content.ts` dynamic imports | reused, extended |
| Capability derivation | `resolveCapabilities()` from content presence | reused, made capsule-aware |

No accessor was renamed, no consumer was rewritten, and no second discovery,
planner or search path exists.

## 2. The destination depth model

`DataDepth` now has five levels, ordered explicitly in `DATA_DEPTH_ORDER`:

| Level | Order | Label | What it promises |
|---|---|---|---|
| `deep` | 4 | Deep archive | Complete heritage intelligence — sites, stories, timeline, archive and planner, every claim sourced |
| `curated` | 3 | Curated | Reviewer-approved knowledge across several topics, with the sources it came from |
| `researched` | 2 | Researched | Machine-assembled from retrieved sources and human-reviewed before publication |
| **`capsule`** | **1** | **Tourism capsule** | **Essential experiences — a short, hand-written set of sourced highlights, and nothing beyond them** |
| `planned` | 0 | Not yet available | Registered in the architecture. Nothing has been researched for it yet, and nothing is shown |

Two decisions worth stating:

**Capsule sits below researched, and not because a human wrote it** — a human
writes `deep` too. It sits there because of **breadth**: a capsule states a
handful of things well and is silent about the rest, where a researched
destination has had a retrieval and review pipeline run across its topics.

**The ordering is coverage, never quality.** It ranks how much of a
destination this archive has covered, and the file says so where the constant
is declared. Phase 15's rule stands: nothing here may be used to tell a
visitor one place is better than another.

## 3. Updated TypeScript types

**`src/types/destination.ts`** — `capsule` added to `DataDepth`, plus
`DATA_DEPTH_ORDER` and `DATA_DEPTH_SUMMARY` (the sentence each level renders).

**`src/types/capsule.ts`** — the compact content contract, new:

```
DestinationCapsule
  destinationId, scope, reviewedAt, reviewedBy
  sources[]      CapsuleSource      id, title, publisher, url, retrievedAt, confidence
  places[]       CapsulePlace       id, name, category, summary, coordinates?, image?, imageAlt?, sourceIds[]
  experiences[]  CapsuleExperience  id, title, explanation, themes[], placeIds[], sourceIds[]
  history[]      CapsuleHistoryEntry id, year?, period, title, summary, placeIds[], sourceIds[]
  stories[]      CapsuleStory       id, title, summary, claimType, placeIds[], sourceIds[]
```

Three properties of that shape carry the project's rules into the type system:

- **`sourceIds` is required on every factual item.** A place, experience,
  event or story that cites nothing cannot be constructed.
- **There is no field for a price, a ticket, an opening hour, availability, a
  booking link, a rating or a rank.** Not "should not" — *cannot*. A schema
  that cannot express a fabricated fact cannot be made to ship one.
- **`claimType` on a story is required**, so documented history, oral
  tradition and legend are never silently merged (§I5).

`themes` reuses `JourneyInterest`, the planner's own vocabulary, rather than
declaring a parallel set — which is why a capsule destination answers "show me
heritage" without discovery or the planner learning a new type.

## 4. Architecture decisions

### 4.1 One content layer knows there are two formats

`src/lib/destinations/content.ts` is the only module that knows a capsule
exists. Every accessor now reads:

```ts
if (isSikkim(id)) { …deep modules… }
const capsule = await capsuleFor(id);
if (!capsule) return EMPTY;
return capsulePlaces(capsule);       // projected onto the deep format's shape
```

Above that line, nothing changed. `qa:content-framework` asserts that
`planner/candidates.ts`, `discovery/experiences.ts` and `global/coverage.ts`
contain no mention of a capsule — the projection in
`src/lib/destinations/capsule.ts` is what keeps them ignorant, and that
ignorance is the reason no parallel architecture exists.

### 4.2 Validation happens at the load boundary, and fails closed

`loadCapsule()` validates before returning. A capsule with an unsourced claim,
a dangling source id, an image without alt text, coordinates out of range, a
smuggled price field or a ranking phrase in its prose is **not partially
rendered and not repaired** — it is logged at build time and treated as
absent, so the destination shows "not yet available". Content that cannot be
trusted is not content.

The validator reports *every* problem rather than the first, so an author
fixing a file sees the whole list once.

### 4.3 Membership is answered without importing anything

`resolveCapabilities()` runs for all fifteen destinations on every build, and
has short-circuited before touching a content module since Phase 2.5. Asking
the capsule registry "do you have one?" would have imported the registry — and
the validator with it — for destinations about to be told they have nothing.

So membership lives in `capsules/ids.ts`: a list of strings with **zero
imports**. The registry of lazy importers is only reached once that list says
there is something to reach for. `qa:destination` 89/89 still passes, with its
assertion widened rather than weakened.

### 4.4 A stale depth declaration cannot hide real content

Depth is declared on the registry record; a capsule is a separate file. The
two can disagree. Capabilities are derived from content presence, and that
rule survives the disagreement: if a capsule exists, the destination is not
"planned", whatever the record says.

## 5. Storage impact

| | Bytes |
|---|---|
| **The entire framework** | **25.8 KB** |
| `src/types/capsule.ts` | 6.3 KB |
| `src/lib/destinations/capsule.ts` | 10.3 KB |
| `capsules/index.ts` + `ids.ts` | 4.8 KB |
| `capsules/_template.ts` | 4.3 KB |
| | |
| Sikkim, for comparison | |
| `history.ts` | 61.5 KB |
| `places.ts` | 24.7 KB |
| `monasteries.ts` | 21.2 KB |
| `archive.ts` | 15.4 KB |
| `stories/` | 360 KB |
| `generated/` | 2.2 MB |

The framework costs less than one of Sikkim's four principal data modules, and
a capsule is expected to be **5–15 places, 3–8 experiences and a handful of
history entries and stories** — a few kilobytes per destination.

**Per-page cost is zero for destinations that do not have one.** A capsule's
bytes are behind `() => import(...)`, so Rome's file never appears in Kyoto's
page, and `qa:content-framework` asserts no page ships a capsule payload.
Build output is unchanged at **295 pages**.

## 6. Migration strategy

**Nothing migrates.** Sikkim stays in the deep format; Jaipur and Kyoto stay
on the research pipeline. The capsule is a third route in, not a replacement
for either — and the three coexist because they all terminate in the same
accessor shapes.

A destination can move up: a capsule destination that later goes through
retrieval and review becomes `researched` or `curated`, at which point its
published knowledge and its capsule can both be present (the capsule supplies
places; the pipeline supplies claims). Nothing has to be deleted to promote a
destination — which is deliberate, because a migration that requires deletion
is a migration people avoid.

## 7. Scalability

| | Deep (Sikkim) | Capsule |
|---|---|---|
| Files per destination | ~12 modules + generated data | **1** |
| Bytes per destination | ~4 MB | a few KB |
| Author effort | months | hours |
| Verification | source registry + 8 QA suites | one validator, run at load |
| Ships to other destinations' pages | no | no |

A hundred capsules would add a hundred lines to two registry files and a
hundred small modules that load only for their own destination. The linear
costs are the registry entries; everything else is per-destination and lazy.

## 8. Adding a city — the process

1. **Write the sources first.** If you cannot cite it, you cannot write it.
2. Copy `src/data/destinations/capsules/_template.ts` to
   `<destination-id>.ts` and fill it in. The rules are written beside the
   fields.
3. Add the id to `capsules/ids.ts` **and** an importer line to
   `capsules/index.ts`. (`capsuleRegistryDrift()` reports it if you do one and
   forget the other, and QA asserts they agree.)
4. Set that destination's `depth` to `"capsule"` in its registry record.
5. `npm run qa:content-framework` — the validator will list every problem.
6. `npm run build && npm run qa:final`.

There is no step 7. Discovery, the planner, search, comparison, the map and
the global intelligence layer pick the destination up from the capability
model without a line of change.

## 9. UI

The badge said destinations differ; it did not say how. Every destination page
and discovery page now renders `DATA_DEPTH_SUMMARY` beneath the badge, so a
reader who opens a thin destination after Sikkim is told what they are looking
at before they scroll. Verified live:

| Destination | Badge | Summary rendered |
|---|---|---|
| Sikkim | Deep archive | "Complete heritage intelligence — sites, stories, timeline, archive and planner…" |
| Jaipur | Curated | "Reviewer-approved knowledge across several topics, with the sources it came from." |
| Kyoto | Researched | "Machine-assembled from retrieved sources and human-reviewed before publication." |
| Paris | Not yet available | "Registered in the architecture. Nothing has been researched for it yet…" |

An empty destination still has **no** discovery or planner route (404), which
is the Phase 14 rule: an empty page reads as coverage.

## 10. QA results

New suite — `npm run qa:content-framework`, **68 checks, 0 failed**. It is the
first suite in this repo that **runs** application logic rather than reading
it: Node strips types on import, and `capsule.ts` has no runtime imports, so
the suite exercises the real validator against real fixtures.

| Section | Checks | What it proves |
|---|---|---|
| 1. Depth model | 8 | five levels, ordered, labelled, summarised, rendered by the badge, documented as coverage not quality |
| 2. The contract | 9 | every shape declared; **prices, hours, availability, booking and ratings are absent by construction**; the interest vocabulary is reused; claim type is required |
| 3. Validator behaviour | 19 | a good capsule validates, and 17 specific bad ones are refused — unsourced claim, dangling source, unknown place reference, unresolvable link, missing publisher, unreviewed file, missing scope, image without alt, hotlinked image, coordinates out of range, missing claim type, duplicate sources, smuggled price / hours / rating, and two ranking phrases in prose. Plus: it reports every problem, not the first |
| 4. Adaptation | 7 | capsule shapes project onto the existing record shapes; a place with no coordinate does not gain one; interests come from stated themes, never prose; **no consumer above the content layer mentions a capsule** |
| 5. Lazy loading | 9 | importers not a barrel; validation before return; wrong-destination refused; registry imported lazily; membership answered by an import-free id list; the two registries cannot drift; framework smaller than three deep modules |
| 6. No fabricated content | 3 | one template, no city; every template row commented out; the registry registers nothing |
| 7. Live regression | 13 | site serves; Sikkim 15/70/26/38/78 unchanged; each depth renders its own summary; empty destinations still 404 discovery and planner; no page ships a capsule payload |

**Full battery — 23 suites, 1,420 checks, 0 failures, 256 s.** `qa:destination`
89/89 with both widened assertions passing; `qa:planner` 85/85, `qa:discovery`
106/106, `qa:global-intelligence` 101/101, `qa:flows` 114/114, `qa:a11y` 0
violations, `qa:stories-map` 46/46. Build 295/295, typecheck and lint clean.

## 11. What this phase deliberately did not do

- **No cities and no tourism content.** The registry is empty and the only
  capsule file is a template with every row commented out. A destination is
  listed once a person has written and reviewed its capsule against real
  sources — an entry added before that would be the fabrication the whole
  architecture exists to prevent.
- **No changes to Sikkim**, to the research pipeline, or to the published
  knowledge format.
- **No AI.** Unchanged from every phase since Phase 3: no provider, no key, no
  model in any path.

## 12. Remaining risks

1. **The framework is unproven against a real city.** The validator, the
   adapters and the registry are exercised by fixtures and by the type system;
   the first genuine capsule will find the field that is missing. Expect one
   revision when it is written.
2. **A capsule's `district` is its scope line.** The planner groups a day by
   administrative area, and a capsule has no divisions, so every place in one
   shares a single group. For 5–15 places that is right; for a larger capsule
   the planner would produce one long day.
3. **Capsule sources are not in the global source registry.** They live in the
   capsule file, which keeps a capsule self-contained but means `getSources()`
   — the registry-scoped accessor — does not see them. Rendering them is the
   capsule surface's own job.
4. **The depth ordering is a value judgement about coverage**, and a reader
   who skims a badge may still read it as a judgement about the place. The
   summary line is the mitigation.
5. **The Phase 16 image-optimizer wedge is unchanged and still real.** The
   warm-up caught one during this phase's run — `mon/pemayangtse.jpg` at
   w=3840, 49 s, zero bytes — and reported it with its recovery. It no longer
   fails a suite, because no suite waits on network silence any more, but the
   operational rule stands: clear `.next/cache/images` and re-warm before a
   demo.
