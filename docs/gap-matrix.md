# Problem → gap → solution matrix

Statement **26202**, derived in [`current-problem-statement.md`](current-problem-statement.md).
Every number below was measured against this tree on **2026-08-24**; the
commands are in [§ How these were measured](#how-these-were-measured).

## 1 · Where the product stands against the new statement

| # | Requirement (from the statement) | Current capability | Verdict |
| --- | --- | --- | --- |
| R1 | Serve the tourism **industries** | Every route serves a visitor or the cultural record. No surface addresses a business. | **NOT SOLVED** |
| R2 | **Hotels** named explicitly | `/hotels` publishes 22 state-graded properties; the 905-row register sits behind it as a reference layer only. | **PARTIALLY SOLVED** |
| R3 | **Travel** | Permits page, rule-based planner, TSD fee modelled correctly. The 1,858-row travel-agent register is ingested and **never published**. | **PARTIALLY SOLVED** |
| R4 | **"and others"** | Food, crafts, festivals and communities are covered as *culture*, never as *trade*. | **NOT SOLVED** |
| R5 | **"boost"** — a change verb | The product describes and preserves. Nothing in it changes an industry outcome. | **NOT SOLVED** |
| R6 | **"the current situation"** | Strongest existing asset. `/preservation` already publishes measured coverage and its own gaps. But it measures *the archive*, not *the industry*. | **PARTIALLY SOLVED** |
| R7 | Software | Next.js 16, 203 prerendered pages, lint/typecheck/build clean. | **FULLY SOLVED** |
| R8 | Travel & Tourism theme | Squarely in theme. | **FULLY SOLVED** |
| R9 | Innovation graded explicitly | Real novelty exists (no-LLM grounded guide, published-gaps dashboard, deny-list QA) but all of it is aimed at the *old* statement. | **PARTIALLY SOLVED** |
| R10 | Source your own data and defend it | The defining strength. 19-source registry, provenance on every record, `qa:heritage` enforcing it mechanically — 21/21 passing. | **FULLY SOLVED** |

**The shape of the gap:** the product is a demand-side and preservation
instrument. The statement names the supply side. The discipline that makes the
heritage archive credible has never been pointed at the industry — and the
industry data is *already in this repository, unused*.

## 2 · The unused assets

Measured, sitting on disk, rendered to no one:

| Asset | Size | Where | Published today? |
| --- | --- | --- | --- |
| Registered travel agents | **1,858 rows** | `reports/ingest/sikkim-tourism-pending.json` → `records[4]` | **No. Not at all.** |
| Registered hotels | **905 rows** | `src/data/generated/registered-hotels.json` | Only as a lookup behind 22 curated stays |
| Licence validity dates | on **2,747** of those rows | both registers | **No** |
| Registration numbers | on all rows | both registers | **No** |
| Operator contact details | 1,706 phones · 1,190 emails (agents); 795 phones (hotels) | both registers | **No** |
| Tourist Information Centres | 7 offices | `records[5]` | No |
| Department do/don't guidelines | 64 items | `records[0]` | Partially, via `/responsible` |

1,858 licensed businesses that the state has already vetted, with names,
districts, grades, registration numbers and phone numbers, have been sitting in
`reports/ingest/` since 2026-08-18 without a single one being rendered.

## 3 · The measurement that answers "the current situation"

Two Government of Sikkim registers, cross-referenced against this project's own
53 catalogued heritage sites (15 monasteries + 38 places), by district:

| District | Heritage sites | % of heritage | Hotels | % of hotels | Travel agents | % of agents | Sites per hotel |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Gangtok | 14 | 26.4% | **675** | **74.6%** | **1,547** | **83.3%** | 0.021 |
| Mangan | 13 | **24.5%** | **20** | **2.2%** | **17** | **0.9%** | **0.650** |
| Gyalshing | 10 | 18.9% | 102 | 11.3% | 127 | 6.8% | 0.098 |
| Namchi | 9 | 17.0% | 51 | 5.6% | 93 | 5.0% | 0.176 |
| Soreng | 4 | 7.5% | 10 | 1.1% | 34 | 1.8% | 0.400 |
| Pakyong | 3 | 5.7% | 47 | 5.2% | 40 | 2.2% | 0.064 |
| **Total** | **53** | | **905** | | **1,858** | | |

**Sikkim's heritage is distributed. Its tourism industry is not.** Heritage runs
26 / 24 / 19 / 17 / 8 / 6 percent across six districts. Accommodation runs
**75 / 2 / 11 / 6 / 1 / 5**. Mangan holds very nearly as much catalogued
heritage as Gangtok and **2.9%** of its registered hotel supply.

### Licence currency

| Register | Rows | Datable | Past `validUpto` on 2026-08-24 | Current |
| --- | ---: | ---: | ---: | ---: |
| Hotels | 905 | 897 | **817 (91.1%)** | 80 |
| Travel agents | 1,858 | 1,850 | **1,748 (94.5%)** | 102 |

### What these numbers may and may not be made to say

This is the discipline the project already lives by, applied to its own new
finding. Both results have competing explanations and the product must carry
them:

- **Expired ≠ closed.** The register may simply not be rewritten on renewal.
  The honest claim is *"the department's published register shows this entry
  past its validity date"* — a statement about **the register**, which is
  verifiable — not *"this business is unlicensed"*, which is not.
- **Thin supply ≠ neglect.** Mangan is North Sikkim. The October 2023 South
  Lhonak glacial-lake outburst destroyed road access along the Teesta, and
  access has been constrained since. Low registered supply there may record a
  *shock*, not an *opportunity*. The product must present the gap as an
  observation with candidate explanations, never as a siting recommendation.
- 883 of 905 hotels and 1,788 of 1,858 agents carry **no grade at all**. The
  absence of a grade is not a low grade, and must never be rendered as one.

*(External verification of the flood's tourism effect and of the 2025 Rules'
renewal obligation is in [`audit/tourism-domain.md`](audit/tourism-domain.md).)*

## 4 · Top 5 gaps that materially affect judging

1. **No supply-side surface at all.** The statement names hotels and travel
   first. A judge reading 26202 and then opening this product sees a heritage
   museum. *(R1, R2, R3)*
2. **The travel-agent register is unpublished.** Sikkim routes several restricted-area
   permits through registered agents; 1,858 vetted operators are invisible while
   a visitor planning Nathula has no directory. *(R3)*
3. **Nothing measures the industry's current situation.** `/preservation`
   proves the team can build exactly this instrument — pointed at the archive
   instead of the trade. *(R5, R6)*
4. **The pitch names the wrong problem statement.** `pitch.txt` line 6 leads
   with **SIH260542**. Uncorrected, this reads as an entry recycled from a
   previous edition. *(R9)*
5. **Innovation is real but mis-aimed.** The no-LLM grounded guide is a better
   answer to "AI hallucinates" than most entries will have — and it currently
   answers a question 26202 did not ask. *(R9)*

## 5 · Feature ranking

Scored /10. **Build** requires SIH relevance ≥ 8 and no score below 5.

| Feature | SIH rel. | Innov. | Tourist | Tech | Demo | Feas. | Data | Govt | Risk | Call |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| **Licensed-operator directory** (both registers, searchable, licence status) | 10 | 8 | 9 | 7 | 9 | 9 | 10 | 10 | 2 | **P0** |
| **Tourism Capacity Gap** (heritage × supply by district) | 10 | 10 | 6 | 8 | 10 | 8 | 9 | 10 | 3 | **P0** |
| **Licence-currency layer** (honest status per operator) | 9 | 9 | 8 | 6 | 9 | 9 | 9 | 10 | 4 | **P0** |
| Industry surface in nav, palette, guide index | 9 | 4 | 8 | 5 | 7 | 10 | 10 | 7 | 1 | **P0** |
| Correct the pitch to 26202 | 10 | 1 | 1 | 1 | 8 | 10 | 10 | 5 | 1 | **P0** |
| Operator self-correction / claim flow | 8 | 7 | 4 | 7 | 6 | 4 | 6 | 9 | 7 | **P1** |
| Permit → licensed-agent routing | 9 | 7 | 9 | 5 | 8 | 7 | 8 | 9 | 4 | **P1** |
| Homestay / "and others" trade layer | 8 | 6 | 7 | 5 | 6 | 4 | 3 | 8 | 7 | **P2** — no sourced dataset |
| AI chatbot over tourism data | 4 | 1 | 4 | 3 | 3 | 8 | 2 | 3 | 9 | **P3** |
| Booking / payment engine | 5 | 2 | 7 | 6 | 5 | 3 | 1 | 4 | 10 | **P3** — needs invented inventory |
| Ratings & reviews | 3 | 1 | 6 | 3 | 4 | 7 | 1 | 2 | 10 | **P3** — deleted once already |
| AR / VR / 360° tours | 4 | 3 | 6 | 7 | 8 | 2 | 1 | 3 | 9 | **P3** — no licensed imagery exists |

### Why the P3s stay unbuilt

- **Chatbot** — the product already answers hallucination better than a chatbot
  does, by retrieving instead of generating. Bolting an LLM on would *destroy*
  the differentiator, not add one.
- **Booking** — no licensed inventory or tariff feed exists. Building it means
  inventing prices. This project already shipped invented tariffs once and
  deleted them; doing it again to win a hackathon forfeits the only thing that
  makes the data credible.
- **Ratings** — same failure, same history.
- **360°/AR** — a 35-site sweep established that no openly licensed 360° capture
  of any Sikkim monastery exists. The constraint is the world's, not the code's.

## 6 · What gets built

One thesis, three surfaces, all on the existing provenance machinery:

> **The state already licenses, vets and publishes its entire tourism industry.
> That data is unusable — buried in a 75-page paginated table inside an Angular
> bundle with no API — so the industry is invisible, concentrated in one
> district, and administratively stale. Make it usable and you boost it.**

1. **`/industry`** — the 905 hotels and 1,858 travel agents, searchable and
   filterable by district, grade and licence status. The first time this
   register has been renderable outside a government SPA.
2. **`/industry/capacity`** — the district capacity table above, as a measured
   instrument with its caveats attached.
3. **Licence status** as a first-class, honestly-worded field throughout.

This adds a supply side to a product that had only a demand side, using
government data it already holds, under the sourcing rule it already enforces.
Nothing existing is removed.

## How these were measured

```bash
# District cross-reference, licence currency, register sizes
node -e '<the scripts recorded in this session>'   # see docs/audit/ for outputs
npm run typecheck     # PASS
npm run lint          # PASS
npm run qa:heritage   # 21/21
```
