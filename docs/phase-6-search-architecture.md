# Phase 6 — Search Architecture

Phase 2.5 identified the ⌘K index as destination-blind. That was harmless while Sikkim was the only destination and wrong the moment it stopped being: a visitor exploring Kyoto and searching *"monastery"* would have been shown Rumtek as though it belonged there.

---

## 1. Index structure

Ownership is carried on the **group**, not repeated on every entry:

```ts
interface SearchGroupIndex {
  destinationId: string | null;   // null = global navigation
  items: SearchItem[];
}
type SearchIndex = SearchGroupIndex[];
```

**Why grouped rather than a field per entry.** The palette's index is serialised into the HTML of every page — roughly 1,140 records, the single largest thing on a page at ~265 KB. Stamping `destinationId` onto each entry would have added about **25 KB to every navigation** to express a fact that is constant across a whole group. Phase 5 deferred destination-awareness for exactly that cost; this shape delivers the guarantee for a few dozen bytes instead.

Groups today: global navigation (`null`), Sikkim (curated modules), and one group per destination with **published** knowledge — Jaipur and Kyoto.

## 2. What is searchable

Sikkim contributes from its curated data modules, as before. Other destinations contribute **published knowledge only** — reviewer-approved claims, never raw research. A destination becomes searchable exactly when a person has approved content for it.

Claim ids are never surfaced as search text; the label is the claim statement, the sublabel is category and destination, and the href is the destination page.

## 3. Scoping

```ts
type SearchScope =
  | { kind: "destination"; destinationId: string }
  | { kind: "global" };
```

`itemsInScope()` is the whole isolation guarantee, in one filter:

> Destination scope admits the named destination **and** the global navigation entries, and nothing else.

Global scope returns everything.

## 4. Search modes in the palette

**Destination scope is the default.** The palette derives the current destination from the path — `/destinations/<id>`, otherwise Sikkim, since Sikkim's content still lives at the original top-level routes (the same assumption `DEFAULT_DESTINATION_ID` encodes, and it will move with it).

**Global search is one click away**, via a scope toggle in the palette header reading *"In kyoto"* / *"All destinations"*. Scoped by default because one destination's content should not be mistaken for another's; global available because a visitor may genuinely want to search everywhere.

## 5. Isolation results

| Test | Case | Result |
|---|---|---|
| **A** | Exploring Kyoto, search "monastery" → no Sikkim content | **PASS** |
| **B** | Global search → Sikkim content may appear | **PASS** |
| **C** | Global search "Jaipur" → Jaipur content appears | **PASS** |
| **D** | Kyoto destination scope → no Sikkim claims leak | **PASS** |

Plus: global navigation remains visible in every scope, so scoping never strands a visitor.

Asserted both at source level (the filter is implemented as specified) and behaviourally (the rule applied to a realistic four-group index).

## 6. Performance

No measurable regression. The grouped structure adds one wrapper object per destination — a few dozen bytes — against the ~265 KB the index already occupies. Published knowledge adds entries only for destinations that have approved content: Jaipur (35 claims) and Kyoto (15), against Sikkim's ~1,140.

Build remains 286 pages.

## 7. Known limitations

- **The index still ships in full to every page.** Scoping happens client-side, so a visitor on Kyoto's page still downloads Sikkim's entries; they are simply not shown. Correct for isolation, wasteful for bandwidth. Splitting the payload per destination is a Phase 7 concern and would want the route migration (`/sikkim/...`) done first.
- **Destination inference is path-based.** It relies on Sikkim's content living at un-prefixed routes; when those move, the inference moves with `DEFAULT_DESTINATION_ID`.
- **Ranking is unchanged** — substring match, group ordering, 12 results. Global search across many destinations will eventually want relevance ranking; two published destinations do not justify it yet.
