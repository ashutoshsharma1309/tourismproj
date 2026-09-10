# Culture — gap analysis

Benchmark: <https://sikkimdarshan.vercel.app/culture>, inspected 2026-09-09.
Baseline: this repository, built and served locally.

---

## What each side has

| | Sikkim (here) | The other fourteen (here) | Benchmark |
|---|---|---|---|
| Dedicated `/culture` route | yes | **no** | yes |
| Organising idea | 50 films across 9 shelves | 3 blocks on the hub | 50 films across 9 shelves |
| Shelves | Food, Festivals, Traditions, Music & dance, Crafts, Textiles, Communities, Heritage, Daily life | Food, Festivals, Crafts | same 9 |
| Records | 50 films | **196** — 92 food, 63 festivals, 41 crafts | 50 films |
| Depth per record | film + description | one quoted sentence | film + description |
| Photograph per record | thumbnail | yes, credited | thumbnail |
| Source per record | channel + YouTube link | article + retrieval date | channel + YouTube link |
| Coverage statement | yes, per shelf | no | yes ("Textiles is the thinnest shelf") |

## The finding

The fourteen destinations hold **more culture records than the benchmark
holds films** — 196 against 50 — and have nowhere to put them. They render as
three short blocks partway down a hub page, below places and above stays, with
one sentence each and no route of their own.

The benchmark's Culture page works because it is a *destination in the
product*: a page you can be sent to, browse by subject, and come back to. Ours
is a paragraph inside another page.

Two things changed the arithmetic since this was last looked at:

1. **Every culture record now has an article.** The Stories work retrieved
   178 sourced narratives, and they are *these subjects* — Kintsugi, Gion
   Matsuri, Baguette, Rasgulla. A culture card can now lead somewhere.
2. **The photography is at source resolution.** Culture images went from a
   flat 1280px ceiling to 1920 wherever the source allows.

So the Culture module is no longer a content problem. It is a routing and
composition problem.

## Gaps, prioritised

**P0**
1. No `/culture` route for fourteen destinations, so 196 records have no home.
2. Culture records do not link to the article written about them — the two
   corpora were built a phase apart and never joined.
3. No coverage statement, so a thin shelf reads as a broken one.

**P1**
4. No shelf-level ordering by destination. Kyoto's crafts matter more than its
   festivals; Jaipur's festivals more than its food. The order is currently
   hard-coded food → festivals → crafts everywhere.
5. Culture is absent from search.

**P2**
6. No music/dance/performance shelf outside Sikkim — no records exist, and
   retrieving them is a separate research pass.

**P3 — deliberately not built**
7. Films for the other fourteen. Sikkim's 50 were verified one at a time for
   subject, channel and embedding permission. Fourteen more shelves of
   unverified YouTube would be the opposite of what makes that page credible.
8. Ingredient lists and recipes. No source in this corpus states them, and a
   dish's "traditional ingredients" invented from memory is exactly the
   fabrication this brief forbids.

## What must not be copied

The benchmark's nine shelves are Sikkim's own vocabulary — "Communities" and
"Textiles" are shelves because Lepcha, Bhutia and Nepali weaving are subjects
there. Paris has no Communities shelf worth the name in this corpus. Shelves
must come from what a destination's records actually carry, the same way the
map's categories already do.
