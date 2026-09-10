# Food, Festivals, Crafts, Stays and Twelve Languages

The brief asked for all five. The previous pass had declined them, on the
grounds that doing them properly was days of work and doing them quickly meant
inventing data. The instruction was to add them anyway.

**All five are built, and none of it is invented.** This records what was
retrieved, what the schema refuses to let it become, and the four defects
found on the way.

---

## 1 · What was added

| | Count |
|---|---|
| Food | **90** |
| Festivals | **63** |
| Arts & crafts | **42** |
| Documented stays | **68** |
| New photographs | **234** (178 cultural, 56 stays) |
| Interface languages | **12** |

Every one of the 263 cultural and stay records is a verbatim span quoted from
a cited Wikipedia article, retrieved by script, on exactly the terms the 166
places already were. Nothing was written from memory.

### Per destination

| | Food | Festivals | Crafts | Stays |
|---|---|---|---|---|
| Delhi | 8 | 6 | 4 | 6 |
| Varanasi | 5 | 4 | 2 | **0** |
| Agra | **1** | 4 | 3 | **0** |
| Jaipur | 3 | 5 | 5 | 8 |
| Mumbai | 8 | 5 | 2 | 1 |
| Kolkata | 8 | 5 | 3 | 7 |
| Hyderabad | 6 | 4 | 3 | 4 |
| Kochi | 7 | 5 | 4 | 8 |
| Goa | 6 | 3 | 1 | 4 |
| Kyoto | 7 | 5 | 4 | **0** |
| Paris | 8 | 4 | 3 | 8 |
| Rome | 8 | 4 | 2 | 6 |
| Istanbul | 9 | 5 | 3 | 8 |
| New York City | 6 | 4 | 3 | 8 |

**The zeroes are the point.** Agra has one documented dish, not eight.
Varanasi, Agra and Kyoto have no hotel with a Wikipedia article, so they
render no stays section at all. Filling those cells is the one thing this
product must never do, and the counts above are what honesty looks like in a
table.

## 2 · How the titles were chosen — by resolution, not by assertion

A hand-written list of dishes and hotels is a list of guesses. Three scripts
turn it into a list of articles:

1. **`candidates.mjs`** proposes 268 titles. It asserts nothing about the
   world — only which pages are worth trying.
2. **`check-titles.mjs`** resolves every one against Wikipedia and sorts it
   into real article, redirect, disambiguation page, or nothing. **215
   survived; 53 were dropped.** This step exists because a previous phase
   shipped a capsule built on "Ram Bagh", a disambiguation page that returns
   HTTP 200 and took Agra's whole capsule down.
3. **`discover-stays.mjs`** does not guess hotels at all. It reads
   `Category:Hotels in <place>`.

That third script exists because the guessing failed completely: **31 hotel
titles were proposed and all 31 missed** — not because the hotels lack
articles, but because they live at "Rambagh Palace, Jaipur" and "Falaknuma
Palace" rather than at the names a traveller would say. Reading Wikipedia's
own category returns every documented hotel in a city instead of the handful
somebody thought of, and it cannot invent one.

## 3 · What a stay may not say

The obvious build is a hotel directory: name, address, telephone, rate,
rating, availability, a booking button. Every one of those is data this
project has no licensed feed for, so every one would have to be invented — and
**an invented telephone number for a real hotel sends a real person to a wrong
number.**

So `CapsuleStay` holds what a source publishes: what the property is, when it
opened, where it stands. There is no `phone`, no `rate`, no `rating`, no
`availability`, no `bookingUrl`, and the type cannot express one. `qa:culture`
asserts their absence in both the generated data and the type declaration, so
a future edit cannot quietly add one.

Festivals are constrained the same way. A `season` may say "In October",
quoted from prose; it may not say a date. A specific date is a scheduling
claim with no feed behind it and a shelf life of one year, and the validator
rejects one that looks like a date.

**Sikkim does not use any of this.** Its stays come from the state's
licensed-operator register — 905 hotels with a licence status, a grade and a
real provenance chain. Those are registry data. These are heritage records
that happen to be hotels, and merging the two would let a page render one as
though it were the other.

## 4 · Twelve languages, and the line the translation does not cross

The twelve are not a new decision: they are the set Sikkim's audio guides have
used since Phase 11 — English, Hindi, Bengali, Nepali, Japanese, Korean,
Chinese, Arabic, Russian, German, French, Spanish — in the same order the
guide selector uses. A product that narrates in twelve languages and renders
its buttons in one was only ever half translated.

**27 interface strings × 12 languages, and `qa:culture` checks every cell.**

### The archive is not translated, deliberately

Every factual sentence in this product is a quotation from a named source. A
machine translation of a quotation is a paraphrase with a citation still
attached to it — the citation would be claiming the source said something it
did not. So the interface translates and the archive does not, and the page
says so **in the reader's own language**.

The suite's central check is exactly this: a place summary is read from the
English page and must appear *byte-identical* on the Japanese one. If it ever
differs, something has translated a quotation.

### Why the language is in the path

`/l/ja/destinations/paris`, not `/destinations/paris?lang=ja`.

