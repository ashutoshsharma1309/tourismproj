# TerraStory — UX / Media / Stays pass: status report

**Date:** 2026-09-09 (second pass)
**Verified against:** production build **`C_m1h6YLt90_c7uJMUpTM`** (clean `next build` 2026-09-10, served by a freshly started `next start` — see §22 for why "freshly started" matters). Every surface and suite below was re-run against that build.
**Concurrent session:** `tourismproj-a3` worked the same tree throughout (archive, stories, history, media pipeline, search index). Their changes are noted where they touch a finding here; nothing below claims their work.
**Scope honesty:** where the brief asked for research I could not verify (stays, archives, official-source local picks), the deliverable is the *infrastructure* — agents that inspect real data and fail on real defects — plus honest linking of assets that already exist. Nothing is estimated; every number was measured.

---

## 1. UX changes (summary)

| Request | Status | Evidence |
|---|---|---|
| 13 — Varanasi "Monasteries" | **Fixed, root-caused** (§13) | 0 occurrences on Varanasi/Kyoto/Paris plans; day now "Sacred sites — …" |
| 1 — Remove Sound control | **Done** (§2) | `Immersive sound` = 0 in DOM; component, constant, mount removed |
| 2 — Ask the Guide circular | **Done** (§3) | `rounded-full size-12 sm:size-14`, safe-area insets, `aria-label` + `title` |
| 10 — Remove "Add to journey" | **Declined on inspection** (§20) | It is the journey's only entry point |
| 6 — History images | **Done by derivation** (§7) | 6/6 Kyoto cards, 6/6 Varanasi cards carry the related place's photo |
| 9 — Compare | **Done, data-derived** (§15) | "Strongest for" per interest; counts, ties stated; no budget (no sourced cost data) |
| 14 — Destination taxonomies | **Done, data-derived** (§6) | `?type=` filter; chips from each destination's own `typeLabel`s |
| Media Quality Agent | **Built** (§8) | `qa:media` 7/7; found 2 false photographs + 3 licence breaches |
| Search QA Agent | **Built** (§14) | `qa:search` 14/14 on current source; found 2 unlabelled Sikkim shortcuts |
| Lint | **Fixed** (§22) | 10 → 0 errors |
| Server reaping | **Diagnosed + mitigated** (§20) | supervised restart loop; cause identified with a3 |
| Hero crops (user screenshot: Statue of Liberty headless) | **Fixed** (§7a) | 4 of 15 slides were portrait photos in a landscape frame; now 0 of 15, verified in-browser |

## 2. Sound removal (Request 1)

`AmbientAudio` was a floating ambient-noise mixer (bottom-left sliders + "Immersive sound" pill), mounted once in `src/app/(v1)/layout.tsx`. Distinct from the heritage narration (`HeritageAudioPlayer`, 180 `.m4a` files), which stays. Removed: mount + import, `src/components/immersive/AmbientAudio.tsx`, `AMBIENT_SOUNDS` in `src/lib/constants.ts`. Zero references remain in `src/`.

## 3. Ask the Guide redesign (Request 2)

`TripGuide.tsx` launcher: 48px text pill → circle (`size-12`, `sm:size-14`), `bottom`/`right` = `max(1rem, env(safe-area-inset-*))`, label in `aria-label` + `title` + `sr-only`, visible focus ring, `motion-safe` hover. `qa:intelligence` (opens the guide by accessible name) passes 24/24. Verified clear of content at 1440 and 390. a3 subsequently made the guide destination-aware in the same file; both changes merged cleanly.

## 4. Dashboard improvements (Request 3)
**Not done.** The Places section already leads the hub; no hierarchy rework beyond §7.

## 5. Archive improvements (Request 4)
**Not done by this session.** a3 owned the archive pipeline throughout (224 vendored objects, per-destination archive pages, `qa:archive`). I stayed off those files.

## 6. Places / taxonomy improvements (Requests 5, 14)

`src/app/(v1)/destinations/[destinationId]/discover/page.tsx` now derives a **kind-of-place taxonomy from the destination's own records**: `typeLabel` counts across its experiences become a second chip row ("By kind of place") and a `?type=` filter that composes with `?interest=`. Nothing is a global list — a kind appears only because a record of that kind exists.

