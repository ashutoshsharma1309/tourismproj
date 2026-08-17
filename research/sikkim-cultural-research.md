# Sikkim cultural research — Stories of Sikkim

**Research and build date:** 17 August 2026
**Agent:** `npm run agent:research` (`scripts/sikkim-cultural-research.mjs`)
**Machine-readable output:** `reports/cultural-research.json`, `src/data/generated/story-images.json`

This file records how the Stories of Sikkim archive was researched, what was
accepted, what was rejected, and what remains uncertain. It exists so that any
claim on the site can be traced back to the page it came from, and so that the
next person to extend the archive knows which ground has already been walked.

---

## 1. What was built

| | |
| --- | --- |
| Stories published | **70** |
| Categories | **19** |
| Communities represented | **11** |
| Distinct source URLs cited | **100**, all verified reachable on 17 Aug 2026 |
| Stories citing at least one government source | **44** |
| Photographs, each with author and licence | **38** resolved from Wikimedia Commons |
| Map sites with a published coordinate | **46** (8 monasteries + 38 places) |

Claim labelling across the 70 stories: 58 historical record, 8 oral tradition,
2 legend, 2 travel story. Verification status: 60 `verified`, 10
`community-attested` (the practice is documented; the narrative is the
community's own).

Community coverage, counted by story: Bhutia 35, Lepcha 24, shared/all 15,
Nepali 14, Limbu 14, Rai 6, Sherpa 6, Tamang 6, Magar 4, Gurung 3, Newar 2.

---

## 2. Sources consulted

### Tier 1 — Government

| Source | URL | What it backs here |
| --- | --- | --- |
| Government of Sikkim — Festivals in Sikkim | https://www.sikkim.gov.in/KnowSikkim/about-sikkim/festivals-in-sikkim | Twenty-two observances and, critically, **which community keeps each one**. The spine of the festivals category. |
| Sikkim Tourism — Folk dances of Sikkim | https://sikkimtourism.gov.in/about/dances | Eleven folk dances with community attribution and instruments. |
| Sikkim Tourism — Cuisine of Sikkim | https://sikkimtourism.gov.in/about/cuisine | The state's own framing of its cuisine, the foraged pantry, local beverages, signature dishes. |
| Sikkim Tourism — About Sikkim | https://sikkimtourism.gov.in/about/sikkim | Three-community framing, spoken-language shares, state symbols, district permit arrangements. |
| Sikkim Tourism — Do's and Don'ts | https://sikkimtourism.gov.in/do-and-do-not | Monastery etiquette, photography rules, plastic restrictions, permits, altitude safety. |
| Utsav (Ministry of Tourism, GoI) — Pang Lhabsol | https://utsav.gov.in/view-event/pang-lhabsol-1 | Pang Lhabsol: Lhatsun Chenpo's vision at Dzongri, the Pangtoed dance, the masks of Khangchendzonga and Yabdu, Mahakala's entry, the Tsuklakhang venue. Listed by Sikkim's Tourism & Civil Aviation Department. |

**Access note worth recording.** `sikkimtourism.gov.in` is an Angular
single-page application: a plain fetch returns only the shell, and the readable
content is embedded in `main-*.js`. The dance, cuisine, about-Sikkim and
conduct content used here was extracted from that bundle and cited to the route
that renders it. `www.sikkim.gov.in/KnowSikkim/...` is server-rendered but
answers `HEAD` with **404** while answering `GET` with **200** — the
verification pass now falls back to a ranged GET for exactly this reason.

### Tier 2 / 3 — Reference

Ninety-four English Wikipedia articles were read in full (not just leads) and
are cited per story, per claim. The full list with per-article status is in
`reports/cultural-research.json`. Wikipedia is treated as a tertiary source:
where it is the only support for a culturally sensitive claim, the story is
labelled `oral tradition` or `legend` rather than presented as settled history.

Coordinates for all 38 mapped places come from the coordinate published by the
cited Wikipedia article, retrieved via the MediaWiki API — never estimated from
a map.

### Tier 4 — Community sources

None cited. Reddit, forums and travel blogs were **not** used, including for
discovery. Everything in the archive traces to Tier 1–3.

---

## 3. Photography

All 38 photographs are Wikimedia Commons files resolved by the research agent,
which reads licence and author from Commons' own `extmetadata` and
HEAD-verifies each URL. Licences in use: CC BY 2.0/3.0/4.0, CC BY-SA
2.0/3.0/4.0, CC0, and one public-domain file. Attribution and licence render
beneath every hero image.

The rule applied when choosing: **the photograph must depict the story's own
subject.** Three festivals have no openly licensed photograph anywhere on
Commons — Pang Lhabsol, Losoong, and the Saga Dawa procession in Gangtok.
Those stories show the place the observance is held and carry an explicit
`imageNote` saying so, rather than borrowing an unrelated monastery view.

One image is a colonial-era studio portrait (Lepcha woman, 1860s, Rijksmuseum,
CC0). It is captioned as a historical document, not as a picture of Lepcha life
today.

---

## 4. Story inventory

Total: 70 stories in 19 categories

### Lepcha Heritage (2)

| Story | Read as | Communities | Sources |
| --- | --- | --- | --- |
| [The people who say they never arrived](/stories/the-people-who-say-they-never-arrived) | documented history | Lepcha | 3 |
| [The valley reserved for the Lepchas](/stories/the-valley-reserved-for-the-lepchas) | documented history | Lepcha | 3 |

### Bhutia Heritage (2)

| Story | Read as | Communities | Sources |
| --- | --- | --- | --- |
| [People of the rice valley](/stories/people-of-the-rice-valley) | documented history | Bhutia | 3 |
| [The village that governs itself](/stories/the-village-that-governs-itself) | documented history | Bhutia | 3 |

### Nepali Heritage (1)

| Story | Read as | Communities | Sources |
| --- | --- | --- | --- |
| [Who the 'Nepali' of Sikkim actually are](/stories/who-the-nepali-of-sikkim-actually-are) | documented history | Nepali, Rai, Limbu, Tamang, Gurung, Magar, Newar, Sherpa | 4 |

### Folklore & Oral Tradition (2)

| Story | Read as | Communities | Sources |
| --- | --- | --- | --- |
| [The scripture that is sung, not read](/stories/the-scripture-that-is-sung-not-read) | oral tradition | Limbu, Rai | 3 |
| [The shaman who lives in the forest](/stories/the-shaman-who-lives-in-the-forest) | legend | Rai, Limbu, Nepali | 2 |

### Traditional Knowledge (1)

| Story | Read as | Communities | Sources |
| --- | --- | --- | --- |
| [The healers Sikkim still keeps](/stories/the-healers-sikkim-still-keeps) | oral tradition | Lepcha, Limbu, Rai, Tamang, Gurung, Magar | 4 |

### Festivals (14)

| Story | Read as | Communities | Sources |
| --- | --- | --- | --- |
| [Why a mountain commands an army](/stories/why-a-mountain-commands-an-army) | documented history | Bhutia, Lepcha, Nepali | 2 |
| [Two days before the new year, evil is destroyed](/stories/two-days-before-the-new-year-evil-is-destroyed) | documented history | Bhutia, Sherpa | 3 |
| [The harvest, the archers and the burning effigy](/stories/the-harvest-the-archers-and-the-burning-effigy) | documented history | Bhutia, Lepcha | 3 |
| [A prophecy read in water](/stories/a-prophecy-read-in-water) | oral tradition | Bhutia, Lepcha | 1 |
| [The month that counts three times](/stories/the-month-that-counts-three-times) | documented history | Bhutia, Sherpa, Tamang | 2 |
| [The hill that saved the Lepchas](/stories/the-hill-that-saved-the-lepchas) | oral tradition | Lepcha | 4 |
| [Dancing the year into the ground](/stories/dancing-the-year-into-the-ground) | documented history | Rai | 3 |
| [The rain king's festival, kept in Sikkim](/stories/the-rain-kings-festival-kept-in-sikkim) | documented history | Newar | 3 |
| [A dip where two rivers meet](/stories/a-dip-where-two-rivers-meet) | documented history | Nepali, Magar | 2 |
| [Three new years in one winter](/stories/three-new-years-in-one-winter) | documented history | Tamang, Gurung, Sherpa | 4 |
| [Fifteen days of Dashain, five of Tihar](/stories/fifteen-days-of-dashain-five-of-tihar) | documented history | Nepali | 4 |
| [Eight tantric gods and a bonfire](/stories/eight-tantric-gods-and-a-bonfire) | documented history | Bhutia | 3 |
| [Two festivals the tourist calendar misses](/stories/two-festivals-the-tourist-calendar-misses) | documented history | Limbu, Magar | 3 |
| [The Buddhist year in four days](/stories/the-buddhist-year-in-four-days) | documented history | Bhutia | 3 |

### Folk Music & Dance (4)

| Story | Read as | Communities | Sources |
| --- | --- | --- | --- |
| [Eleven dances, and who they belong to](/stories/the-eleven-dances-of-three-communities) | documented history | Lepcha, Bhutia, Nepali, Limbu, Tamang | 2 |
| [The dance that worships a snowy range](/stories/the-dance-that-worships-a-snowy-range) | documented history | Lepcha | 3 |
| [The drum no celebration is complete without](/stories/the-drum-no-celebration-is-complete-without) | documented history | Tamang | 3 |
| [The drum you wear](/stories/the-drum-you-wear) | documented history | Limbu | 2 |

### Art & Craft (1)

| Story | Read as | Communities | Sources |
| --- | --- | --- | --- |
| [Painting on cotton and silk](/stories/painting-on-cotton-and-silk) | documented history | Bhutia | 4 |

### Languages & Script (3)

| Story | Read as | Communities | Sources |
| --- | --- | --- | --- |
| [The scholar killed for an alphabet](/stories/the-scholar-killed-for-an-alphabet) | documented history | Limbu | 3 |
| [An alphabet turned on its side](/stories/an-alphabet-turned-on-its-side) | documented history | Lepcha | 3 |
| [Twelve official languages in one small state](/stories/twelve-official-languages-in-one-small-state) | documented history | Shared | 4 |

### Food & Flavours (7)

| Story | Read as | Communities | Sources |
| --- | --- | --- | --- |
| [Sikkim eats what the road brought](/stories/sikkim-eats-what-the-road-brought) | documented history | Shared | 4 |
| [Why Sikkim ferments almost everything](/stories/why-sikkim-ferments-almost-everything) | documented history | Limbu, Rai, Nepali, Lepcha | 4 |
| [The ring of bread that means it's Tihar](/stories/the-ring-of-bread-that-means-its-tihar) | documented history | Nepali | 2 |
| [The cheese you chew for five hours](/stories/the-cheese-you-chew-for-five-hours) | documented history | Bhutia, Nepali | 3 |
| [The drink you sip through a straw](/stories/the-drink-you-sip-through-a-straw) | documented history | Limbu, Bhutia | 3 |
| [The tea garden a king planted for refugees](/stories/indias-only-himalayan-tea-garden) | documented history | Sherpa, Bhutia | 2 |
| [What grows wild and gets eaten](/stories/what-grows-wild-and-gets-eaten) | documented history | Lepcha, Limbu, Nepali | 5 |

### Nature & Culture (4)

| Story | Read as | Communities | Sources |
| --- | --- | --- | --- |
| [The terraces that turned organic](/stories/the-terraces-that-turned-organic) | documented history | Nepali, Lepcha, Limbu | 5 |
| [The park that is both nature and culture](/stories/the-park-that-is-both-nature-and-culture) | documented history | Shared | 4 |
| [Four kilometres through rhododendron](/stories/four-kilometres-through-rhododendron) | travel story | Sherpa, Nepali | 4 |
| [Life at the top of the road](/stories/life-at-the-top-of-the-road) | documented history | Bhutia | 5 |

### Sikkim History (7)

| Story | Read as | Communities | Sources |
| --- | --- | --- | --- |
| [The throne of stone at Norbugang](/stories/the-throne-of-stone-at-norbugang) | documented history | Bhutia, Lepcha | 3 |
| [The treaty sworn at Kabi](/stories/the-treaty-sworn-at-kabi) | documented history | Lepcha, Bhutia | 3 |
| [The capital the Gurkhas burned](/stories/the-capital-the-gurkhas-burned) | documented history | Bhutia, Limbu | 2 |
| [The Dharma Kings](/stories/the-dharma-kings) | documented history | Bhutia | 3 |
| [The year the kingdom became a state](/stories/the-year-the-kingdom-became-a-state) | documented history | Shared | 3 |
| [The old road to Lhasa, and its thirty-two hairpins](/stories/the-old-silk-route-over-zuluk) | documented history | Bhutia | 4 |
| [The pass that reopened after forty-four years](/stories/the-pass-that-reopened-after-forty-four-years) | documented history | Bhutia, Shared | 2 |

### Heritage Trails (4)

| Story | Read as | Communities | Sources |
| --- | --- | --- | --- |
| [The seven stops of the West Sikkim circuit](/stories/the-seven-stops-of-the-west-sikkim-circuit) | documented history | Bhutia, Lepcha | 4 |
| [A day on foot in Gangtok](/stories/a-day-on-foot-in-gangtok) | travel story | Shared | 5 |
| [South Sikkim's two hills](/stories/south-sikkims-two-hills) | documented history | Nepali, Bhutia, Lepcha | 5 |
| [A route through Lepcha country](/stories/the-lepcha-heritage-trail) | documented history | Lepcha | 5 |

### Markets & Community Life (1)

| Story | Read as | Communities | Sources |
| --- | --- | --- | --- |
| [Where the hills come to sell](/stories/where-the-hills-come-to-sell) | documented history | Shared | 5 |

### Responsible Tourism (3)

| Story | Read as | Communities | Sources |
| --- | --- | --- | --- |
| [How to be a guest in a monastery](/stories/how-to-be-a-guest-in-a-monastery) | documented history | Shared | 2 |
| [Leave no trace is state policy here](/stories/leave-no-trace-is-state-policy) | documented history | Shared | 3 |
| [What you actually need a permit for](/stories/what-you-actually-need-a-permit-for) | documented history | Shared | 2 |

### Sacred Landscapes (5)

| Story | Read as | Communities | Sources |
| --- | --- | --- | --- |
| [The five treasures of the great snow](/stories/the-five-treasures-of-the-great-snow) | documented history | Bhutia, Lepcha, Shared | 3 |
| [The lake where no leaf floats](/stories/the-lake-where-no-leaf-floats) | oral tradition | Lepcha, Bhutia | 1 |
| [The lake that would not freeze](/stories/the-lake-that-would-not-freeze) | oral tradition | Bhutia, Shared | 2 |
| [A lake that was read like a book](/stories/a-lake-that-was-read-like-a-book) | oral tradition | Bhutia, Nepali, Shared | 3 |
| [The four points of the hidden valley](/stories/the-four-points-of-the-hidden-valley) | oral tradition | Bhutia, Lepcha | 4 |

### Monastery Heritage (4)

| Story | Read as | Communities | Sources |
| --- | --- | --- | --- |
| [The relics that crossed the mountains](/stories/the-relics-that-crossed-the-mountains) | documented history | Bhutia | 3 |
| [A heaven carved by one man](/stories/a-heaven-carved-by-one-man) | documented history | Bhutia | 4 |
| [The lama who could fly](/stories/the-lama-who-could-fly) | legend | Bhutia | 3 |
| [The monastery at the centre of the compass](/stories/the-monastery-at-the-centre-of-the-compass) | documented history | Bhutia, Lepcha | 1 |

### Architecture (3)

| Story | Read as | Communities | Sources |
| --- | --- | --- | --- |
| [What a gompa actually is](/stories/what-a-gompa-actually-is) | documented history | Bhutia | 4 |
| [Reading the roadside](/stories/reading-the-roadside) | documented history | Bhutia, Lepcha | 4 |
| [A house with no nails](/stories/a-house-with-no-nails) | documented history | Lepcha, Limbu | 2 |

### Heritage Preservation (2)

| Story | Read as | Communities | Sources |
| --- | --- | --- | --- |
| [The institute that digitises what it cannot save](/stories/the-institute-that-digitises-what-it-cannot-save) | documented history | Bhutia, Shared | 3 |
| [Why any of this needs documenting](/stories/why-any-of-this-needs-documenting) | documented history | Shared | 2 |

---

## 5. Information rejected

| Rejected | Why |
| --- | --- |
| Wikipedia's `Momo` page as a source for the dumpling | It is a **disambiguation page**, not an article about the food. Momo is instead cited to Sikkim Tourism's cuisine page and to `Sikkimese cuisine`. |
| Wikipedia's `Sinki` page | Also a disambiguation page (Polish villages). Sinki is mentioned only where `Sikkimese cuisine` lists it. |
| Named per-year Gregorian dates for lunar festivals | Losar, Losoong, Bhumchu, Saga Dawa, Pang Lhabsol, Lhabab Duechen and Drukpa Tshechi all follow the Tibetan lunar calendar. Each story gives the lunar position and the usual Gregorian window; none invents a date for a specific year. |
| A "Dzongu" Wikipedia article | No such article exists. The Dzongu story is built from `Indigenous peoples of Sikkim` (the reserve, and the dam threat) plus `Lepcha people`. |
| Tendong Hill as a standalone article | No article at that title. The festival is cited to `Tendong Lho Rumfaat` and to the Government of Sikkim festivals page. |
| Barsey Rhododendron Sanctuary under that spelling | Article is at `Varsey Rhododendron Sanctuary`; both spellings are given in the story. |
| Any Reddit, forum or blog claim | Not used at all, per the source hierarchy. |
| A "Maruni is Sikkim's oldest Nepali dance" claim | Asserted only in a Commons uploader's file description. The photograph is used; the claim is not repeated. |
| Dubdi Monastery's published coordinate | Kept excluded upstream: the coordinate published for it conflicts with its known location above Yuksom, so it stays off the map (a pre-existing finding of this project, re-confirmed). |
| Any medical claim about traditional healing | The bongthing/mun/jhākri story is framed as cultural heritage. Published ethno-medicinal claims about tongba are reported as *published claims*, explicitly not endorsed. |

---

## 6. Information flagged as uncertain

These are live in the archive **with the uncertainty on the page**, not resolved
silently:

1. **Lepcha origins.** Scholarship proposes migration routes (via Cambodia, the
   Ayeyarwady, the Patkoi range); the Lepchas hold that they are autochthonous.
   Both are stated; neither is declared the answer.
2. **The 1975 referendum.** Chronology and official figures are given. Whether
   the vote was free is contested, and the story says so and stops.
3. **The Bhumchu vase lineage.** Traced in tradition to Padmasambhava in the
   8th century. Labelled `oral tradition`; what is documented is the ceremony,
   its calendar position and its continuity.
4. **Khecheopalri's origin and shape.** At least six accounts exist (Tara's
   footprint, Shiva's, the Buddha's, the conch shells, the lost gem). All are
   listed as legends; the 2001 protection notification is the documented fact.
5. **Gurudongmar's dedication.** Buddhist tradition names Padmasambhava; an
   Indian Army regiment at the lake maintains a Guru Nanak connection. Both are
   recorded, neither adjudicated.
6. **The Lepcha and Limbu script attributions.** Lepcha is ascribed either to
   Chakdor Namgyal (early 18th c.) or Thikúng Men Salóng (17th c.); the 9th-century
   Limbu script Sirijunga claimed to have "rediscovered" has no surviving evidence.
   Both uncertainties are stated in the stories.
7. **The 17th Karmapa controversy** at Rumtek is noted without taking a side.

---

## 7. Gaps this archive would like closed

- Monastery-confirmed visiting hours. Sikkim Tourism publishes none, and
  aggregator reports contradict one another.
- An openly licensed photograph of Pang Lhabsol, Losoong, or the Saga Dawa
  procession.
- Coordinates for the catalogued monasteries currently unmapped.
- Audio recordings of Sakewa *sili*, Chyap-Brung and Naumati Baja.
- A Government of Sikkim festival calendar with dates for the current year.
- The gazetted text of the Sikkim Registration of Tourist Trade Rules, 2025,
  rather than press reporting of it.
- Tribal Research Institute publications on Lepcha and Limbu folklore, which
  are referenced widely but not published at a stable public URL.

Contributions go through the curator's review queue at `/preservation/review`.

---

## 8. How to re-verify

```bash
npm run agent:research              # images + every cited URL
npm run agent:research -- --sources # URL verification only
npm run agent:research -- --images  # re-resolve Commons files and licences
BASE=http://localhost:3000 node scripts/qa/stories-map-flows.mjs
```

The flow test covers 46 checks: the archive header's own counts, search,
faceted filters, first-click navigation from card to the correct story, claim
labels, key facts, source links, image credits, prev/next, related stories,
story→map deep links, map markers and tiles on first paint, marker selection,
Google Maps links, layer filtering, natural-language proximity search
("lakes near Gangtok"), map→story navigation, the mobile filter drawer and
bottom sheet, console and network cleanliness, and horizontal overflow at
375/390/430/768/1024/1280/1440px.
