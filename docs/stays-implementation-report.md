# Stays implementation report

**Date:** 2026-09-10 · **Session:** tourismproj-c7 · **Build:** see §11
**Every number here was measured from the generated data and the production server. Nothing is estimated.**

## 1. Architecture

Stays are one section of the existing destination experience, not a parallel system. Two research paths feed one data plane:

- **Wikipedia/Wikidata path (all 14 capsules):** `scripts/capsules/discover-stays.mjs` (`npm run stays:discover`) discovers and verifies candidates and writes `.data/stays-final.json` plus the audit `.data/stays-verification.json`; then the existing chain — `retrieve-culture.mjs` (Wikipedia extract, coordinates, Commons rights) → `enrich-stays.mjs` (official website P856, telephone P1329) → `generate.mjs` (vendors images, writes `src/data/destinations/capsules/<id>.ts`).
- **NIDHI+ register path (9 Indian capsules):** `scripts/capsules/ingest-nidhi.mjs` reads the Ministry of Tourism's public NIDHI+ showcasing listing and writes `.data/stays-register.json`; `generate.mjs` fills each Indian destination's stays up to the ceiling of twelve **after** the Wikipedia-documented ones, with one citation per register entry.
- The capsule `.ts` files are **generated**; every correction is made at the `.data` layer so regeneration cannot resurrect it (the three unattributed CC-BY-SA images were dropped at `.data/culture`, and their files deleted).
- **Surfaces:** hub section (`DestinationStays`, ≤ 12), per-stay page (`/destinations/[id]/stays/[slug]` → `CapsuleStayDetail`), hub map (stays as distinct pins with a legend, only where a coordinate is published), command-palette search (group "Stays"), AI guide records (kind `"stay"`), explore door ("documented", not "to book").
- **Sikkim** keeps its state-register system (22 curated, `/hotels` directory, register detail pages).

## 2. Data model

