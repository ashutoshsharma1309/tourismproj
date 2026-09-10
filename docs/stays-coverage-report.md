# Stays coverage report

Generated 2026-09-10 by `scripts/qa/stays-coverage.mjs`. Target 10–12 per destination, maximum 12. **Verified** = candidates the discovery agent could confirm as public accommodation with a published coordinate inside the destination; **published** = what the capsule holds after retrieval and generation. Fields are counted from the published records.

| Destination | Candidates | Verified | Published | Coords | Image | Website | Phone | Address | Missing to 10 | Coverage | Notes |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| sikkim | — | 22 | 22 | 2 | 0 | 3 | 21 | 22 | 0 | register | State hospitality register (Tier 1); published as a directory, exempt from the curated ceiling; hub section shows ≤ 12 |
| jaipur | 17 | 4 | 12 | 4 | 2 | 1 | 8 | 8 | 0 | 100% | at target; 10 without a free-licence photograph, 4 without a published number |
| delhi | 12 | 6 | 12 | 6 | 4 | 1 | 6 | 6 | 0 | 100% | at target; 8 without a free-licence photograph, 6 without a published number |
| varanasi | 0 | 0 | 12 | 0 | 0 | 0 | 12 | 12 | 0 | 100% | at target; 12 without a free-licence photograph, 0 without a published number |
| agra | 0 | 0 | 12 | 0 | 0 | 0 | 12 | 12 | 0 | 100% | at target; 12 without a free-licence photograph, 0 without a published number |
| mumbai | 6 | 4 | 12 | 4 | 4 | 3 | 8 | 8 | 0 | 100% | at target; 8 without a free-licence photograph, 4 without a published number |
| kolkata | 7 | 4 | 12 | 4 | 4 | 2 | 9 | 8 | 0 | 100% | at target; 8 without a free-licence photograph, 3 without a published number |
| hyderabad | 6 | 4 | 12 | 4 | 4 | 1 | 8 | 8 | 0 | 100% | at target; 8 without a free-licence photograph, 4 without a published number |
| kochi | 12 | 4 | 12 | 4 | 3 | 0 | 8 | 8 | 0 | 100% | at target; 9 without a free-licence photograph, 4 without a published number |
| goa | 5 | 4 | 12 | 4 | 2 | 3 | 8 | 9 | 0 | 100% | at target; 10 without a free-licence photograph, 4 without a published number |
| kyoto | 15 | 1 | 1 | 1 | 0 | 1 | 0 | 1 | 9 | 8% | verified pool is 1 of 15 candidates (6 not public accommodation, 5 no coordinate (P625)); 1 of 1 have no published number |
| paris | 41 | 33 | 12 | 12 | 12 | 11 | 2 | 6 | 0 | 100% | at target; 0 without a free-licence photograph, 10 without a published number |
| rome | 6 | 5 | 5 | 5 | 3 | 4 | 0 | 0 | 5 | 42% | verified pool is 5 of 6 candidates (1 no coordinate (P625)); 5 of 5 have no published number |
| istanbul | 23 | 10 | 10 | 10 | 7 | 6 | 1 | 2 | 0 | 83% | at target; 3 without a free-licence photograph, 9 without a published number |
| new-york-city | 167 | 100 | 12 | 12 | 11 | 12 | 1 | 8 | 0 | 100% | at target; 1 without a free-licence photograph, 11 without a published number |
| **14 capsules** | 317 | 179 | **148** | | 56 | 45 | **83** | 96 | | | Sikkim's register (22) is additional |

## Why the phone column is small

A telephone number is published only where a source publishes one as a structured claim (Wikidata P1329), verified for shape, country code and placeholder patterns. Hotels' own websites are not scraped for numbers: extracting the wrong line from a page and publishing it against a real business sends a real person to a stranger, and the archive's rule is that absence is published as absence. The website column is the property's own site (P856), checked reachable.

## Why some destinations are below target

Discovery reads English Wikipedia (hotel categories, `{{Infobox hotel}}` search) and Wikidata's geospatial index within 25 km of each centre (Goa 120). Where English Wikipedia documents few hotels in a city — Kyoto's ryokans, Varanasi, Agra — the verified pool is small, and the pool is what is published. Filling to twelve from unverified sources is the one thing this pipeline will not do.

## Rules applied (every run)

- Identity: Wikidata item with an English Wikipedia article; type (P31) is public accommodation — state guest houses, official residences and historic post-stations are excluded.
- Location: P625 present; ≤ 25 km from the destination centre (Goa 120); not (0,0); not the centre itself; not within 25 m of another candidate.
- Website: P856, host answers (bot-blocking 403/405 counts; DNS failure or 404 drops the field).
- Phone: P1329, E.164 shape, country code matches, no placeholder pattern.
- Image: P18 with a free licence on Commons (CC0/PD/CC BY/CC BY-SA), author present where BY requires, ≥ 800 px.
- Duplicates: same item, normalised name, coordinate, website host or phone → the later candidate is dropped.
- Selection: the ≤ 12 best-documented verified candidates, already-published first.