A static page is one file per path. Any per-request variation — a search
parameter, a cookie, a header — makes the route render on demand. Measured on
this page: **2 ms of prerendered HTML became 78 ms of server render.**

More than speed, the query-parameter version cost an invariant. `qa:destination`
asserts that all fifteen destinations exist as prerendered HTML, which is how a
destination that silently stops resolving gets caught. A dynamic route has no
prerendered file, so that check would have had to be rewritten to accommodate
my own change — which is how a test suite stops being evidence.

Putting the language in the path keeps everything static: English stays on the
canonical URL with its prerendered file, and the other eleven are built as
**165 additional static pages**. Arabic gets `dir="rtl"`; it is the only one of
the twelve that needs it.

The switcher sits on the destination hub rather than in the global header,
because only the hubs are translated — a header control would have offered
twelve languages on every page in the product and eleven of them would have
been a 404.

## 5 · Four defects found by building it

1. **Stay candidates were being published as dishes.** The resolved-title file
   also holds the hotel names that happened to resolve, and the first version
   of the retrieval treated everything in it as culture. Kind `stay` reached
   the culture array; the generator now filters, and the retrieval no longer
   collects them twice.

2. **Two candidates can be one article.** "Marble inlay" redirects to "Pietra
   dura", "Yudofu" redirects to "Tofu" — so Agra proposed the same craft twice
   and Kyoto the same dish twice. Both produced a duplicate id, **the validator
   rejected the whole capsule, and Agra's discovery page 404'd.** That is the
   validator working exactly as designed and the wrong place to find out.
   Deduplicated now at both the resolver and the generator — including the
   citation list, which needed its own pass.

3. **An empty result that looks like a finding.** `discover-stays.mjs`
   reported that Paris, Rome, Istanbul, Kyoto and New York City had no
   documented hotels. They have 35, 6, 19, 0 and 98. The function returned
   `[]` for any non-ok response, so "you are making too many requests" was
   indistinguishable from "no such category". It now backs off and throws
   rather than reporting a false zero — the same lesson as the image
   rate-limiting in the previous pass, in a new place.

4. **The validator threw on its own fixtures.** Adding `culture` and `stays`
   to the duplicate-id loop without a `?? []` meant `validateCapsule` crashed
   on any capsule written before those fields existed. A validator that
   throws on an old shape cannot report what is wrong with it.

## 6 · Verification

**30 suites · 2,555 checks · 0 failures.** `qa:culture` is new: 145 checks
across the records, the forbidden fields, the season rule, all twelve
dictionaries, and the untranslated-archive guarantee.

| | |
|---|---|
| Build | **484 pages**, 0 warnings |
| English hubs prerendered | **15** — unchanged |
| Translated hubs prerendered | **165** |
| Images | **6,691 URLs · 0 failed · 0 stalled** |
| Capsule images | 392 files, 135 MB |
| Capsule source | 500 KB |
| TTFB | ~4 ms, English and translated alike |

### Four QA assertions were re-pointed, and why

The hub's body moved into `DestinationHubPage` so that both routes could
render it. Four source-reading assertions were looking for that code in
`page.tsx`:

- `qa:route-migration` — resolves through the canonical resolver
- `qa:global-explore` — unregistered destinations 404
- `qa:experience` — knowledge renders whether or not narrative exists
- `qa:ux` — the keyboard-disclosure check

The first three assert **the same facts against the file that now performs
them**; none was weakened. The fourth was different: it took the first
`<details>` on the page, which stopped being a claim group the moment the
language switcher — also a disclosure widget — appeared above it. Claim groups
now carry `data-claim-group` and the test targets that, which is a more precise
check than the one it replaces.

## 7 · An environmental trap, confirmed

Two suites timed out at 900 s and a `qa:images` run reported a single image
stalled for **220 seconds**. The file is 724×1086 and 1 MB — nothing about it
is slow. It was a wedged image-optimizer cache key, the failure Phase C
documented. Clearing `.next/cache/images`, restarting and re-warming took
`qa:a11y` from a 918 s timeout to **87 s**.

Separately: a `.next` built while a server is still alive produces a **22 KB
shell** where the prerendered page should be — right title missing, content
absent — while the served page is perfectly correct. Several suites read build
output, so they fail in ways that look like application defects and are not.
Build with no server running, and verify: from a clean build
`destinations/paris.html` is 190 KB.

## 8 · Known limitations

1. The capsules remain **not human-reviewed** — now 166 places, 195 cultural
   records and 68 stays of retrieved, quoted, cited text.
2. The source tier is still **encyclopedic**. The official government portals
   are reachable but unextracted; see
   [final-visual-tourism-transformation.md](final-visual-tourism-transformation.md) §4.
3. **Only the destination hubs are translated.** Discovery, the planner,
   search and Sikkim's deep pages remain English-only. Extending the
   translation is more static pages of the same shape, not a new mechanism.
4. **Agra has one documented dish; Varanasi, Agra and Kyoto have no stays.**
   Real gaps, shown as gaps.
5. The interface translations are **unreviewed by native speakers**. They are
   27 short UI strings, not prose, but nobody has checked them.
