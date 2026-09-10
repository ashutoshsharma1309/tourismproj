# Digital Archive — gap analysis

Benchmark: <https://sikkimdarshan.vercel.app/archive> — "77 catalogued objects
across 17 categories".
Baseline: this repository, built and served locally.

---

## What each side has

| | Sikkim (here) | The other fourteen (here) | Benchmark |
|---|---|---|---|
| Objects | **77** | **0** | 77 |
| Categories | 17 | — | 17 |
| `/archive` route | yes | **404** | yes |
| Object detail page | yes | — | yes |
| Contribute route | yes | — | yes |
| Creator recorded | 76 of 77 | — | yes |
| Licence recorded | **77 of 77** | — | yes |
| Commons file page | **77 of 77** | — | yes |

The Sikkim archive is the strongest provenance work in this repository:
every object carries a licence, a Commons file page and a named creator, and
`ArchiveExplorer`, `ArchiveCard`, `ArchiveMedia`, `ArchiveTimeline` and the
contribute flow are all built around that record. This is the benchmark's own
number, matched exactly, because it is the same corpus.

## The finding

Unlike Stories, Culture and History — where the other fourteen destinations
held records that had nowhere to go — **the Archive has no corpus at all
outside Sikkim.** `/destinations/rome/archive` returns 404 because the
`archive` capability is derived from content that does not exist.

That makes this a genuinely different problem from the three modules before
it. Those were routing and composition problems over data already retrieved.
This one is a **research problem**: 14 destinations × a corpus of catalogued
objects, each needing a creator, a licence, a rights statement and an
institution before a single card can be rendered.

## What an honest archive requires, and why it cannot be improvised

The brief is explicit — "Never use an image merely because a search engine
returned it", "Do not use copyrighted museum images unless reuse rights are
legitimate", "Do not use AI-generated images as archival objects". Sikkim's 77
objects satisfy that because each was resolved against Commons, which
publishes the licence and the creator as structured data.

The same route exists for the other fourteen: Wikimedia Commons categories
carry openly licensed photographs, maps, manuscripts and paintings with
machine-readable rights. That is a legitimate pipeline and the one this
repository already uses.

What it is NOT is a quick pass. An archive object is not a photograph of a
place — the media pipeline already has those. It is a catalogued *thing*, with
an institution, a date and a maker, and the difference between the two is the
entire distinction between an archive and a gallery.

## Gaps, prioritised

**P0**
1. No archive corpus for 14 destinations. Everything else follows from this.
2. No `archive` capability, so no route, no nav entry, no detail page.

**P1**
3. No destination-specific categories. Sikkim's 17 are its own vocabulary —
   "Monastery heritage", "Sacred landscapes" — and must not be copied onto
   Rome, exactly as the map's categories and the culture shelves are not.
4. Archive objects are not linked to the story and history records that now
   exist. Sikkim's are (`relatedEvents`, `relatedStories`).

**P2**
5. `mediaType` is `image` for all 77. Manuscripts and maps are photographed
   documents; the model already distinguishes them by `category`.

**P3 — deliberately not built**
6. Dimensions and materials. Commons does not publish them for most files,
   and a fabricated "42 × 30 cm" is worse than an absent field.
7. Fifteen shallow imitations of the Sikkim archive. One real provenance
   corpus plus an honest absence is worth more than fourteen thin ones — the
   same judgement already taken for films in the Culture module.

## Status

The audit is complete and the pipeline is understood. The corpus retrieval is
a research pass of the same size as the Stories pass (which took roughly an
hour of rate-limited fetching for 178 records), and it has not been run.
Nothing has been implemented for the fourteen, and nothing has been claimed
for them: `/destinations/<id>/archive` correctly 404s rather than rendering an
empty archive.
