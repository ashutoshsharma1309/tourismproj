# Features to Avoid

Being critical, as the brief asks. Each item is something that would plausibly get built, with the reason it should not be — judged against SIH 26202 (*"boost the current situation of the tourism industries including hotels, travel and others"*) and against what this codebase can actually support with reliable data.

**The organising principle:** this project's only durable advantage is that its claims are true and traceable. Every feature below either dilutes that, or spends scarce time on something that does not move discovery → understanding → planning → travel.

---

## 1. Features that require data the project cannot honestly obtain

### Fake hotel inventory, pricing and availability
Tariffs, room inventories and live availability were **already deleted once** (2026-08-16) because they were fabricated. No licensed feed exists. Rebuilding them for demo polish would repeat a mistake this project has already corrected and would void invariant I2.
**Instead:** the directory-only model, with outbound links to official sites.

### Ratings and reviews
Guest reviews, star ratings and "traveller scores" for 15 destinations. There is no review corpus, and generating or scraping one is fabrication. `monastery-reviews.json` exists only as sourced, attributed visitor voices — not a rating system.
**Instead:** attributed quotes with provenance, or nothing.

### Real-time anything
Live crowd levels, current weather-based recommendations, real-time transport. Each needs a paid, per-destination feed that does not exist, and each is wrong the moment it is stale.
**Instead:** sourced static guidance with a visible `retrievedAt`.

### Booking transactions
Payments, reservations, cancellations. Enormous compliance surface (PCI, refunds, consumer law across six countries), zero supplier relationships.
**Instead:** deep-link to official booking pages. The SIH objective is *conversion from interest to planning* — a handoff satisfies it.

### AI-generated "photographs" of heritage sites
Covered as risk C3. Photorealistic generated imagery of living religious sites presented as documentary is a cultural harm, not just an accuracy problem.
**Instead:** licence-verified photographs; generated imagery only where clearly labelled and never in evidentiary slots.

---

## 2. Features that dilute the differentiator

### A general-purpose chatbot
A free-form LLM chat window over tourism content. It would hallucinate opening hours and permit rules (risk C2), and it would replace a guide that *provably* only says what it holds with one that says whatever sounds right.
**Instead:** keep the retrieval-grounded guide. If an LLM is added, it should **rephrase retrieved records**, never generate beyond them — a strictly smaller capability, and the honest one.

### Unlimited "research any location on Earth"
Tapestry's premise, and wrong for TerraStory: it is unbounded cost (H1), unbounded latency (H2), unreviewable, and it contradicts the curated-depth model. It also makes the depth badge meaningless — every arbitrary location would be `researched`.
**Instead:** 15 curated destinations, precomputed, human-reviewed.

### Auto-promoting AI content to curated
Any code path that raises a record's depth without a human. It would silently convert machine output into apparent human-verified fact — the exact failure invariant I4 exists to prevent.

### Machine-translating the deep content
Sikkim's audio scripts are natively composed per language *because* a previous bug spliced English prose into a Hindi frame. Running MT over the curated corpus to "support more languages" would regress quality where it is currently highest.

---

## 3. Features that add complexity without serving the objective

### Gamification, badges, points, streaks
Badges for visiting monasteries, points for reading stories. They serve retention metrics, not travel decisions, and they sit oddly on sacred heritage content. Nothing in SIH 26202 asks for engagement mechanics.

### Social feed, user profiles, following, comments
A tourism social network is a different product with its own moderation burden. The archive already has the *right* participation model: contribute an object, a curator reviews it.

### Blockchain / NFTs / tokenised anything
No problem here needs a distributed ledger. Provenance is already solved by a source registry with URLs and retrieval dates — which is auditable, human-readable and free.

### Authentication for its own sake
There is no auth today and no feature yet requires it. Adding accounts costs session handling, password reset, privacy compliance and an attack surface.
**Add it only when** a specific feature demands it — saved itineraries, or per-user rate limits if on-demand research ever ships. Visit history already works client-side without accounts.

### Redundant dashboards
Hotel-owner and monastery-admin dashboards were **deleted** because their revenue, occupancy and remittance figures were fabricated. Any new dashboard must be asked: *which sourced figure does this show?* If the answer is "we'd compute it", it is the same mistake.

### VR/AR heritage tours
There are **zero** openly licensed 360° panoramas of any Sikkim monastery — a verified negative from a 35-site sweep. Existing panoramas are flagged `placeholder: true`. VR on placeholder captures would be a demo that misrepresents the archive.

### Native mobile apps
The web app is static, fast and CDN-servable. Native apps would triple maintenance for no capability the objective needs.

### A recommendation engine
"Places you might like" across destinations requires behavioural data that does not exist and would generate unsourced affinities.
**Instead:** curated `sameThemeAs` edges, human-authored.

---

## 4. Features that sound impressive but are traps

### "AI trip planner" as a generative feature
Free-form LLM itinerary generation. It would invent travel times between places whose road connections are unknown (H6) — and the current deterministic planner is *more* accurate precisely because it refuses to. Generating an itinerary for Kyoto without a corridor graph produces confident fiction.
**Instead:** data-driven routing where a graph exists; honest non-routed day themes where it does not.

### Voice assistant / conversational booking
Compounds chatbot hallucination risk with transaction risk.

### Automatic multilingual expansion to 50 languages
Impressive number, unverifiable quality. No voice exists for several already-targeted languages, and cultural terminology is where MT fails hardest.
**Instead:** fewer languages, natively composed, with the count stated honestly.

### Live tourism statistics dashboard
Arrival figures come from annual government reports, not live feeds. A dashboard implying live data over annual figures misrepresents its own freshness. `stats.ts` already sets the TSD collection total to `null` rather than estimate it — that instinct is correct and should govern.

---

## 5. The test to apply

Before building anything not in the roadmap, answer all four:

1. **What is the source?** If the answer is "we'd generate it", stop.
2. **Does it move discovery → understanding → planning → travel?** If not, it does not serve SIH 26202.
3. **Would it survive `qa:heritage`?** If it renders an uncited claim, it fails.
4. **Would removing it weaken the product?** If not, it is decoration.

**A smaller, wholly credible platform is a stronger submission than a large one with fabricated surfaces** — and this project has already proved it understands that, by deleting the fabricated surfaces once.
