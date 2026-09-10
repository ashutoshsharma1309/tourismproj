# Future Destination Model

Conceptual target for Phase 2. **Not implemented in Phase 1.** Shapes are illustrative TypeScript, chosen to show intent precisely; final field names are a Phase 2 decision.

---

## 1. The two principles

**P1 — Every entity carries its destination.** Today none do; Sikkim is an unstated global. Every record gains `destinationId`, and identity becomes the composite `(destinationId, slug)`. This is the single change that makes everything else possible.

**P2 — Every entity declares how well it is known.** With 15 destinations at radically different depths, a reader must be able to tell a curated, human-verified fact from a machine-researched one *at the point of reading*. This is new — no current entity can express it — and it is what lets TerraStory scale without diluting the credibility that makes it worth using.

Everything below follows from these two.

---

## 2. Data depth — the tiering that makes scale honest

```ts
export type DataDepth =
  | "deep"        // Sikkim: human-curated, source-registry-backed, QA-enforced
  | "curated"     // human-reviewed subset; narrower but same standard
  | "researched"; // machine-assembled from retrieved sources, clearly labelled
```

The rule that keeps this honest, and which must be enforced mechanically:

> **Depth may lower a claim's presentation, never raise it.** A `researched` record may never render with the visual authority of a `deep` one, and no automated path may promote a record's depth. Promotion is a human action, exactly as archive submissions can only be published by a curator.

This generalizes the existing pattern: `/preservation` already publishes what Sikkim *lacks*. Under TerraStory that page becomes the per-destination **data-depth disclosure** — the honest answer to "why does Kyoto have less than Sikkim?"

`confidence` is per-claim and orthogonal to depth:

```ts
export type Confidence = "high" | "medium" | "unverified";
```

---

## 3. Destination

```ts
export interface Destination {
  id: string;                    // "sikkim" | "kyoto" | "paris"
  slug: string;
  name: string;                  // "Sikkim"
  shortName?: string;
  country: { code: string; name: string };        // ISO 3166-1
  region?: { code?: string; name: string };       // state / prefecture / province
  geography: {
    centre: Coordinates;
    bounds: [Coordinates, Coordinates];           // map framing
    timezone: string;                             // IANA
  };
  /** Replaces SikkimDistrict. Closed per destination, validated at runtime. */
  divisions: AdministrativeDivision[];
  /** Replaces MonasteryTradition. Destination-scoped vocabularies. */
  taxonomies: Taxonomy[];
  depth: DataDepth;
  languages: LanguageCode[];     // content + audio languages actually available
  overview: RichText;
  entryRequirements: EntryRequirement[];   // generalizes /permits
  mandatoryFees: MandatoryFee[];           // generalizes the TSD levy
  officialRegisters?: OfficialRegister[];  // only where a government publishes one
  provenance: Provenance;
  publishedAt?: string;          // absent ⇒ not publicly listed
}

export interface AdministrativeDivision {
  id: string;
  name: string;                  // "Gangtok" | "Higashiyama" | "1er arrondissement"
  kind: "district" | "prefecture" | "ward" | "arrondissement"
      | "borough" | "rione" | "province" | "region" | "other";
}

export interface Taxonomy {
  id: string;                    // "buddhist-tradition" | "architectural-period"
  label: string;
  values: { id: string; label: string; provenance?: Provenance }[];
}
```

`divisions` and `taxonomies` are the direct replacements for `SikkimDistrict` and `MonasteryTradition`. Closedness is preserved — moved from compile time to per-destination runtime validation. An invented division stays unrepresentable.

---

## 4. HeritageSite — generalizing Monastery

```ts
export interface HeritageSite {
  id: string;
  destinationId: string;                 // P1
  slug: string;                          // unique within destination
  name: string;
  localName?: { script: string; text: string };   // 京都 / काशी — do not force Latin
  siteType: SiteTypeRef;                 // monastery|temple|shrine|mosque|church
                                         // |palace|fort|museum|ghat|archaeological
  divisionId: string;                    // → Destination.divisions
  taxonomyRefs: TaxonomyValueRef[];      // e.g. tradition, period
  established?: { year: number; era?: string; provenance: Provenance };
  description: RichText;
  history: RichText[];
  significance?: RichText;
  architecture?: RichText;

  /** Absent when no authoritative coordinate exists — the site is not plotted.
      Preserves today's behaviour: Dubdi stays unplotted. */
  coordinates?: Coordinates;

  media: MediaBundle;
  visiting: VisitingInformation;
  depth: DataDepth;
  confidence: Confidence;
  provenance: Provenance;
}
```

`localName` is new and matters: Kyoto, Varanasi, Istanbul and Rome all have canonical non-Latin names, and forcing transliteration is a quiet form of inaccuracy.

---

## 5. Visiting information — including what Sikkim never needed