Verified: Kyoto offers Temple 8 · Food 6 · Festival 5 · Craft 4 · Shrine 2 · Castle · District · Market · Palace · Walk; Varanasi offers Ghat · Temple · Mosque · Fort · Heritage site · Food · Festival · Craft. `?type=Temple` on Kyoto renders 8 distinct places, all `Temple`; `?type=Temple&interest=sacred` → 8; interest chips carry the active type. A narrowed view shows the whole set rather than the 3-per-group preview.

## 7. History image improvements (Requests 6, 8)

No event carries a photograph of its own — nothing in the archive photographs "AD 711" — but every capsule event names the places it concerns (`relatedPlaces`), and those places carry verified, credited photographs. `DestinationHighlights` now shows the first related place that has one, captioned **"Photograph: <place>"** so it never claims to depict the event. An event naming no photographed place gets no image. Zero new assets; zero new claims.

Verified on dev: Kyoto 6/6 cards (Fushimi Inari-taisha, Sanjūsangen-dō, Nanzen-ji, Kyoto Imperial Palace ×2, Philosopher's Walk); Varanasi 6/6. Sikkim's deep-format events reference monasteries via a separate field and are not covered by this — honest gap.

### 7a. Hero photograph orientation (user screenshot, 2026-09-10)

The rotating hero chose each destination's *first* catalogued place with a photograph and rendered it `object-cover` at its geometric centre. Four of the fourteen capsule picks were **portrait** — Charminar 1920×2712, Kinkaku-ji 1920×2880, Statue of Liberty 1920×2942, Eiffel Tower 1920×3198 — and a 3:2 window cannot contain a 2:3 subject: the Statue showed as robe and tablet with no head or torch. No focal point fixes that. `GlobalHero` now takes the first place whose photograph **suits a wide frame** (`suitsWideFrame`, ratio ≥ 1.2 from `image-focal.json`), falling back to the first photograph only where none does; `HeroRotator` also applies the manifest's `objectPositionFor` so a wide-but-tall image crops toward its subject. Every destination had a landscape alternative (NYC 8, Paris 9, Kyoto 12, Hyderabad 10). Verified by stepping through all 15 slides in a browser and reading each image's natural dimensions: **0 of 15 below 1.2** (was 4). New picks: Ginkaku-ji, Ellis Island, the Louvre, Qutb Shahi Tombs; Mumbai's square Gateway of India (1.00) gave way to Marine Drive.

## 8. Media audit (Media Quality Agent)

`scripts/qa/media-integrity.mjs` (`npm run qa:media`) — the offline half of the agent, over **927 referenced files** across capsules, deep data, and generated JSON. Hard checks: file exists; no capsule path under two destinations; alt text on every capsule photo; no SVG as a photograph; credit entries carry license + source URL + attribution *where the licence requires it* (PD/CC0 exempt); every raster decodes; no **place or stay** photo byte-identical to a file under another destination. Advisories: uncredited files (union of all four credit files, recursive), under-width per slot, extreme aspect, within-destination duplicates, and **culture images shared across destinations printed with their Commons title** — the check that settles depiction by provenance. Per-capsule coverage table. It deliberately does not judge depiction itself.

**Note:** this file overwrote an 800-check suite a3 had written at the same path minutes earlier; a3 restored theirs as `scripts/qa/media-provenance.mjs` (`qa:media-provenance`, 800/0) and both are registered in `qa:final`. They are complementary: theirs does Commons-name and blank-frame (stdev) checks; mine does structure, licence, and cross-destination identity.

**Result: 7 passed, 0 failed.** The only advisory remaining is the three files in §9.

## 9. Media replacements (all by provenance, none by guess)

| Record | Finding | Action |
|---|---|---|
| agra / craft "Zari" | byte-identical to varanasi/craft-banarasi-sari; Commons title *"'Sari' from Varanasi… silk and gold"* — a Varanasi textile on an Agra craft | image removed, record kept, comment left |
| delhi + jaipur / craft "Minakari" | shared file; Commons title *"Meenakaari art from Iran"* — Persian work on Indian craft records | image removed from both |
| istanbul food-doner-kebab, food-simit; kyoto festival-hanami | CC BY-SA with **no author** on Commons (Artist/Attribution empty; uploader ≠ verified author) — published without attribution breaches the licence | a3 pruned the credit rows, un-imaged the stories at the builder (structural rule: a hero with no credit row loses the image), JPGs to be deleted with the final rebuild |
| kyoto food-kaiseki; arch/manuscript | attribution missing; Commons Attribution = "Chris 73 / Wikimedia Commons"; Credit = wellcomeimages.org | a3 set "Chris 73 / Wikimedia Commons" and "Wellcome Collection" verbatim |

Advisory, left as-is with the Commons title recorded: one Diwali photo on 4 destinations, one Mughlai dish on 2, one chaat on 2, one Eid on 3, one kundan on 2 — cuisine/festival images, defensible, but "same generic image everywhere" for Diwali.

## 10. Stay coverage (Request 11)

**Superseded by `docs/stays-implementation-report.md` (2026-09-10).** Stays were researched and published through two verified paths — Wikipedia/Wikidata for all capsules and the Ministry of Tourism's NIDHI+ register for the nine Indian capsules. Result: **170 stays** (148 capsule + Sikkim's 22), all ten Indian destinations at the ceiling of twelve, **104 with a published telephone number**; Kyoto 1, Rome 5, Istanbul 10 remain below target because their documented pools are that size.

