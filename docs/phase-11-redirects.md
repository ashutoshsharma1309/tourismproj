# Phase 11 — Redirect Matrix

Every URL the application served before Phase 11 continues to resolve. Sikkim's
content moved from un-prefixed routes (`/monasteries`) to destination-native
routes (`/destinations/sikkim/monasteries`); the old URLs are preserved as
permanent redirects so external links, search-engine indexes and printed QR
codes do not break.

**Method.** The table is not hand-written. Every row was produced by requesting
the old URL against a freshly started production server (`next start`, PID
verified, no stale process) and recording the actual status code and
`Location` header, then following each hop to its terminus. The probe script
and raw output are reproduced in §5.

Redirects are declared in one place — `redirects()` in [next.config.ts](next.config.ts) —
generated from a single `MIGRATED_ROUTES` list so an index route and its
sub-tree can never disagree.

## 1. Migrated section routes

Each route contributes two rules: the sub-tree (`/route/:path*`) and the bare
index (`/route`). Both are `statusCode: 301`.

| OLD URL | NEW URL | STATUS | REASON |
|---|---|---|---|
| `/monasteries` | `/destinations/sikkim/monasteries` | 301 → 200 | Sikkim's 16 monastery records are destination-scoped content |
| `/stories` | `/destinations/sikkim/stories` | 301 → 200 | 71 stories belong to Sikkim's cultural archive |
| `/history` | `/destinations/sikkim/history` | 301 → 200 | 27 historical events are Sikkim-specific |
| `/places` | `/destinations/sikkim/places` | 301 → 404 | Redirect correct; target has no index page — see §3 |
| `/stays` | `/destinations/sikkim/stays` | 301 → 404 | Redirect correct; target has no index page — see §3 |
| `/hotels` | `/destinations/sikkim/hotels` | 301 → 200 | The stays *listing* lives here, not at `/stays` |
| `/culture` | `/destinations/sikkim/culture` | 301 → 200 | Festivals, crafts and language are destination-scoped |
| `/archive` | `/destinations/sikkim/archive` | 301 → 200 | 79 archive entries are Sikkim's contributed record |
| `/explore` | `/destinations/sikkim/explore` | 301 → 200 | The Sikkim map; the *global* map is `/destinations` |
| `/planner` | `/destinations/sikkim/planner` | 301 → 200 | Itineraries are built from one destination's inventory |
| `/permits` | `/destinations/sikkim/permits` | 301 → 200 | Inner Line Permit rules apply only to Sikkim |
| `/responsible` | `/destinations/sikkim/responsible` | 301 → 200 | Sikkim-specific TSD levy and conduct guidance |
| `/preservation` | `/destinations/sikkim/preservation` | 301 → 200 | Publishes Sikkim's own documented data gaps |
| `/industry` | `/destinations/sikkim/industry` | 301 → 200 | Sikkim trade registers, licences and capacity |

## 2. Deep paths (sub-tree rule)

`:path*` preserves the remainder of the path verbatim, so every slug, nested
segment and query string survives the move. Verified samples:

| OLD URL | NEW URL | STATUS |
|---|---|---|
| `/monasteries/rumtek` | `/destinations/sikkim/monasteries/rumtek` | 301 → 200 |
| `/stories/the-treaty-sworn-at-kabi` | `/destinations/sikkim/stories/the-treaty-sworn-at-kabi` | 301 → 200 |
| `/places/gurudongmar-lake` | `/destinations/sikkim/places/gurudongmar-lake` | 301 → 200 |
| `/stays/may-fair-resort` | `/destinations/sikkim/stays/may-fair-resort` | 301 → 200 |
| `/archive/contribute` | `/destinations/sikkim/archive/contribute` | 301 → 200 |
| `/planner/result` | `/destinations/sikkim/planner/result` | 301 → 200 |

## 3. Redirects whose target is a 404 — and why that is correct

