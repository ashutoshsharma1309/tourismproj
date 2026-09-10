# Master Transformation — TerraStory as a Global Product

The brief said the global experience was 6/10 against the original Sikkim
experience's 9/10, and that the homepage was still Sikkim-centric.

**It was, and it was measurable.** This document records what the audit found,
what changed, and what it cost.

---

## 1 · The audit, in numbers

Before any code changed, measured against the running build:

| | Before |
|---|---|
| Homepage text that was Sikkim | **71%** (6,893 of 9,714 characters) |
| Homepage `<h2>` headings naming Sikkim | **11 of 14** |
| Destination links on the homepage | **Sikkim 25**, every other destination 1 |
| Destinations appearing at all | 6 of 15 |
| Homepage payload | 348,598 B |

The hero had said TerraStory since Phase 21 and the interests and destination
grid arrived in Phase A — but below them sat nine consecutive Sikkim sections:
monasteries, a photograph rail, the Sikkim heritage map, the audio tour,
Sikkim's stories, its culture films, its history and archive entries, its
planner CTA and its preservation report.

A visitor read a platform promise and scrolled into a regional archive. That is
the 6/10.

## 2 · What replaced them

Nine Sikkim sections became four global ones and one Sikkim feature. **Nothing
was deleted from the product** — every section still exists on Sikkim's own
pages, which Phase C had just made properly navigable.

| New section | Source |
|---|---|
| **A place is what happened there** | one story from each of six destinations, in registry order |
| **528 BC to 1853, across 6 countries** | one dated moment from *every* destination, sorted oldest first |
| **A plan that tells you why each stop is on it** | the planner, explained in four steps, destination-neutral |
| **Every historical insight is tied to its source** | claim → source → evidence, three cards |
| **What a destination looks like when it has been fully catalogued** | Sikkim, with its real counts, as the depth demonstration |
| **Start exploring** | final CTA to the fifteen |

### Selection is derived, not curated

Destinations are taken in registry order and each contributes its first record.
No destination is promoted and none is a favourite. A destination that holds
nothing of a kind does not appear in that section.

The timeline took three attempts, and the first two were worse:

1. **The first eight of the sorted list** → *"528 BC to 1147"* — the eight
   oldest events, which undersells an archive running to the present.
2. **Eight sampled at even intervals** → *"across 2 countries"*, because the
   oldest records cluster in two of them.
3. **One moment from every destination, sorted** → **"528 BC to 1853, across 6
   countries"**, fifteen rows. Fullest span, fullest spread, and a rule a
   reader can see.

### The hero's middle chip

It read *"Sikkim: 15 monasteries, 46 mapped sites"* — the first viewport of a
fifteen-destination product, naming one of them. It now reads **"166 catalogued
places, each with its sources"**, counted across every destination at build
time.

## 3 · Result

| | Before | After | |
|---|---|---|---|
| Sikkim's share of homepage destination links | **83%** (25/30) | **23%** (10/43) | |
| Destinations linked from the homepage | 6 of 15 | **15 of 15** | |
| `<h2>` headings naming Sikkim | 11 of 14 | **0 of 9** | |
| Homepage payload | 348,598 B | **166,144 B** | **−52%** |
| Homepage TTFB | — | **3 ms** | statically generated |
| Client JS | 3.2 MB / 47 chunks | **3.1 MB / 44 chunks** | −3 chunks |

The Sikkim feature block is still there — it simply uses a heading about
depth rather than about Sikkim, and links to Sikkim's pages from its buttons.

The payload fell by more than half while the page gained the four sections it
had been missing — because nine sections of Sikkim imagery, a Leaflet map, a
photograph rail and a video grid cost far more than six story cards and fifteen
timeline rows.

The homepage now reads:

```
HERO                  what TerraStory is, three actions
DISCOVER BY INTEREST  10 interests, each a real route
EXPLORE DESTINATIONS  all 15, grouped by country, with earned depth
HOW IT WORKS          discover → explore → understand → plan
STORIES               six destinations
TIMELINE              528 BC to 1853, fifteen moments, six countries
PLAN                  four steps, and what it will not tell you
TRUST                 claim → source → evidence
SIKKIM                the deepest destination, with its real numbers
START EXPLORING       final CTA
```

### Verification

**29 suites · 2,409 checks · 0 failures · 304 s.** Accessibility 30 routes, 0
violations. Image audit **4,180 URLs, 0 failed, 0 stalled**. Build 319 pages,
0 warnings. Sikkim **15 / 70 / 26 / 38 / 78** unchanged. `qa:flows` grew to 143
checks as it crawled the homepage's new links; all resolve.

## 4 · Sikkim's role

Unchanged in content — **15 / 70 / 26 / 38 / 78** — and changed in position.
It is no longer the page; it is the demonstration of what a fully catalogued
destination looks like, stated in one block with its real counts and links to
its own pages. The block says out loud that it is *"not a better place than the
other fourteen — it is the one most of which has been catalogued and
reviewed."*

## 5 · What was deliberately not done

- **No new destinations, no new data, no fabricated content.**
- **No AI.** No provider, no key, no simulated output.
- **No second design system.** Every new section uses the existing tokens,
  `tile` utility, button variants and heading scale.
- **No backend rewrite.** The registry, capability model, discovery engine,
  planner, search index and provenance system are untouched.
- **Nothing removed from Sikkim.** Its sections moved off the homepage, not out
  of the product.

## 6 · Known limitations

Unchanged from the Phase C freeze, and all still true:

1. The twelve capsules are **not human-reviewed** — 166 places of retrieved,
   quoted, cited text. Every file says so.
2. The source tier is **encyclopedic** (226 sources, Wikipedia and Wikidata;
   469 claims, 0 uncited). UNESCO returns HTTP 403 behind Cloudflare.
3. **Only Sikkim earns Deep archive**, on all three axes. Nothing was promoted.
4. **Agra has 1 story, Kyoto 2** against a target of 8–15.
5. **97 of 166 capsule places have no photograph**, by choice.
6. **No practical data anywhere** — no hours, prices, availability or travel
   times. The one price in the product is the statutory Sikkim Tourist Trade
   fee, labelled and sourced.
7. Basemap labels render in local script; the image optimiser stalls on a cold
   cache and needs `npm run qa:images` before browser QA.
