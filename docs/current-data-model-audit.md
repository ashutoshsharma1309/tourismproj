# Current Data Model Audit

**Question this document answers:** can today's architecture represent 15 destinations without becoming 15 codebases?

**Answer: not as it stands — but the obstruction is narrower than expected.** The blockers are three type declarations, one routing graph and one entity name. The *epistemic* layer (sources, claim types, availability unions) is already destination-agnostic and is the hard part of this kind of system. Roughly 70% of the modelling work TerraStory needs is done; the missing 30% is a destination dimension that no entity currently carries.

---

## 1. Where data actually lives

There are **four** stores, not one.

| Tier | Location | Volume | Written by | Read at |
|---|---|---|---|---|
| **Curated TypeScript** | `src/data/*.ts` | 9,480 lines | Humans | Build |
| **Generated JSON** | `src/data/generated/*.json` | ~52,000 lines | `scripts/*.mjs` | Build |
| **Runtime file store** | `.data/` (gitignored) | Variable | Server action | Request (`/archive`) |
| **Supabase Postgres** | `supabase/schema.sql` | 2 tables | Nothing | **Never** |

The fourth tier is **dead**: `getSupabase()` has zero call sites. Every page is prerendered from tiers 1 and 2. **There is no database migration risk in Phase 2, because there is no database.**

---

## 2. Entity-by-entity

| Entity | Defined in | Has destination field? | Multi-destination ready? |
|---|---|---|---|
| Monastery / MonasteryDetails | `types/index.ts`, `data/monasteries.ts` | **No** — has `district: SikkimDistrict` | ❌ Type-level block |
| Place | `data/places.ts` (42) | **No** | ❌ |
| Story | `data/stories/types.ts` (74) | **No** — `StoryCategory` includes `"Sikkim History"` | ⚠️ Partial |
| Source | `data/sources.ts` (25) | **No** — but nothing Sikkim-specific in the *shape* | ✅ Shape ready |
| ArchiveItem | `data/archive.ts` | **No** — has out-of-state warning logic | ⚠️ Partial |
| Stay | `data/curated-stays.ts`, `hotels.ts` | **No** — `district: SikkimDistrict` | ❌ |
| TravelAgent / Operator | `generated/registered-travel-agents.json` | **No** | ❌ |
| AudioGuide | `generated/audio-guides.json` | **No** — keyed `monasterySlug` | ❌ |
| Gallery / ImageCredit | `galleries.ts`, `images.ts`, `licence.ts` | **No** — but licence logic is universal | ✅ Shape ready |
| HistoryEvent | `data/history.ts` (1,072) | **No** | ⚠️ Partial |
| Panorama | `data/panoramas.ts` | **No** | ✅ Shape ready |
| Permit | `data/permits.ts` | **No** — India PAP/RAP | ❌ |
| Itinerary | `lib/generate-itinerary.ts` | **No** — hard-coded `BASES` | ❌ Hardest |

**Not one entity in the system carries a destination identifier.** Sikkim is not a *value* in this data model; it is an unstated global assumption. That is the single defining fact of this audit.

---

## 3. The three type-level blockers

```ts
// src/types/index.ts:33
export type SikkimDistrict = "Gangtok" | "Mangan" | "Namchi"
                           | "Gyalshing" | "Pakyong" | "Soreng";

// src/types/index.ts:41
export type MonasteryTradition = "Nyingma" | "Kagyu" | "Karma Kagyu" | "Zurmang Kagyu";

// src/data/stories/types.ts:22 — 19 values, four name Sikkim communities
export type StoryCategory = "Sikkim History" | "Lepcha Heritage" | ... ;
```

Adding Kyoto is a **compile error**, not a data-entry task.

This is not accidental sloppiness — it is the type system enforcing the editorial standard. A closed union makes an invented district unrepresentable. **The generalization must preserve that property**, or TerraStory trades its credibility for reach. The replacement is per-destination validation against declared divisions: still closed, just closed *per destination* and at runtime rather than compile time.

Mirrored in SQL as `check (district in ('Gangtok', … ))` — dead, therefore free to replace.

---

## 4. What is already destination-agnostic

Genuinely reusable, unchanged, for all 15 destinations:

