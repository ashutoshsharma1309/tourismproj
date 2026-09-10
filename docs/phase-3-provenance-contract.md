# Phase 3 Provenance Contract

**The rules any machine-generated content must satisfy before it can be published.** Written in Phase 2.5, to be enforced by Phase 3.

This document is the answer to one question: *how does TerraStory let an AI research engine write into a codebase whose entire value is that its claims are true?* The answer is not "carefully". It is a set of structural gates, each of which the compiler or a QA script can check.

---

## 1. What is a claim?

A **claim** is a single assertion that could be true or false, rendered to a visitor.

> "Pemayangtse was founded in 1705." · "The TSD levy is ₹50 per person." · "Rumtek is in Gangtok district."

Not claims: navigation labels, section headings, a destination's own name, UI copy.

Every claim carries a **claim type**, already implemented in `src/data/stories/types.ts` and unchanged by Phase 2.5:

```ts
type ClaimType = "documented history" | "oral tradition" | "legend" | "travel story";
```

This is rendered on the card, in the header and beside the text. A founding legend and a gazetted festival date are both worth telling and are **not the same kind of claim** — nothing is quietly upgraded to fact.

**Phase 3 requirement:** the engine must classify claim type *at extraction*, from the source, not assign it afterwards. A source that presents something as legend must not yield a claim typed `documented history` because the prose read confidently.

## 2. What is evidence?

**Evidence** is the link between a claim and the source that supports it, plus enough detail to check it.

Today this is `Provenance` in `src/data/sources.ts` — unchanged by Phase 2.5:

```ts
interface Provenance {
  sourceId: string;      // → SOURCES registry
  sourceUrl?: string;    // deep link to the specific page backing THIS record
  verifiedAt: string;
  confidence: "high" | "medium" | "unverified";
  caveat?: string;       // set when a record is knowingly incomplete
}
```

Note `sourceUrl`: provenance already points at the *specific page*, not just the publication. That is the seam Phase 3 extends.

**Phase 3 requirement — the one that matters most.** Tapestry's research output stores sources at the *task* level: a bibliography, not attribution. A reader can see thirty sources were consulted and cannot tell which supports any given sentence. TerraStory must not adopt that. Evidence must additionally carry the **verbatim span** the claim was extracted from:

```ts
interface Evidence extends Provenance {
  quote: string;        // the exact text in the source supporting this claim
  retrievedAt: string;
}
```

The span is what makes a claim checkable by a human reviewer in seconds rather than minutes, and it is why extraction must happen *before* synthesis — attribution cannot be recovered after a model has composed prose from a corpus.

## 3. What is a source?

A registry entry in `src/data/sources.ts`. Phase 2.5 extended it:

```ts
interface Source {
  id: string;
  name: string;
  type: SourceType;            // government | press | encyclopedia | commons | internal
  url: string;
  scope: SourceScope;          // NEW — which destination(s) it may be cited for
  retrievalMethod: RetrievalMethod;  // NEW — how TerraStory obtained it
  retrievedAt: string;
  covers: string;              // what may LEGITIMATELY be cited from it
  notes?: string;
}
```

`covers` is doing real work and predates Phase 2.5: it states what the source may be used for. The Sikkim Tourism portal entry records a **negative finding** — that it publishes no monastery opening hours — which is why the archive shows none. A research engine must respect `covers`, not merely cite the source.

**The `internal` sentinel must not change.** A record carrying `sourceId: "internal"` resolves to `undefined`, and the UI deliberately renders "No published source located" and "Last checked" rather than a link and "Last verified". Adding a `SOURCES.internal` entry would make every unsourced record display a source and claim verification — the exact failure the registry exists to prevent.

## 4. How is a source associated with a destination?

Structurally, by a discriminated union — **never by string matching on the id, name or URL**:

```ts
type SourceScope =
  | { kind: "destination"; destinationId: string }   // citable only for this destination
  | { kind: "country"; countryCode: string }         // any destination in this country
  | { kind: "global" };                              // reference works, citable anywhere
```

A union rather than an optional `destinationId` because *"applies everywhere"* is a real, distinct answer, and a null field cannot distinguish it from *"nobody said"*.

