# Sikkim Darshan — final benchmark comparison

Benchmark inspected live on 2026-09-08/09: the homepage, `/monasteries/rumtek`,
`/culture`, `/history`, `/archive`. TerraStory inspected from its own clean
build and rendered pages, not from source assumptions.

The benchmark is one destination built deep. TerraStory is fifteen
destinations on one engine. The comparison below is therefore in three
columns, not two: whether a feature is UNIVERSAL (belongs on every
destination), DESTINATION-SPECIFIC (belongs where a destination's own records
support it), or NOT APPLICABLE (Sikkim's own vocabulary, which copying would
corrupt).

---

## Global / landing

| Feature | TerraStory | Sikkim Darshan | Gap | Importance | Scope | Action |
|---|---|---|---|---|---|---|
| Hero | full-bleed photograph, rotates all 15 destinations, credited | full-bleed Rumtek, static | none — stronger | high | universal | keep |
| Coverage strip | 15 destinations · 6 countries · 231 places · every claim sourced | 15 monasteries · 46 sites · every claim sourced | none | high | universal | keep |
| Featured entities | destination cards, name → state → 3 derived keywords | "Start with the great houses", 4 monasteries | none | high | universal | keep |
| Section rhythm | hero → destinations → interests → how it works → stories → history → food → map → plan → trust | 14 sections, single subject | comparable | med | universal | keep |
| Trust signals | per-card coverage counts; "documented" counted from coverage | statistics strip, "see the gaps" | was **wrong** — said "3 of 15" | high | universal | **fixed** |
| Footer | product columns + labelled "Sikkim archive" column | single-subject | had unscoped Sikkim links | med | universal | **fixed** |
| Social card | was Rumtek on every global page | Rumtek (correct for it) | Sikkim as the product | high | universal | **fixed** — derived, non-Sikkim |
| 404 page | said "70 stories of Sikkim", linked Sikkim routes | n/a | Sikkim as the product | med | universal | **fixed** |
| Search shortcuts | 7 "Go to" entries were all Sikkim routes | n/a | Sikkim as the product | high | universal | **fixed** — product routes lead |

## Destination experience

| Feature | TerraStory | Sikkim Darshan | Gap | Importance | Scope | Action |
|---|---|---|---|---|---|---|
| Identity | derived per destination from its records | one sentence, authored | 12 of 15 shared one tier sentence | **P0** | universal | **fixed** |
| Coverage | 13 places · 7 stories · 12 dated events · 8 dishes (per destination) | 15 monasteries · 191 photographs · 12 languages | none | high | universal | keep |
| Featured places | 6, image/category/action | 4 "great houses" | none | high | universal | keep |
| Photography | 265 of 408 at 1920px, focal manifest, hero picks wide frames | 191 credited, HD | was capped at 1280px, centre-cropped | **P0** | universal | **fixed** |
| Map | categories derived from records (Kyoto: Temple/Shrine/Castle/Walk; Varanasi: Ghat/Temple/Fort/Mosque) | 7 fixed categories | none — stronger | high | universal | keep |
| Stories | 178 sourced articles + 70 Sikkim, detail pages, shelves | 70 stories | were 77 place-stubs with no page | **P0** | universal | **built** |
| Culture | `/culture` for 15, shelves ordered per destination, 178/195 records → article | 50 films, 9 shelves | 14 had no route | **P0** | universal | **built** |
| Films | Sikkim only | 50 verified | none elsewhere | P3 | **not applicable** — unverified YouTube would not be the same thing | honest absence |
| History | 165 events, 127 with pages, eras derived per destination | 26 events, 6 named eras | 14 had one-sentence events and no eras | **P0** | universal | **built** |
| Named eras | historiographic bands (Ancient…Contemporary) | Sikkim's own six | — | — | **not applicable** — "The Namgyal Kingdom" is Sikkim's periodisation | bands, not borrowed names |
| Archive | Sikkim 77; other 14: Commons-resolved catalogue, licence + maker required | 77 objects, 17 categories | 14 had zero objects | **P0** | destination-specific | **built** (retrieval pass) |
| Audio | Sikkim 12 languages; honest unavailable state elsewhere | 12 languages | none elsewhere | P2 | destination-specific | honest absence |
| Stays | sourced, no price / rating / phone, ≤12 | registered operators | none | high | universal | keep |
| Permits | Sikkim only | Sikkim | — | — | **not applicable** — Rome has no permit regime | correct as-is |
| Responsible / Preserve | Sikkim only | detailed | none elsewhere | P2 | destination-specific | needs sourced per-destination research; not fabricated |
| Sources | every claim cites; CC BY-SA named where text is reused | every claim cites | none | high | universal | keep |
| AI Guide | deterministic retrieval over 495+ records; now destination-aware | n/a | greeting, chips and planner route were all Sikkim | **P0** | universal | **fixed** |

## What TerraStory does that the benchmark cannot

Interest-first discovery across fifteen destinations; a multi-destination
journey with progress; side-by-side coverage comparison; twenty interface
languages; a guide with no model in its answer path, so prompt injection is
structurally impossible rather than defended against.

## What was deliberately not copied

- **Monasteries** as a section outside Sikkim.
- **Permits** for destinations with no permit regime.
- **Sikkim's 17 archive categories** and **6 era names** onto other places.
- **Films** for the other fourteen — 50 verified films is the whole value of
  that page; fourteen shelves of unverified YouTube would be its opposite.
- **Ingredients, recipes, artisan names, dimensions, materials** — nothing
  in this corpus states them, and an invented one is worse than a blank.