```ts
export interface VisitingInformation {
  hours: VisitingHours;                  // KEPT VERBATIM from today
  admission: Admission;                  // NEW
  accessibility?: AccessibilityNotes;
  advisories?: Advisory[];               // dress codes, photography rules, closures
}

/** Unchanged from src/types/index.ts — already correct. */
export type VisitingHours =
  | { status: "official";    summary: string; provenance: Provenance }
  | { status: "reported";    summary: string; provenance: Provenance }
  | { status: "unpublished"; provenance: Provenance };

/** NEW — Sikkim's monasteries are largely free, so this was never modelled.
    Paris, Rome, Agra and Kyoto make it central. */
export type Admission =
  | { kind: "free"; provenance: Provenance }
  | { kind: "ticketed"; price: Money; bookingUrl?: string;
      timedEntry: boolean; provenance: Provenance }
  | { kind: "unpublished"; provenance: Provenance };
```

Note the shape: `unpublished` is a member of the union, not a `null`. "We don't know" is a representable, renderable state — the property that makes the current system honest, carried into every new field.

---

## 6. Content entities

```ts
export interface Story {
  id: string; destinationId: string; slug: string;
  title: string;
  /** Split per dependency D8. */
  category: UniversalStoryCategory;      // History|Festivals|Food|Architecture|…
  heritageTags?: string[];               // destination-scoped: "Lepcha"|"Machiya"
  claimType: ClaimType;                  // UNCHANGED — the crown jewel
  body: RichText[];
  media: MediaBundle;
  sources: SourceRef[];
  depth: DataDepth; confidence: Confidence;
}

export interface TimelineEvent {
  id: string; destinationId: string;
  year: number; endYear?: number;
  era?: string;
  title: string; description: RichText;
  relatedSiteIds?: string[];             // timeline ↔ sites, per knowledge architecture
  claimType: ClaimType; provenance: Provenance;
  depth: DataDepth; confidence: Confidence;
}

export interface Stay {
  id: string; destinationId: string; slug: string;
  name: string; divisionId: string; tier?: AccommodationTier;
  /** Present ONLY where an official register exists. */
  registration?: { registerId: string; registrationNumber?: string; provenance: Provenance };
  media?: MediaBundle;
  /** Deliberately absent: tariff, rating, reviews, room inventory, availability.
      Removed in the 2026-08-16 integrity pass. Do not reintroduce without a licensed feed. */
}
```

The comment on `Stay` is load-bearing. The fabricated commercial surface was deleted once already; the model should make its absence explicit so it is not "restored" by someone who assumes it was an oversight.

---

## 7. Media and sources

```ts
export interface MediaBundle {
  hero?: ImageAsset;
  gallery: ImageAsset[];
  audio: AudioAvailability;     // unchanged
  video: VideoAsset[];
  panorama: TourAvailability;   // unchanged, incl. projection honesty
}

export interface ImageAsset {
  url: string; alt: string;
  credit: ImageCredit;                 // creator + licence — required
  /** NEW. Nothing may render as a photograph of a place unless "photograph". */
  origin: "photograph" | "illustration" | "ai-generated";
  capturedAt?: string;
  locationNote?: string;               // "photographed at Thiksey, Ladakh, not Sikkim"
}
```

`origin` is the field that lets TerraStory borrow Tapestry's generative imagery **without** lying. Tapestry generates photorealistic historical illustrations and presents them inline; this project shows credited Commons photographs. Both are legitimate — conflating them is not. `origin` makes the distinction structural rather than editorial, and a QA rule can enforce that `ai-generated` never appears as a site's `hero`.

`Source` and `Provenance` are carried over **unchanged** from `src/data/sources.ts`, with one addition:

```ts
export interface Source {
  /* … existing fields unchanged … */
  destinationId?: string;   // absent ⇒ global source
  retrievalMethod?: "human" | "agent" | "web-search";   // NEW: how it was found
}
```

---

## 8. Depth in practice, across the 15

| Destination | Target depth | Basis |
|---|---|---|
| **Sikkim** | `deep` | Existing: 15 sites, 74 stories, 180 audio files, 25 sources, QA-enforced |
| Delhi, Jaipur, Varanasi, Agra, Goa | `curated` | ASI + state tourism boards publish usable open data |
| Mumbai, Kolkata, Hyderabad, Kochi | `curated` → `researched` | Thinner official sourcing |
| Kyoto | `curated` | Strong open data; conceptually closest to Sikkim |
| Paris, Rome | `curated` | Excellent open data; ticketing is the modelling challenge |
| Istanbul | `researched` → `curated` | Good sources, language barrier |
| New York City | `researched` | Heritage frame differs most from the Sikkim model |

**Sikkim stays the only `deep` destination.** That is the point: TerraStory scales reach without pretending the reach is uniform, and the depth badge plus the per-destination preservation page tell the reader exactly where they stand.

---

## 9. What this model deliberately does not do

- **No fabricated fields.** Nothing exists for a rating, review, price or availability that no licensed feed supplies.
- **No auto-promotion.** Nothing raises a record from `researched` to `curated` without a human.
- **No forced completeness.** Every optional field's absence renders as absence, not as an estimate.
- **No AI imagery masquerading as a photograph.** Enforced by `ImageAsset.origin`.
- **No universal itinerary graph.** Routing requires per-destination corridor data; the model does not pretend otherwise (see D2).
