# Phase 7 — The Experience Layer

Phase 5 put approved knowledge on a page. It was correct, traceable, and read like a database: a depth panel, then a list of facts grouped by category.

Phase 7 turns that into something a visitor moves through — **told about a place, walked through its history, offered threads to follow, and only then shown the evidence** — without loosening a single guarantee underneath.

---

## 1. The user journey

```
/destinations                → the fifteen, with honest depth badges
  ↓
/destinations/sikkim         → introduction (composed from approved facts)
  ↓                            named sections (history, culture, heritage)
  ↓                            "The story so far"  — dated timeline, each entry sourced
  ↓                            "Follow a thread"   — subjects several facts speak about
  ↓                            "Every verified fact" — the evidence it was all built from
  ↓                            Sources
  ↓
/monasteries/rumtek          → Sikkim's deep curated archive
  ↓
/destinations/jaipur         → the same experience, earned independently
/destinations/kyoto          → the same experience, internationally
```

The ordering is the design. A catalogue-first page asks the reader to assemble the place themselves; a narrative-first page tells them what it is and then lets them check.

## 2. What changed on the destination page

**The narrative leads.** The `DESTINATION_OVERVIEW` block opens the page as prose, not as a labelled card. The remaining blocks become named sections. Nothing about their verification changed — every sentence still cleared the atom checks before it got here.

**Cross-block redundancy fixed.** `DESTINATION_OVERVIEW` and `HISTORICAL` draw on the same dated claims, so the page was showing a reader the same sentence twice — once in the introduction, again under "History". Blocks are now deduplicated in mode order: the introduction keeps the sentence, later sections lose the repeat, and a block emptied by this is dropped rather than rendered as an empty heading. Measured: **0 repeated sentences across all three destinations** (previously 4 per destination).

**The evidence is reframed, not hidden.** The fact list is now "Every verified fact" with a line explaining that everything above was built from it. Same content, different role: it reads as the archive's working rather than as the page's substance.

## 3. Timeline

`DestinationTimeline` — a vertical spine of dated facts, each carrying its own attribution.

Built **only** from published claims that actually contain a year, and the year is taken from the claim's own text (asserted by test: `yearsIn(entry.title).includes(entry.year)`). Nothing is interpolated between entries, so the gaps are real:

> *"Where a century is missing, nothing was found — the gap is real."*

That sentence is on the page. It is the same instinct that put `/preservation` in the product: publishing what is absent is more trustworthy than a smooth line implying continuous knowledge.

| Destination | Entries | Span |
|---|---|---|
| Sikkim | 9 | from 1642 |
| Jaipur | 22 | from 1592 |
| Kyoto | 7 | from 1603 |

Attribution sits under each entry — a timeline is exactly where a reader is most likely to want to check a date.

## 4. Story connections

`StoryConnections` — subjects that more than one verified fact speaks about.

Derived from the **claim graph built in Phase 6**, filtered to `shares-entity` edges: two claims naming the same proper noun. Category and source edges are useful internally and are **not** surfaced, because "these two facts share a publisher" is not a discovery.

**No relationship is inferred.** There is no similarity scoring anywhere in this path. A thread exists because the sources drew it, and the page says so:

> *"These threads exist because the sources drew them, not because anything inferred a resemblance."*

Capped at eight per destination — sixty "subjects" is a database dump, not a way in. Jaipur surfaces 8 threads (top subject: Jaipur, 10 facts), Kyoto 4, Sikkim 2.

## 5. Source transparency

Each fact names its publisher inline as a link. The verbatim span stays available in the link's `title` for anyone checking a specific claim. The full source list sits once at the end with authority tiers.

**Verified by test on rendered output**, not just source: zero occurrences of claim ids, narrative ids, `pending-review`, or provider names in the visible markup of any destination page. A reader sees *"Government of Rajasthan"*, never `claim_2c424d5f` or `rule-based`.

## 6. Honest differentiation

The same component renders all three, so the honesty has to be in what it says:

| | Badge | Basis | Facts | Timeline | Threads |
|---|---|---|---|---|---|
| **Sikkim** | Deep archive | declared | 16 | 9 | 2 |
| **Jaipur** | Curated | **earned** | 35 | 22 | 8 |
| **Kyoto** | Researched | **earned** | 15 | 7 | 4 |
| Delhi | Not yet available | — | 0 | — | — |

Sikkim's panel states that on research evidence alone it would rank *"researched"* — its badge comes from the curated archive, not from this pipeline. Kyoto's states exactly what it is short of: *"15 approved claims (needs 20)"*.

Jaipur has the richest researched experience of the three, which is a real outcome of it having two readable government sources where Sikkim's own portal is a JavaScript shell.

## 7. Demo flow — real product, no presentation pages

Every step is a prerendered route in the actual build. Asserted by test, including a check that **no `demo`, `presentation` or `pitch` page exists**.

| # | Step | Route | What it shows |
|---|---|---|---|
| 1 | Open TerraStory | `/` | The Sikkim archive |
| 2 | Destinations | `/destinations` | Fifteen registered, four depth states, honest badges |
| 3 | Select Sikkim | `/destinations/sikkim` | Introduction → sections → timeline → threads → evidence |
| 4 | The history | timeline section | 9 dated moments, each sourced |
| 5 | A heritage site | `/monasteries/rumtek` | The deep curated archive: audio, gallery, provenance |
| 6 | Credibility | any fact | Publisher named, verbatim span behind it |
| 7 | Expansion | `/destinations/jaipur` | 35 facts, 21 from government sources, earned "Curated" |
| 8 | International | `/destinations/kyoto` | Same architecture, "Researched" — honestly thinner |
| 9 | Scalability | `/destinations/delhi` | Registered, empty, and saying so |

Step 9 is the one worth dwelling on in a presentation: a product that refuses to fill an empty page is demonstrating the thing that makes the other eight steps trustworthy.

`/destinations` was added to the primary navigation this phase. Phase 2 deliberately left it out — a nav item leading to fourteen "not yet available" shells is a promise the product could not keep. Three destinations now carry reviewed content, so it earns a place.

## 8. Search

Destination scope remains the default. New in Phase 7: in **global** search, results from the destination the visitor is currently exploring are **ranked first** rather than filtered — searching "temple" from Kyoto surfaces Kyoto's first, with everywhere else still reachable below.

## 9. AI failure fallback — currently the live state

No API key exists, so every page in this build renders without real-model narrative and is complete regardless: facts, timeline, threads and sources all present.

This is not a hypothetical. **AI is enrichment here, not dependency**, and the current build is the proof.

## 10. Performance

286 pages, unchanged. The published-knowledge JSON is server-side only — destination pages are fully server-rendered, so it never reaches the browser. Timeline and connections are derived at publish time, not at render. Search ownership moved to group level in Phase 6 specifically to avoid ~25 KB per page.
