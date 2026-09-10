# History — gap analysis

Benchmark: <https://sikkimdarshan.vercel.app/history> — "26 documented events
across 6 eras", 1642 (the Yuksom crowning) to 1975 (the referendum).
Baseline: this repository, built and served locally.

---

## What each side has

| | Sikkim (here) | The other fourteen (here) | Benchmark |
|---|---|---|---|
| Events | 26 | **165** | 26 |
| Body prose | `description[]` + `keyFacts[]` | **none** | yes |
| Eras | 6, named | **none** | 6, named |
| Detail page | `/history/<slug>` | **none** (`historyPages` is false) | yes |
| Named sources | yes, with `covers` | source id only | yes |
| Verification status | `verified` / contested, with a note | none | stated |
| Image | archive key + a note when not contemporary | none | yes |

## The finding

There are **more events outside Sikkim than inside it** — 165 against 26 — and
none of them is a history.

Every capsule event is the founding date of a building, derived from that
building's own article:

```
{ id: "notre-dame-1163", year: 1163, title: "Notre-Dame de Paris, 1163",
  summary: "The construction of the cathedral began in 1163 under Bishop
            Maurice de Sully…", placeIds: ["notre-dame"] }
```

Twelve of those is not the history of Paris. It is the Places list sorted by
date. The benchmark's timeline works because its events are *episodes* — a
coronation, a treaty, an invasion, a referendum — and because they are grouped
into named eras that give a reader somewhere to stand.

The spans are real, though, and wider than the benchmark's:

| | span | events |
|---|---|---|
| Rome | 179 BCE – 1762 | 8 |
| Varanasi | 528 BCE – 1936 | 11 |
| Kyoto | AD 711 – 1995 | 10 |
| Paris | 1147 – 1986 | 12 |
| Sikkim | 1642 – 2016 | 26 |

## Gaps, prioritised

**P0**
1. 165 events carry no prose, so `historyPages` is false and there is no
   detail page for any of them.
2. No eras outside Sikkim. A 2,500-year span rendered as one flat list is the
   "spreadsheet pretending to be history" the brief names.
3. Events do not link to the story articles that now exist on their subjects.

**P1**
4. No verification status on capsule events — Sikkim's model has one and the
   honest handling of a contested date depends on it.
5. No image on any capsule event.

**P2**
6. Events beyond building foundations — coronations, treaties, sieges. Real,
   but a separate retrieval pass against different sources.

**P3 — deliberately not built**
7. Invented precision. Rome's earliest record is 179 BCE; nothing in this
   corpus supports a day or a month for it, and `yearLabel` exists precisely
   so an approximate date can be shown as approximate.
8. Sikkim's six era names applied elsewhere. "The Namgyal Kingdom" is
   Sikkim's own periodisation; eras must come from each destination's record.

## What must be preserved

`HistoryEvent` already models nearly everything Phase 2 asks for — `sortYear`
separate from the displayed `yearLabel`, `verification` with a note,
`imageNote` for a photograph that is not contemporary with its event. The work
is to fill that model for fourteen more destinations, not to redesign it.
