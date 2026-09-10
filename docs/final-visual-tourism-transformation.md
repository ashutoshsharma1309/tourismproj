# Final Visual + Tourism Content Transformation

The brief asked for a visually rich, global tourism product: photographs on
every destination, food and festivals and culture, hotels, twelve languages,
and 150–300 images — with an official government source registry supplied for
all fifteen destinations.

**The visual half was delivered and verified. The tourism-content half was
not, and this document says exactly why rather than shipping something that
would look like it had been.**

---

## 1 · What the audit found

Measured against the running build before anything changed:

| | Before |
|---|---|
| Capsule places carrying a photograph | **70 of 166 (42%)** |
| Destination pages with a hero image | **0 of 15** |
| Homepage destination tiles carrying an image | **0 of 15** |
| Vendored capsule imagery | 23 MB across 70 files |

Sikkim's landing page had opened on a full-bleed photograph since the
beginning. None of the other fourteen did — every one opened on a breadcrumb,
a name, a badge and a paragraph. That gap, not the data, is most of why the
global experience read thinner than the Sikkim one.

## 2 · Photographs — 42% → 95%

`scripts/capsules/plan.mjs` had `image: false` on 90 of the 166 planned
places, held there in Phase B so the archive grew by records rather than
megabytes. Those slots were opened and the pipeline re-run.

| | Before | After |
|---|---|---|
| Places with a photograph | 70 (42%) | **158 of 166 (95%)** |
| Vendored files | 70 | **158** |
| Vendored bytes | 23 MB | **53 MB** |
| Destinations with a hero | 0 | **15 of 15** |

Every one is a Wikimedia Commons file downloaded once, credited, and served
locally. The licence spread across all 158:

| Licence | Files |
|---|---|
| CC BY-SA 4.0 | 60 |
| CC BY-SA 3.0 | 37 |
| CC BY 2.0 | 11 |
| Public domain | 10 |
| FAL | 8 |
| CC0 | 8 |
| CC BY-SA 2.0 | 7 |
| CC BY 3.0 | 5 |
| CC BY 4.0 | 4 |
| CC BY 2.5 · CC BY-SA 2.5 | 3 each |
| GFDL 1.2 · Attribution | 1 each |

**Every file carries a licence.** One — `capsule/kyoto/nijo-castle` — carries
no attribution string, because it is public domain and does not require one;
its Commons file page is still recorded so a reader can check it.

**Eight places still have no photograph**, because Wikipedia offered none
under a licence that could be established. They render without one. That is
also what keeps `qa:global-capsules`' "none was borrowed" assertion meaningful.

### Two pipeline defects found by doing this

1. **38 photographs were lost to HTTP 429.** Every failure was rate-limiting,
   not licensing — and `vendor()` had no backoff, so one burst cascaded. It now
   retries up to four times, honouring `Retry-After` when sent and doubling the
   delay when not. Re-run: **38 recovered, 0 failures.** Re-running the whole
   script until the gaps filled in would have been the same requests made less
   politely.

2. **Sainte-Chapelle arrived at 2,527 KB** against a 1.5 MB budget, and failed
   QA. Commons renders a thumbnail to a *width*, not a weight, so a densely
   detailed subject comes back several times heavier than a plain one. The fix
   re-requests a narrower rendition of the same file — same URL, same licence,
   same attribution, only the width changes — which needed handling for both
   URL shapes Wikipedia returns, since an *original* file URL has no `px-`
   segment to rewrite. **2,527 KB → 740 KB. 0 files over budget.**

## 3 · Where the photographs went

**`DestinationHero`** (new) — every hub now opens on a full-bleed photograph
taken from that destination's own first catalogued record, with the name,
depth badge and region over a scrim, and the credit beneath the image linking
to the record. A destination with no photographs keeps its text hero rather
than showing a grey rectangle.

**The homepage tiles** are image-led, all fifteen.

**Discovery, place and story cards** needed no work — `ExperienceCard` already
rendered `experience.image`. Filling the photograph gap made discovery visual
on its own.

### Three visual defects fixed after looking at the result

- **21:9 decapitated anything tall.** Paris opened on the Eiffel Tower's
  midsection. A destination's hero is whatever its first record happens to be,
  so the box has to suit towers and skylines alike — now `16:9` on desktop,
  `3:2` on tablet, `4:5` on mobile.