## 11. Stay verification

`qa:stays` — **14 passed, 0 failed**. One dead link fixed in the prior pass (Rome Aldrovandi, `www.` host → apex).

## 12. Local Picks (Request 12)
**Not built, deliberately.** Capsule sources are 454 Wikipedia · 68 Wikidata · 1 UNESCO — **zero official tourism bodies**. A "Local Picks — highlighted by official sources" section would be relabelled Wikipedia, and the experiences it would show already render on every hub via `discoveryGroups`. This needs research against official sources, none of which exist in the corpus.

## 13. Search bug root cause (Request 13)

Not a search, tokenizer, index, or leakage bug. Hardcoded Sikkim vocabulary in the **planner**: `itinerary.ts` `dayTitle()` titled every all-sacred day `"Monasteries and sacred sites"`; the plan-page intro said "the same **monastery**, place, story…". Fixed to derive from record types (`Ghats`, `Temples`, `Shrines`; several sacred kinds → "Sacred sites"). Verified 0 occurrences on production. Two further instances found this pass, both in the Compare page shown for any set of destinations: the table's first sublabel read "**Monastery** and place records", and the closing explanation read "catalogued **monastery** and place records" — both now say "place records" (monasteries are catalogued places, so Sikkim's copy stays true). Four hardcoded uses of one destination's vocabulary in shared surfaces, all found by reading rendered pages for non-Sikkim destinations rather than by search.

## 14. Search agent (Request 13 / QA)

`scripts/qa/search-scope.mjs` (`npm run qa:search`) fetches the live `/api/search-index` plus the global navigation seed from the page payload and asserts: no destination-scoped item links into another destination (only *registered* ids count — `/destinations/compare` is a route); every global entry pointing at a destination **names it in its label**; ten cross-vocabulary probes (Varanasi/Kyoto/Paris/NYC + "monaster", Jaipur/Kyoto/Sikkim + "ghat", Rome/Paris + "ryokan") return zero in the foreign destination's own index; a positive control (Sikkim + "monaster" = 44) proves the matcher works; all 15 groups present.

**Finding:** two global shortcuts pointed at Sikkim without naming it — `/destinations/sikkim/industry` ("The tourism trade") and `/destinations/sikkim/planner` ("Plan a heritage journey"). a3 relabelled both in `search-index.ts`. **14 passed, 0 failed** on current source.

## 15. Compare improvements (Request 9)

`compare/page.tsx` gains **"Strongest for"** above the table: for each interest, the compared destination with the most catalogued records carrying it — stated as a count ("13 records"), never a rating; ties stated ("Paris · Rome — 10 records, tied"); interests no compared destination covers are omitted. Verified for Kyoto/Paris/Rome: History → Paris 13 · Heritage → Kyoto 12 · Culture → Kyoto 21 · Nature → Kyoto 3 · Architecture → Paris·Rome tied · Religious heritage → Kyoto 10. **No budget rows** — no sourced cost data exists and none was invented.

## 16. Responsive QA

`qa:ux` **123/123 on the final build** — 375–1440 overflow across representative routes, the mobile drawer, keyboard-opened claim groups. The new discover chip rows wrap; the compare block is a 1/2/3-column grid.

## 17. Accessibility QA

`qa:a11y` **0 violations across 30 routes on the final build.** New chip rows use `aria-current` and a labelled `<ul>`; "Strongest for" is a `<dl>` under a labelled section; the hero carousel exposes `aria-roledescription`, a live region, and a pause control.

## 18. Performance QA

Prior build: payload ceilings 104/104. Known standing issue: rumtek issues ~314 `/_next/image` requests, ~52s cold at 1024px, failing `qa:immersive`'s 45s timeout on a cold cache.

