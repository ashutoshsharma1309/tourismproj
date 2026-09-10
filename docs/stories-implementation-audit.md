# Stories — implementation audit

Benchmark: <https://sikkimdarshan.vercel.app> (homepage "Stories of Sikkim"
rail and `/monasteries/rumtek`'s thirteen contextual stories).
Baseline: this repository, built and served locally.

---

## What is actually there

| | Sikkim | The other fourteen |
|---|---|---|
| Stories | **70** | **77** |
| Body prose | `content[]`, 400–800 words | none — one extracted sentence |
| Key facts | 3–5 per story | none |
| Hero photograph | yes, with credit | none |
| Named sources | yes, with retrieval date | source id only |
| Category shelf | 19 shelves | `undefined` |
| Claim type | 4 kinds, rendered | present |
| Detail page | `/destinations/sikkim/stories/<slug>` | **none — an anchor on /discover** |

The route already exists and is already correct. `generateStaticParams` for
`stories/[slug]` is gated on a story having `content`, precisely so that
Sikkim's 70 narratives could not appear at eight other destinations' URLs when
capsules arrived. Nothing about the routing needs to change: a capsule story
that gains real body prose gets a page automatically.

## The finding

The fourteen capsule destinations do not have thin stories. **They do not have
stories at all.** What is labelled a story is a place record wearing a
different hat:

```
{ id: "louvre-practice",
  title: "Louvre",
  summary: "The Musée du Louvre contains approximately 500,000 objects …",
  placeIds: ["louvre"] }
```

The title is the place's name, the body is one sentence lifted from the place's
own article, and the `-practice` suffix is the giveaway. Seven of these sit
under "Stories" on Paris's hub while the same seven places sit under "Places"
three sections above. That is the duplication the brief forbids, and it is why
the section reads as filler: a story that answers *what is this place* has
already been answered by the place.

## Gaps, prioritised

**P0**
1. Fourteen destinations have no narrative prose. Without it there is no
   editorial module, only a second copy of the place list.
2. Stories duplicate place records one-to-one. A story must have a subject the
   place list does not already carry.
3. No story detail page outside Sikkim — a consequence of (1), not a routing
   defect.

**P1**
4. No hero photograph on any capsule story.
5. No category shelves outside Sikkim, so no editorial taxonomy to browse by.
6. No featured story anywhere — the global `/stories` index is a flat grid.

**P2**
7. Story→history and story→archive connections exist only for Sikkim.
8. Reading time is not shown for capsule stories.

**P3 — deliberately not built**
9. Author bylines. No named author exists for retrieved material, and
   inventing one is fabrication.
10. Publication dates. Same reason; `lastVerified` is the honest field and it
    already exists.

## Reusable architecture — what must NOT be rebuilt

- `stories/[slug]` route, gated on `content`.
- `StoryHero`, `StoryCard`, `StorySources`, `ClaimBadge`, `StoriesExplorer`.
- `defineStory()`'s derivations: reading time, source normalisation,
  two-way related-story completion.
- The claim-type vocabulary — documented history / oral tradition / legend /
  travel story — and its rendered descriptions.
- The media pipeline (`media:widths` → `media:places` → `media:focal`) and
  `image-credits.json`. Story imagery goes through it, not around it.

## Destination-specific requirement

Story subjects must come from what each destination's evidence actually
supports. Kyoto's records carry temples, gardens, tea and textiles; New York's
carry museums, immigration and public parks. Forcing both into the same shelf
list would reproduce the "Monasteries for Paris" defect one level down.