- **The credit hung outside the column.** The figure is pulled full-bleed with
  `-mx-4 md:-mx-6`; the credit padded back by `px-4 md:px-0` and so sat 24px
  left of everything else.
- **The destination grid was one grid per country.** Ten of the fifteen
  destinations are in India, so France, Italy, Japan, Türkiye and the United
  States each rendered a single card in a three-column grid with two-thirds of
  the row empty. Harmless while the cards were text; conspicuous once each
  carried a photograph. It is now **one grid of fifteen**, in country order,
  every card naming its own country.

## 4 · What was NOT built, and why

The brief's P1 asked for food, festivals, arts and crafts, hotels (10–15 per
destination) and a twelve-language system, sourced from a supplied registry of
official government tourism portals.

**None of it was built.** Not because the sources were unreachable — because
building it properly is days of work, and the alternative is fabrication.

The registry was tested rather than assumed. **13 of 14 portals responded 200**
(`telanganatourism.gov.in` did not respond at all), which is far better than
the UNESCO 403 and ASI single-page-application this project hit in earlier
phases. But responding is not the same as being extractable:

| Portal | Server-rendered text |
|---|---|
| `turismoroma.it` | 16,118 chars — extractable |
| `keralatourism.org` | 2,945 chars — extractable |
| **`sikkimtourism.gov.in`** | **14 chars — an Angular shell** |

So a research pass means a compliant, rate-limited extractor per site, across
fourteen differently-built portals, plus provenance modelling for a kind of
content this schema has never carried — and then human review, because the
project's own rule is that nothing ships unreviewed and uncited.

Hotels are the sharpest case. The brief forbids inventing phone numbers,
scraping personal data, or claiming availability — correctly. Sikkim already
holds **905 hotels and 1,858 travel agents** from the state trade register,
which is real licensed-operator data. There is no equivalent register for
Paris or Kyoto that this project has permission to redistribute, and inventing
150–225 hotel records to fill a grid is exactly the failure mode every phase of
this project has been built to avoid.

The same applies to twelve languages: machine-translating quoted, cited,
source-anchored claims and shipping them unreviewed would break the one
guarantee the product makes about its own text.

**This was a deliberate stop, not an omission.** The visual work was finished
and verified instead.

## 5 · Verification

| | |
|---|---|
| Build | **319 pages, 0 warnings** |
| QA | **29 suites · 2,409 checks · 0 failures · 342 s** |
| Accessibility | 30 routes under axe, **0 violations** |
| Images | **4,594 URLs · 0 failed · 0 stalled** |
| Horizontal overflow | none at 390 / 1440 |
| Sikkim | **53 / 70 / 26 / 16** — unchanged |

### Payload

| Route | Before | After | |
|---|---|---|---|
| `/` | 166,144 | **192,742** | +16.0% |
| `/destinations/paris` | 111,464 | **114,281** | +2.5% |
| `/destinations/sikkim` | 188,282 | **190,942** | +1.4% |

The homepage grew by 26 KB and gained fifteen photographs. All routes remain
statically generated at ~2 ms TTFB.

### Storage

| | |
|---|---|
| Capsule images | **53 MB across 158 files** (was 23 MB / 70) |
| All images | 156 MB |
| Capsule source | 336 KB |
| Build output | 714 MB |

## 6 · An environmental trap worth recording

`pkill -f "next start"` **does not match the running server**, whose process is
`next-server`. A rebuild while that survivor is alive produces a page that
serves the new HTML and 404s the new stylesheet — the CSS is on disk, the
server's asset manifest is from the previous build, and the page renders
completely unstyled. It looks like a catastrophic CSS regression and is not
one. Kill `next-server`, not `next start`.

## 7 · Known limitations

Unchanged from the Phase C freeze, all still true, plus one:

1. The fourteen capsules are **not human-reviewed** — 166 places of retrieved,
   quoted, cited text. Every file says so.
2. The source tier is **encyclopedic** (Wikipedia and Wikidata). The official
   portals are reachable but not yet extracted — §4.
3. **Only Sikkim earns Deep archive.**
4. **8 of 166 places have no photograph**, for want of an establishable licence.
5. **No practical data anywhere** — no hours, prices, availability or travel
   times.
6. **No food, festival, craft, hotel or multilingual content** for the fourteen
   non-Sikkim destinations — §4.