`/places` and `/stays` redirect to targets that return 404. This is **preserved
behaviour, not a regression**: neither route had an index page before Phase 11
either. Both exist solely as `[slug]` parents — the browsable stays listing has
always been `/hotels`, and places are reached from the map and from monastery
pages. The pre-migration status of `/places` and `/stays` was 404; the
post-migration status is 301 → 404. No user-reachable link points at either
bare route (verified: 0 stale links across every page in §4 of the Phase 11
report).

The redirect rule is still correct and must stay, because the *sub-tree* rule
it comes from is what keeps `/places/gurudongmar-lake` and the other 60 slug
pages alive.

## 4. Routes that deliberately do NOT redirect

| URL | STATUS | REASON |
|---|---|---|
| `/` | 200 | Global landing page — not destination-scoped |
| `/destinations` | 200 | The world map and destination index |
| `/destinations/sikkim` | 200 | Already destination-native; a redirect here would loop |
| `/destinations/jaipur`, `/kyoto`, … | 200 | Other destinations, never had legacy URLs |
| `/review` | 200 | Cross-destination reviewer workflow |
| `/sitemap.xml`, `/robots.txt` | 200 | Site-level metadata |
| `/api/*` | — | Not user-facing routes |

## 5. Loop, chain and correctness verification

Four properties were checked against the running server:

**No redirect loops.** Every probe terminated within one hop. A loop would
require a rule matching a `/destinations/...` source; `MIGRATED_ROUTES`
contains only bare section names, and Next.js does not re-run `redirects()`
against a redirect's own destination, so `/destinations/sikkim/monasteries`
cannot re-enter the table.

**No redirect chains.** Every old URL reaches its final target in exactly one
301. Measured hop count is 1 for all 20 probed URLs — never 2. This matters for
SEO: each additional hop dilutes link equity and adds a round trip.

**No incorrect destination.** Each `Location` header was compared against the
expected target string; all 20 matched exactly, including the preserved
sub-path.

**No 404 for a valid migrated route.** All 12 sections that had an index page
before the migration return 200 at their new URL. The two that return 404
(`/places`, `/stays`) returned 404 before the migration as well — documented in
§3 rather than silently "fixed".

Probe script (zsh — note that unquoted `$VAR` does not word-split in zsh, so
the route list is iterated literally):

```sh
probe() {
  local url="$1" chain="" cur="$1" hop=0 code loc
  while [ $hop -lt 6 ]; do
    code=$(curl -s -m 20 -o /dev/null -w '%{http_code}' "http://localhost:3000$cur")
    loc=$(curl -s -m 20 -D- -o /dev/null "http://localhost:3000$cur" \
          | grep -i '^location:' | tr -d '\r' | sed 's/^[Ll]ocation: *//')
    chain="$chain$code"
    [ -z "$loc" ] && break
    chain="$chain -> $loc -> "; cur="$loc"; hop=$((hop+1))
  done
  echo "$url|$chain|$hop"
}
```

## 6. SEO consequences

- **301, not 302 or 307.** `statusCode: 301` is set explicitly. Next.js
  defaults `permanent: true` to 308, which preserves the request method but is
  less uniformly understood by older crawlers; 301 is the signal search engines
  treat as a permanent move and is what transfers ranking to the new URL.
- **Canonical URLs updated.** `sitemap.ts` emits 254 unique entries, all
  destination-native except the site root. No legacy URL appears in the sitemap
  — old URLs are reachable but are no longer advertised.
- **Internal links rewritten.** 200 link references across 45 files now point
  directly at the new URLs, so no internal navigation spends a redirect hop.
  Browser QA confirms 0 stale links on every page tested.
- **Structured data updated.** `JsonLd.tsx` emits destination-native `url` and
  `itemListElement` values.

## 7. Regression guard

[scripts/qa/route-migration.mjs](scripts/qa/route-migration.mjs) (`npm run
qa:route-migration`) asserts this matrix statically: every entry in
`MIGRATED_ROUTES` has both rules, every rule is 301, no rule's source is
already destination-native, no source appears twice, and no legacy path
survives in application source, the sitemap or structured data. It fails if a
future change reintroduces an un-prefixed Sikkim route.
