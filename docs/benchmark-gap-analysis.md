# TerraStory vs Sikkim Darshan — gap analysis

Benchmark: <https://sikkimdarshan.vercel.app>, inspected 2026-09-08 (homepage
and `/monasteries/rumtek`).
Baseline: this repository, built and served locally, screenshots in the session
scratchpad.

The point of this document is to separate three things that were being argued
about as one: features TerraStory genuinely lacks, features it has but renders
worse, and features that are Sikkim-specific and should NOT be copied onto
fifteen destinations.

---

## The headline finding

TerraStory is **not missing the modules**. It is missing *identity*.

Measured on the running site: Paris renders 11,170px tall with 53 photographs
across Places, Historical snapshot, Stories, Food, Festivals, Arts & crafts,
Places to stay, gallery, map and audio. Sikkim renders 9,600px with 31. A
capsule destination is not a thin page.

What it lacked was any sentence that said what the place *is*. Twelve of the
fifteen destinations opened with the identical line — the tier description,
not the destination:

> Essential experiences — a short set of sourced highlights, each quoted from
> a cited source, and nothing beyond them.

That is the single largest experience gap against the benchmark, which opens
every page on a specific, sourced claim about its subject.

---

## Matrix

| # | Feature | TerraStory | Benchmark | Gap | Priority | Action |
|---|---|---|---|---|---|---|
| A | Destination identity | **WEAKER** | COMPLETE | 12 of 15 shared one generic sentence | **P0** | Derived identity line — done |
| B | Coverage / trust strip | COMPLETE | COMPLETE | none — "13 places, 7 stories, 12 dated events, 8 dishes" already renders per destination | — | none |
| C | Featured places | COMPLETE | COMPLETE | hub features 6 with image, category, location, action | — | none |
| D | Photography — resolution | **WEAKER** | COMPLETE | 414 files on disk, **every one under 1600px**, median 1280, max 1280 | **P0** | Re-fetched at source resolution — done |
| E | Photography — crop | **WEAKER** | COMPLETE | centre-crop decapitated portrait subjects; the Eiffel Tower opened on its midsection | **P0** | Derived focal origin — done |
| F | Interactive map | COMPLETE | COMPLETE | per-destination map with published coordinates only | — | none |
| G | Audio guide | PARTIAL | COMPLETE | Sikkim has 12 languages; capsules honestly state absence | P2 | keep honest empty state |
| H | Stories | COMPLETE | COMPLETE | present on all 15 | — | none |
| I | Culture (food/festivals/crafts) | COMPLETE | COMPLETE | retrieved per destination, rendered on the hub | — | none |
| L | History | COMPLETE | COMPLETE | dated events per destination + one global chronology | — | none |
| M | Digital archive | PARTIAL | COMPLETE | Sikkim only (77 objects); capsules have no archive corpus | P2 | do not fabricate |
| N | Explore / discover | COMPLETE | PARTIAL | TerraStory is **stronger** — interest-first across all 15 | — | none |
| O | Stays | COMPLETE | COMPLETE | sourced, no price, no rating, no phone | — | none |
| P | Plan | COMPLETE | COMPLETE | interest + time + pace | — | none |
| Q | Permits | COMPLETE | COMPLETE | Sikkim only, correctly | — | correct as-is |
| R | Responsible tourism | PARTIAL | COMPLETE | Sikkim only | P2 | destination-specific or nothing |
| S | Preserve | PARTIAL | COMPLETE | Sikkim only | P2 | destination-specific or nothing |
| T | Sources / evidence | COMPLETE | COMPLETE | every claim carries its source | — | none |
| U | AI guide | COMPLETE | COMPLETE | deterministic retrieval, 495 records, no LLM in the path | — | none |
| V | Multilingual | COMPLETE | PARTIAL | TerraStory is **stronger** — 20 interface languages vs 12 audio | — | none |
| W | Journey | COMPLETE | N/A | multi-destination; the benchmark has one destination | — | none |
| X | Comparison | COMPLETE | N/A | same reason | — | none |

---

## What must NOT be copied

- **"Monasteries" as a section.** It is the correct word for Sikkim and absurd
  for Paris. The nav already derives its sections from each destination's own
  capabilities, so this is structurally prevented rather than remembered.
- **Permits.** Sikkim has genuine protected-area permits. Inventing a permits
  page for Rome to match a checklist would be fabrication.
- **A 77-object archive per destination.** The Sikkim archive is real
  provenance work. Fifteen shallow imitations would be worth less than one
  real one plus an honest absence.

## What TerraStory does better

Worth stating, because the brief asked in both directions: interest-first
discovery across fifteen destinations, twenty interface languages, a
multi-destination journey, side-by-side coverage comparison, and a guide with
no model in its answer path — so prompt injection is structurally impossible
rather than defended against.

---

## What was changed, and what it measured

### Identity (P0)

Twelve of fifteen destinations shared one sentence. Each now opens on a line
derived from its own records — characterising interests, then the best-known
places it holds, in the order retrieval ranked them:

| | |
|---|---|
| Paris | Museums, art and food — 13 catalogued places, among them Eiffel Tower, Louvre and Notre-Dame de Paris. |
| Kyoto | Religious heritage, architecture and art — 15 catalogued places, among them Kinkaku-ji, Ginkaku-ji and Fushimi Inari-taisha. |
| Varanasi | Religious heritage, food and art — 12 catalogued places, among them Dashashwamedh Ghat, Kashi Vishwanath Temple and Sarnath. |

Nothing is written, so no sentence can outlive the evidence beneath it. The
tier description keeps its job as a coverage note below the identity.

### Photography (P0)

Before: **414 files, every one under 1600px, median 1280, max 1280** — while
the Eiffel Tower's source is 2900 x 4830.

After: **265 of 408 at 1920px**, the remaining 143 at their true source
maximum and reported as such. Nothing is upscaled.

Two things had to be learned to get there:

- Wikimedia no longer renders an arbitrary thumbnail width. It answers `400 —
  Use thumbnail sizes listed on ...`; probing real files, only 1280, 1920 and
  3840 serve. A first pass asked for 2560 and lost 147 of 155 downloads.
- Asking for a width Commons has not rendered before is a thumbnail
  GENERATION request, throttled far harder than a cached read. At 400ms
  spacing it took `429` on 152 of 197 files; at 2.5s with backoff on
  `Retry-After`, zero failed.

### Crop (P0)

A 0.6-ratio portrait cannot fill a 16:9 frame at any crop origin — the aspect
ratio had already been widened once for this and the Eiffel Tower still opened
on its midsection. Two changes: a derived crop origin for all 408 photographs
(110 were being centre-cropped wrongly), and a hero that walks prominence
order and takes the first photograph whose SHAPE suits a wide frame. Paris
moves to the Arc de Triomphe.

### Six images that were not photographs

`scripts/qa/media-integrity.mjs` was written for §17 and immediately found
this repository's own version of the defect the brief cites:

| Record | File | Rendered as |
|---|---|---|
| istanbul/bosphorus | `Turkish_Strait_disambig.svg` | a green locator diagram |
| paris/centre-pompidou | logo SVG | **solid black** |
| new-york-city/rockefeller-center | logo SVG | **solid black** |
| rome/vatican-museums | coat of arms | **solid black** |
| kyoto/food-japanese-tea-ceremony | — | **solid black** |
| new-york-city/one-wtc | `One WTC logo.svg` | a corporate wordmark |

All six removed — the honest empty state the code already supports — with a
name-based guard added to the retrieval path so they cannot return, and the
six orphaned credit rows pruned.