`CapsuleStay`: `id`, `name` (verbatim from the source — register names are kept as registered, capitals included), `category` (Wikidata P31 label, the article's predicate, or the register sub-category — "Ryokan", "Heritage hotel", "Homestay", "Bed and Breakfast"), `summary` (a sentence quoted from the cited source; for a register entry, a statement *about the register entry*), `coordinates?` (Wikidata P625 only — the register publishes none), `openedYear?` / `buildingYear?`, `image?` + `imageAlt?` (vendored, free licence only), `website?` (P856, reachability-checked), `phone?` (P1329, or the number the unit registered on NIDHI+, displayed as +91), **`address?`** (P6375 or the registered postal address), **`email?`** (registered contact, verbatim), `sourceIds`. Google Maps links are derived at render time from `coordinates`. No `price`, `rating`, `availability`, `bookingUrl` — by design.

## 3. Research sources

| Tier | Source | Used for |
|---|---|---|
| 1 | **NIDHI+** — National Integrated Database of Hospitality Industry, Ministry of Tourism (`nidhi.tourism.gov.in/home/showcasing`) | Indian destinations: registered unit name, sub-category, postal address, registered telephone and e-mail; one detail URL per unit as the citation |
| 1 | Sikkim Tourism & Civil Aviation register | Sikkim (pre-existing) |
| 2 | Wikidata structured claims | identity, type P31, coordinate P625, official site P856, telephone P1329, address P6375, image P18 |
| 2 | English Wikipedia | discovery (categories), the article lead as a source statement, the quoted summary |
| 2 | Wikidata Query Service (`wikibase:around`) | geospatial discovery within 25 km of the registry centre (Goa 120) |
| 2 | Wikimedia Commons API | licence, author, dimensions of every image |

Not used: OTA listings, travel blogs, hotel websites scraped for numbers, kyoto.travel (no machine-readable, licence-clear record set).

## 4. Verification methodology

**Wikipedia/Wikidata candidates** (recorded per candidate in `.data/stays-verification.json`): identity (item + enwiki article); accommodation (P31 lodging type **or** a present-tense predicate in the lead — "is a heritage hotel"; mentions such as "contains a hotel" or "is a historic han" do not count; state guest houses, official residences, post-stations, museums, ruins excluded); still operating ("was a … hotel", "former hotel", "closed", "demolished", "converted to offices" fail unless the lead also says it reopened or "is now the …"; a Wikidata lodging type whose article describes a changed use and never a present-tense hotel fails); location (P625 present, ≤ 25 km of centre, not (0,0), not the centre, not within 25 m of another candidate; **a lead naming a different registry destination fails the record** — Fort Madhogarh carries a Delhi coordinate on Wikidata and says "42 km from Jaipur"); website (P856, host answers; 403/405 count, DNS failure/404 drops the field); telephone (P1329, E.164, matching country code, no placeholder); image (P18, free licence, author where BY requires, ≥ 800 px); duplicates (item / normalised name / coordinate / website host / phone); selection = the ≤ 12 best-documented, already-published first.

**NIDHI+ register entries:** read from the public listing with plain GETs following the page's own pagination (`pageno`), one page per 400 ms; the destination is decided from the **address the unit registered** ("…, Agra, Uttar Pradesh, 282005"), because the listing's city filter is not applied server-side; only lodging sub-categories are kept; telephone normalised to +91 from the registered 10-digit number; e-mail verbatim; one unit per registered telephone within a destination; selection interleaves sub-categories (hotel, heritage, homestay, guest house, B&B, resort…) alphabetically within each, so a destination shows the kinds of stay it registers rather than twelve B&Bs beginning with "A".

**At publish time** `scripts/qa/stays-integrity.mjs` (`qa:stays`) re-asserts: ≤ 12 per destination, sourcing, id/name/coordinate/phone duplicates, no price/rating/availability, aggregator-free websites, telephone shape and placeholders, geospatial bounds against the destination centres, image alt/vendoring — **21 passed, 0 failed**.

## 5. Number of properties — **170**

| Destination | Published | Of which register | Phone | E-mail | Coordinate | Image |
|---|---:|---:|---:|---:|---:|---:|
| Sikkim (state register) | 22 | 22 | 21 | — | 2 | 0 |
| Delhi | 12 | 6 | 6 | 6 | 6 | 4 |
| Jaipur | 12 | 8 | 8 | 8 | 4 | 2 |
| Varanasi | 12 | 12 | 12 | 12 | 0 | 0 |
| Agra | 12 | 12 | 12 | 12 | 0 | 0 |
| Mumbai | 12 | 8 | 8 | 8 | 4 | 4 |
| Kolkata | 12 | 8 | 9 | 8 | 4 | 4 |
| Hyderabad | 12 | 8 | 8 | 8 | 4 | 4 |
| Kochi | 12 | 8 | 8 | 8 | 4 | 3 |
| Goa | 12 | 8 | 8 | 8 | 4 | 2 |
| Kyoto | 1 | 0 | 0 | 0 | 1 | 0 |
| Paris | 12 | 0 | 2 | 0 | 12 | 12 |
| Rome | 5 | 0 | 0 | 0 | 5 | 3 |
| Istanbul | 10 | 0 | 1 | 0 | 10 | 7 |
| New York City | 12 | 0 | 1 | 0 | 12 | 11 |
| **Total** | **170** | 100 | **104** | 70 | 72 | 56 |

All ten Indian destinations are at the ceiling of twelve, every Indian stay with a registered telephone number.

## 6. Destination-by-destination coverage
Generated table with candidates, verified pool, published, per-field counts, shortfall and reasons: `docs/stays-coverage-report.md` (`npm run qa:stays-coverage`).

## 7. Phone verification
Two sources only: Wikidata P1329 (5 stays: Paris 2, Kolkata, Istanbul, New York), verified for shape, country code and placeholder patterns; and the number each unit **registered with the Ministry of Tourism** on NIDHI+ (78 stays across the nine Indian capsules), normalised to +91 and deduplicated within a destination. Hotel websites are never scraped for numbers. Sikkim's 21 come from the state register.

## 8. Google Maps verification
Map links exist only for the 72 stays with a published coordinate (Wikidata P625 or Sikkim's register) and open that coordinate — a deterministic URL to a published point, labelled as such. NIDHI+ publishes postal addresses, not coordinates, so **register stays have an address and a number but no map pin**; geocoding an address to place a pin would be an inference this pipeline does not make.

## 9. Image provenance
56 stay photographs, all vendored from Wikimedia Commons with a free licence, author where required, licence URL and file page in `image-credits.json`, printed under the photograph. Register stays carry no image (NIDHI+ publishes none with reuse rights). `qa:media`: **7 passed, 0 failed**, 0 uncredited of 949 referenced files.

## 10. Duplicate detection
At research time (item, normalised name, coordinate < 25 m, website host, phone) and at publish time (`qa:stays`); register units deduplicated by registered telephone within a destination. Two pairs of *distinct* neighbouring hotels (Divan Istanbul / Hilton Bosphorus; Hôtel de Vendôme / Costes) share a rounded Wikipedia coordinate — reported as a source-precision note, not a duplicate.

## 11. QA results (production build `Qp4gGOsqPbiCm8pxFiSnI`, fresh `next start` on :8700)
`qa:stays` 21/0 · `qa:media` 7/0 · `qa:capsules` 282/0 · `qa:search` 14/0 · `qa:a11y` 30 routes, 0 violations · `qa:ux` 123/0 · `qa:demo` 59/0 · `qa:product-flow` 38/0 · `qa:global-intelligence` 104/0 · typecheck 0 · lint 0. Detail routes: real slugs 200, unknown slug 404. Search index: 12 "Stays" rows for every Indian destination.

## 12. Responsive
`qa:ux` covers 375–1440 overflow across representative routes; the Paris stays section at 390 px renders one card per row with the action row wrapping, `scrollWidth − clientWidth = 0`.

## 13. Accessibility
`qa:a11y` 0 axe violations across 30 routes. Stay actions are real links (`tel:`, `mailto:`, external links with an "opens in a new tab" screen-reader note); the map section carries a legend and a labelled map.

## 14. Performance
`qa:global-intelligence` payload ceilings 104/0. Register stays add no images; Wikipedia-documented stays use the existing responsive `next/image` pipeline with focal points.

## 15. Known limitations
- **Non-Indian coverage below target where English Wikipedia is thin:** Kyoto 1 (ryokans lack typed, geolocated articles), Rome 5, Istanbul 10. Recorded, not filled.
- **Register stays have no coordinate and no photograph** (NIDHI+ publishes neither with reuse rights), so Agra and Varanasi show twelve contactable stays with addresses but no map pins.
- **NIDHI+ "showcased" units** are the subset of the register whose operators opted into public showcasing; names are published as registered (some in capitals).
- **Kyoto's single stay, Heihachi Jaya,** is typed *ryokan* on Wikidata; its article describes it first as a restaurant. Published as sourced.
- Two operating hotels were excluded by a conservative rule and remain in the audit for a human to override: Istanbul 4th Vakıf Han (lead calls it a "historic han") and 75 Wall Street (a tower that *contains* a hotel).
- Wikipedia returned 429 when two agents ran concurrently and Wikidata's query service was throttled to 1 request/minute; the agent paces itself and must be the only client while it runs.