Current registry: **17 Sikkim-scoped · 1 India-scoped** (the Ministry of Tourism's Utsav portal, which covers all Indian destinations) **· 7 global** (Wikipedia, Wikimedia Commons, OpenStreetMap, Wikivoyage, UNESCO WHC, YouTube, Google Places).

Resolution is `sourceAppliesTo(source, destinationId, countryCode)`. A `country`-scoped source **fails closed** when no country is supplied: refusing an evidence relationship we cannot confirm is the only safe default.

**Phase 3 requirement:** a source discovered while researching Kyoto is created with `{ kind: "destination", destinationId: "kyoto" }`. It cannot become evidence for Rome. `scope` is a required field, so the compiler rejects a source that omits it.

## 5. How is retrievalMethod stored?

A required field on every source:

```ts
type RetrievalMethod =
  | "human-curated"    // a person located, read and entered it
  | "agent-api"        // an offline script fetched it from a documented API
  | "web-search"       // Phase 3: discovered by automated search. Requires review.
  | "model-proposed";  // Phase 3: proposed by a model, unconfirmed.
```

Deliberately **orthogonal to `SourceType`**. A government portal found by a person and the same portal surfaced by an automated search are the same *type* and very different *provenance*.

All 25 current sources are `human-curated`, because all 25 were written by a person — including the Wikipedia and Commons entries, whose *contents* offline scripts consume but whose *registry entries* a human authored. Recording that honestly is what makes the Phase 3 values mean something when they appear.

**`qa:destination` asserts zero `model-proposed` sources exist today.** The day one appears, it is a deliberate act rather than a drift.

## 6. How does pending-review work?

The invariant already implemented in `src/lib/archive-submissions.ts`, verified by `qa:destination`:

```ts
export type SubmissionStatus = "pending-review";   // a single-value union
```

There is **no other value**. Not "approved", not "published" — the type itself cannot express them. Every submission is created `pending-review`, and **no code path in the application sets any other status**. Approval is a curator action taken outside the public app.

Pre-screening exists and is **advisory only**. It can flag a likely duplicate, a missing field, a location that does not look right, or an obvious spam pattern. It **cannot mark anything verified and cannot reject anything**. A cultural verification decision is a human decision.

Uploads are stored under `.data/`, deliberately outside `public/`, so an unreviewed file is never served as a static asset.

**This is the single best-designed safeguard in the codebase, and Phase 3 should reuse it verbatim rather than invent a parallel one for machine output.** The reasoning that applies to a stranger's photograph applies exactly to a model's paragraph.

## 7. What must happen before machine-generated content can be published?

All seven gates. Failing any one means the content does not ship.

| # | Gate | Enforced by |
|---|---|---|
| **G1** | Every factual block cites ≥1 evidence record with a verbatim span | Schema + `qa:research` (Phase 3) |
| **G2** | Every cited source resolves in the registry and is **in scope** for this destination | `sourceAppliesTo()` |
| **G3** | No source backing a published claim is `model-proposed` | `publishableSources()` |
| **G4** | Every claim carries a `claimType` assigned at extraction | Schema |
| **G5** | **No practical data is synthesised** — hours, admission, fees, permits and entry rules come from an official source or render `unpublished` | Type-level: these fields have no generated variant |
| **G6** | Content enters as `depth: "researched"`, `status: "pending-review"`; **no automated path promotes it** | `archive-submissions` pattern |
| **G7** | A human curator approves before publication | Process, outside the app |

**G5 is the hardest to hold and the most consequential.** It is the only gate whose failure harms a real traveller — a hallucinated opening time sends someone to a closed monastery; a wrong permit rule sends them to a border without the right document. It must be enforced *structurally*, by giving those fields no synthesis code path at all, not by instructing a model to be careful.

**G3 exists because of a specific failure mode:** a model that cannot find a source is liable to produce a plausible one. Registering such a source as `model-proposed` keeps it traceable while making it unusable as evidence — better than discarding it silently, because the attempt itself is a signal worth reviewing.

### What Phase 3 must not do

- Adopt Tapestry's `ResearchOutput` schema — it has **no per-claim citation field**.
- Repair truncated model output silently. Tapestry's `repairTruncatedJson()` returns a plausible-looking stub on failure; in a knowledge product that is worse than an error. **Fail loudly.**
- Weaken `SubmissionStatus` to admit a published state.
- Add a `SOURCES.internal` entry.
- Render AI-generated imagery in any slot implying documentary evidence.
- Let depth propagate upward — a `deep` site linking a `researched` story must render that link at `researched` confidence.