**`Source` / `Provenance`** — `{ id, name, type: government|press|encyclopedia|commons|internal, url, retrievedAt, covers, notes? }`. Nothing Sikkim about it. It also records **negative findings** (the Sikkim Tourism portal entry documents that it publishes *no* opening hours) — a pattern most systems have no way to express.

**`ClaimType`** — `documented history | oral tradition | legend | travel story`, rendered on the card, header and beside the text. Universal, and directly applicable to AI-generated content.

**`VisitingHours`** — `{official} | {reported} | {unpublished}`, each carrying provenance. Distinguishing "officially published" from "reported by aggregators" from "nobody publishes this" is exactly the discipline a research engine needs.

**`TourAvailability` / `AudioAvailability`** — discriminated unions where *absence is a first-class representable state*.

**Licence machinery** — `licence.ts`, `image-credits.json`, `gallery-rejections.ts`, and a QA rule that no photograph is reused across places.

Together these are a **portable epistemics layer**. Building one from scratch is the expensive part of a source-grounded product, and it already exists here.

---

## 5. The 15-destination test

Can the current model represent each target? Tested against the actual type definitions:

| Destination | Blocking issue |
|---|---|
| **Sikkim** | ✅ Fully represented — the reference implementation |
| Delhi, Mumbai, Kolkata, Hyderabad, Kochi | ❌ Not districts of Sikkim; heritage sites are forts/mosques/churches/colonial architecture, not monasteries |
| Jaipur, Agra | ❌ Same; plus ASI ticketing/timed entry has no model |
| Varanasi | ❌ Ghats and temples; river geography has no model |
| Goa | ❌ Churches and beaches; `MonasteryTradition` meaningless |
| **Kyoto** | ❌ Temples/shrines — *conceptually closest*, but `tradition` enumerates Tibetan lineages, not Zen/Shingon/Shinto; wards not districts |
| Paris, Rome | ❌ Arrondissements / rioni; museums and basilicas; **paid ticketing is central and has no model** |
| Istanbul | ❌ Mosques and palaces; spans two continents — no model for that |
| New York City | ❌ Boroughs; heritage is modern/immigrant/architectural, and the whole "monastery" frame collapses |

**Result: 1 of 15 representable.** Every failure traces to the same three causes — no destination dimension, a Sikkim-only division type, and "monastery" hard-coded as the heritage entity.

Two structural gaps surface only under this test and are **not** visible from the Sikkim implementation alone:

1. **Ticketing and timed entry.** Central to Paris, Rome, Agra, Kyoto. Sikkim's monasteries are largely free, so the model has no concept of a paid, bookable, capacity-limited entry. This is a genuine *new* modelling requirement, not a generalization.
2. **Data-depth signalling.** No entity can currently say how well-sourced it is. With 15 destinations at wildly different depths, a viewer must be able to tell a curated fact from a researched one. This is why `DataDepth` and `confidence` are mandatory in the future model.

---

## 6. Relationship integrity today

Relationships are **implicit slug references across modules**, not foreign keys:

- `audio-guides.json.monasterySlug` → `monasteries.ts.slug`
- `site-galleries.json` keys → site slugs
- `generate-itinerary.ts` `placeSlug` → `places.ts.slug`
- Every record's `sourceId` → `SOURCES[id]`

Nothing enforces these at the type level. Integrity is enforced **mechanically at build time** by `npm run qa:heritage` and `qa:gallery` — which is why the memory note *"run `qa:heritage` after any slug change"* exists.

For a single destination with ~150 entities this works. Across 15 destinations with a runtime research engine writing new records, **slug-reference integrity by convention will not hold**. Phase 2 needs real referential integrity — composite keys `(destinationId, slug)` in a database, or the same enforced by schema validation.

---

## 7. Verdict

| Question | Answer |
|---|---|
| Can the current model represent 15 destinations? | **No** — 1 of 15 |
| Is a rewrite needed? | **No.** The epistemic layer is sound and reusable |
| What is genuinely missing? | A destination dimension on every entity; generic site typing; per-destination administrative divisions; data-depth/confidence; ticketing; real referential integrity |
| Biggest surprise | The dead Supabase layer — **there is no migration to perform**, only a layer to introduce |
| Biggest hidden risk | Slug-reference integrity by convention will break under multi-destination + runtime writes |
| Hardest single item | `generate-itinerary.ts` — hand-encoded geography, not configuration |

**No schema was modified and no migration was performed in Phase 1**, per the brief's hard rules.
