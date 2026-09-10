# Destination coverage

Measured on 2026-08-28. Every figure is counted from the data, not estimated.
**Coverage is not quality.** A destination with fewer records is not a lesser
place; it is one less of which has been catalogued.

## The fifteen

| Destination | Places | Events | Stories | Experiences | Sources | Images | Relationships | Depth (earned) |
|---|---|---|---|---|---|---|---|---|
| **Sikkim** | **53** | **39** | **318** | — | registry | 347 | — | **Deep archive** |
| Delhi | 13 | 12 | 7 | 4 | 17 | 5 | 56 | Tourism capsule |
| Goa | 13 | 9 | 3 | 5 | 15 | 4 | 47 | Tourism capsule |
| Istanbul | 13 | 12 | 6 | 7 | 18 | 6 | 56 | Tourism capsule |
| New York City | 13 | 12 | 7 | 8 | 22 | 6 | 58 | Tourism capsule |
| Paris | 13 | 12 | 7 | 7 | 19 | 6 | 58 | Tourism capsule |
| Rome | 13 | 12 | 5 | 8 | 16 | 6 | 57 | Tourism capsule |
| Agra | 12 | 12 | 1 | 5 | 16 | 5 | 48 | Tourism capsule |
| Hyderabad | 12 | 12 | 5 | 6 | 17 | 4 | 51 | Tourism capsule |
| Mumbai | 12 | 12 | 7 | 6 | 17 | 4 | 53 | Tourism capsule |
| Varanasi | 12 | 12 | 6 | 5 | 15 | 5 | 51 | Tourism capsule |
| Kolkata | 11 | 12 | 4 | 6 | 16 | 4 | 47 | Tourism capsule |
| Kochi | 10 | 10 | 2 | 6 | 16 | 5 | 40 | Tourism capsule |
| Kyoto | 10 | 5 | 2 | 5 | 11 | 5 | 34 | **Researched** (+15 approved claims) |
| Jaipur | 9 | 10 | 4 | 5 | 11 | 5 | 38 | **Curated** (+35 approved claims) |
| **14 capsules** | **166** | **154** | **66** | **83** | **226** | **70** | **694** | |

Sikkim's columns come from a different corpus — a curated archive of
monasteries, places, stories and a timeline — and are shown as the reference
rather than as a comparison. Its "sources" are a registry, not a per-record
list.

## Depth is earned, not assigned

`src/lib/destinations/earned-depth.ts` grades coverage against thresholds
stated once:

| Tier | Requires |
|---|---|
| **Deep archive** | ≥25 catalogued records **and** ≥15 dated events **and** ≥25 stories |
| **Curated** | ≥20 reviewer-approved claims |
| **Researched** | ≥1 reviewer-approved claim |
| **Tourism capsule** | ≥3 catalogued records |

A destination can qualify by either route — a catalogued archive or reviewed
research — and takes the better of the two. Jaipur earns *Curated* on 35
approved claims while also holding 9 catalogued places; Kyoto earns
*Researched* on 15.

Only Sikkim meets the deep threshold, on all three axes. **No capsule was
promoted to hide that**, and each one's shortfall is computed and available:
Paris, for instance, is short on records (13 of 25) and stories (7 of 25).

## Sources

| Publisher | Source records | Tier |
|---|---|---|
| Wikipedia | 166 | encyclopedic |
| Wikidata | 60 | structured, often referenced |
| **Total** | **226** | |

**469 claims, 0 uncited.** Every place, event, story and experience names at
least one source, and the capsule validator refuses to load a file where one
does not.

### What could not be reached, and why it matters

The brief asks for official, UNESCO, institutional and academic sources above
encyclopedic ones. **That hierarchy could not be honoured, and this is the
honest reason:**

| Source | Status |
|---|---|
| UNESCO World Heritage Centre | **HTTP 403** — Cloudflare challenge on both the site and its XML list |
| Archaeological Survey of India | reachable, but an 8.4 MB JavaScript application whose sub-paths redirect; no retrievable per-monument document |
| Wikipedia REST | 200 |
| Wikidata | 200 |

Working around a bot protection is not something this pipeline does, and
storing a scraped SPA is what §18 forbids. So the tier is encyclopedic plus
structured, exactly as in Phases 18 and 19, and **no source is cited that was
not actually fetched** — `qa:release` asserts that every citation's host is one
of the two above.

Raising the tier is real, scoped work: it needs either an API key for a
heritage body, or a per-institution extractor. It is the single biggest
improvement available to this data.

## What is not claimed

- **The capsules are not human-reviewed.** 166 places of retrieved, quoted,
  cited text. Every generated file says so and `reviewedBy` names the script.
- **No practical data.** No opening hour, ticket price, availability or travel
  time is stated for any of the fifteen. The only price in the product is the
  statutory Sikkim Tourist Trade fee, labelled and sourced.
- **Agra has 1 story and Kyoto 2**, against a target of 8–15. The keyword
  selector found no more sentences describing practice rather than chronology
  in those leads. The gap is left as a gap.