## 19. Destination-by-destination status

| Destination | Interests | Stays | History photos | Kind taxonomy |
|---|---|---|---|---|
| Sikkim | 10 | 22 (register) | not via this mechanism | derived |
| Kyoto | 9 | 0 | 6/6 | Temple·Shrine·Castle·District·Market·Palace·Walk·Food·Festival·Craft |
| Varanasi | 7 | 0 | 6/6 | Ghat·Temple·Mosque·Fort·Heritage site·Food·Festival·Craft |
| Paris / Rome / NYC / Jaipur / Kolkata | 8–9 | 8/6/7/6/7 | derived, not individually checked | derived |
| Delhi / Agra / Mumbai / Hyderabad / Kochi / Goa / Istanbul | 7–8 | 6/0/1/4/8/4/8 | derived, not individually checked | derived |

## 20. Remaining legitimate limitations

- **Request 10 not executed.** `SelectDestination` is the only caller of `JourneyProvider.toggle`; `/journey` renders a summary. Removing "Add to journey" removes the ability to build a journey. Left in place.
- **Research** (Requests 11, 12, archive depth, history photography beyond place photos) not done — cannot be verified at this scale without fabricating.
- **Server reaping, diagnosed:** a `next build` replaces `.next/server` under any running `next start`; with two sessions building in one tree, each build killed the other's server. Mitigated with a supervised restart loop and a one-build protocol agreed with a3.
- `qa:media` is a structural/licence/identity check; depiction still needs eyes.

## 21. Final benchmark assessment

Restraint (hero, nav, guide control), source-transparency (counts stated as counts, provenance settling photos) and per-destination derivation (taxonomy, history photos, strongest-for) now match the reference's *approach*. Content depth — stays, archive photography, official-source recommendations — does not, per §10 and §12.

## 22. Final build result

- Typecheck: **PASS** (0). Lint: **PASS** (0 — was 10, all in a3's `.cjs` scripts; fixed with a `**/*.cjs` override + one `prefer-const`).
- Data suites: capsules 282/0 · global-capsules 240/0 · content-framework 72/0 · culture 192/0 · stays 14/0 · media 7/0 (0 uncredited of 921 referenced files) · search 14/0.
- **Production build: `C_m1h6YLt90_c7uJMUpTM` — compiled successfully.** The coordinated single rebuild was run by this session after `tourismproj-a3`'s session ended before its final chain (its queued content step — deleting the three unlicensed JPGs and regenerating the focal manifest — had already landed; only the build had not).

| Suite (production, :8700) | Result |
|---|---|
| qa:planner | 87 / 0 |
| qa:discovery | 106 / 0 |
| qa:intelligence | 24 / 0 |
| qa:demo | 59 / 0 |
| qa:product-flow | 38 / 0 |
| qa:ux | 123 / 0 |
| qa:global-intelligence | 104 / 0 |
| qa:a11y | 30 routes, 0 violations |
| qa:search | 14 / 0 |
| qa:media | 7 / 0 |
| qa:stays | 14 / 0 |

Surfaces re-checked on that build: hero **15 of 15 slides landscape** (was 4 portrait); history cards **6 of 6** with place photographs on Kyoto and Varanasi; compare "Strongest for" present, both "monastery" strings gone; discover "By kind of place" chips present with `aria-current` on the active kind, `?type=Temple` → 28 cards all `Temple`; Varanasi plan titled "Sacred sites — …", 0 × "Monasteries and sacred sites"; "Immersive sound" 0; circular guide launcher present.

**A verification trap worth recording:** the first pass of these checks ran against a `next start` that had *survived* the rebuild. It answered 200 everywhere and served the new prerendered HTML — hero and plan looked fixed — while executing yesterday's server bundle for dynamic routes, so compare showed copy that no longer existed in source and discover had no chip row. Every "failure" vanished once the listener was restarted by port. Never diagnose from a server that predates the build.

**Files changed this pass (mine):** `itinerary.ts`, plan `page.tsx`, compare `page.tsx`, discover `page.tsx`, `DestinationHighlights.tsx`, `TripGuide.tsx`, `(v1)/layout.tsx`, `constants.ts`, capsules `agra.ts`/`delhi.ts`/`jaipur.ts`, `eslint.config.mjs`, `scripts/repoint-media.ts`, `package.json`, `scripts/qa/{stays-integrity,media-integrity,search-scope}.mjs`; deleted `AmbientAudio.tsx`.
