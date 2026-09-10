# SIH 2026 PPT — copy-paste content for Darshan

Follows the standard SIH idea-presentation template (6 slides). Fill the bracketed
team fields. Every number is measured from this repository; sources are on slide 6.

---

## SLIDE 1 — Title

Problem Statement ID: 26202
Problem Statement Title: Student Innovation
Theme: Travel & Tourism
PS Category: Software
Team ID: [fill]
Team Name: All In

Idea Title: Darshan — an operating system for India's unorganised tourism supply side

One-line: The state already licenses its hotels, travel agents and guides. Darshan makes that
supply searchable, bookable and payable, and gives the tourism department a live view of it.

---

## SLIDE 2 — Idea / Proposed Solution

### The problem, measured (Sikkim, Government of Sikkim registers, read 18 Aug 2026)
- 905 registered hotels and 1,858 registered travel agents. Total 2,763 licensed businesses.
- Published only as 75 paginated pages inside a government web app. No search, no filter, no API.
- 2,671 of 2,763 carry no state grade. Only 22 hotels and 70 agents are graded.
- 817 of 897 hotel entries (91.1%) and 1,747 of 1,850 agent entries (94.4%) are past their printed validity date.
- No government publication anywhere states a renewal or compliance figure. Ours is the first.
- Gangtok holds 74.6% of hotels and 83.3% of agents. Mangan holds 24.5% of catalogued heritage but 2.2% of hotels.
- Roughly 80% of India's stays and nearly all local transport and guiding run offline, on WhatsApp, with no online presence. MakeMyTrip and Booking.com sell only the organised 20%.

### The idea
Darshan is one platform with three surfaces sharing one database:
1. Darshan (public): discover destinations and heritage sites, read sourced stories, plan an itinerary, book stays, transport, guides and experiences in one cart.
2. Darshan Partner (SaaS for operators): homestays, hostels, taxi operators, guides and experience hosts onboard, get verified, list inventory, manage a calendar, take direct bookings and receive split payouts.
3. Darshan Console (government): tourism department verifies operators, sees arrivals, occupancy and revenue retention live, publishes advisories.

### How it addresses the problem statement
- "Hotels": 905 registered hotels become searchable today and bookable through the Partner app.
- "Travel": 1,858 registered agents become findable, and restricted-area permits (Nathula, Tsomgo, Singalila, Green Lake, Maenam) route to a licensed agent.
- "Others": homestays, taxis, guides and experiences get the same listing, calendar and payout tooling.
- "Boost the current situation": the baseline is measured (above) and every delta is recomputed from the registers and the bookings table, not asserted.

### Innovation and uniqueness
- Supply-side first. Competitors are OTAs for the visitor; Darshan is an operating system for the operator, with the visitor as the demand engine.
- The itinerary is a cart, not text. The AI planner may only pick stops from a database candidate set; hallucinated IDs are rejected by schema. Every stop with a listing is bookable in one checkout.
- Verification enforced in the database. A listing cannot go live unless the vendor is verified; the rule is a Postgres trigger, not a UI check.
- Split payouts via Razorpay Route. Vendor keeps the guest relationship and gets an itemised payout, against opaque 18% OTA commissions.
- Provenance on everything. 53 catalogued heritage sites, 70 stories, every photograph credited and licensed, every claim sourced, gaps published rather than papered over.
- Government-grade honesty rules in CI. A QA check fails the build if any string calls a business "unlicensed" or invents a price.
- 20-language interface, audio guides in 12 languages, natively composed per language.

---

## SLIDE 3 — Technical Approach

### Stack
- Framework: Next.js 15 (App Router), React 19, TypeScript strict, Tailwind CSS v4, shadcn/ui
- Database: PostgreSQL on Supabase, Drizzle ORM, 24 tables across identity, content, commerce, trip and ops
- Auth: Supabase Auth, phone OTP primary (Indian vendors have phones, not inbox habits), Google secondary
- Storage: Supabase Storage. 917 media files (311 MB) across public media, audio, and a private vendor-documents bucket
- Payments: Razorpay Orders + Razorpay Route for split payouts to vendors
- Maps: MapLibre GL + MapTiler tiles (no Google Maps billing)
- AI: Vercel AI SDK with Zod-enforced structured output; deterministic fallback planner
- Notifications: Resend email, WhatsApp adapter
- Hosting: Vercel, Mumbai region. Validation with Zod at every boundary.

### Architecture rules
- One destination route, driven by the database. Adding a destination is a row insert, zero code.
- Content and commerce are separate domains joined only by destination ID.
- Availability is one row per (unit, date). Booking holds use SELECT ... FOR UPDATE inside a transaction, so double booking is impossible.
- Money is bigint paise everywhere; no floats.
- Every write path is idempotent and audited (webhooks keyed on gateway ID, audit_log row on every state change).

### Booking flow (process diagram text)
User picks dates -> createHold(): row-lock availability, decrement units, booking PENDING_PAYMENT with 10-minute hold -> Razorpay order -> user pays -> webhook verifies HMAC signature, upserts payment, flips booking to CONFIRMED, creates payout rows -> cron releases expired holds every 5 minutes.

### Vendor onboarding flow
Phone OTP sign-up -> business details -> upload government registration document -> Razorpay Route linked account -> submit -> department reviews in Console -> vendor VERIFIED -> listings may go ACTIVE. Target time to first listing: under 8 minutes on a mid-range Android phone.

### AI planner flow
Intake (destinations, days, party, interests, pace, budget) -> server queries candidate sites, active listings, permits and advisories from Postgres -> model receives candidates with stable IDs plus a travel-time matrix -> Zod schema accepts only candidate IDs -> any invented ID rejected, retried once, then rules-based fallback -> itinerary rendered on the same map -> "Book this trip" converts stops to cart items.

### Fee split
subtotal = unit price x quantity x nights
platform fee = subtotal x vendor commission (default 5%)
vendor payout = subtotal minus platform fee, transferred by Razorpay Route on capture. Split is frozen at hold time so later rate changes never rewrite history.

---

## SLIDE 4 — Feasibility and Viability

### What is already built and running
- Editorial archive live on Supabase: 6 destinations, 53 sites, 70 stories, 48 credited media, 180 audio guides (15 sites x 12 languages). 48/48 media credited, licensed, with alt text.
- 24-table schema pushed with constraint triggers: unverified vendor cannot activate a listing; de-verifying a vendor pauses its listings; a site or story cannot publish without sources.
- Data-driven destination and site pages: inserting a destination row takes its URL from 404 to 200 with no rebuild.
- Licensed-operator directory (/industry): 2,763 establishments searchable by type, district, registration status, name and registration number.
- District capacity table: heritage share vs registered supply share, server-rendered.
- Permits module (ILP/PAP/RAP/trek) with permit-to-licensed-agent routing.
- Rules-based itinerary planner over a real road-corridor graph.
- 15 destinations across 6 countries on the discovery layer; 319 prerendered pages; 20-language UI.
- QA: 28 suites, 2,341 checks, 0 failures; accessibility audit on 30 routes, 0 violations; 4,072 image URLs verified.

### In progress for the final build (24-hour plan, priority order)
1. Vendor onboarding -> listing -> availability calendar
2. Search -> listing detail -> hold -> checkout
3. Razorpay order + webhook + confirmed booking code
4. Partner dashboard with booking and payout split
5. AI planner with bookable stops
6. Government console: verification queue + revenue-retention analytics

### Challenges and risks
- Double booking under concurrency. Mitigation: row locks in a transaction, hold expiry cron, never check-then-write in application code.
- Webhook arrives before user returns from payment. Mitigation: webhook is sole source of truth; redirect page polls the booking code.
- Unverified operator taking money. Mitigation: database trigger, not UI.
- AI planner inventing a homestay. Mitigation: candidate-set-only schema, retry once, deterministic fallback.
- Register data is a snapshot (18 Aug 2026). Mitigation: date printed on page; two-command re-ingest and promote pipeline, reproducible and diffable.
- Register expiry is not proof a business is closed. Mitigation: wording rules enforced by a CI scan.
- Low connectivity in hill districts. Mitigation: 375px-first, first load under 2s, offline PWA for itinerary, permits and maps.
- Operator adoption. Mitigation: phone OTP, sub-8-minute onboarding, free tier with zero subscription.

### Viability / business model
| Tier | Price | Take rate | For |
|---|---|---|---|
| Free | Rs 0 | 5% | Single homestay or taxi getting online for the first time |
| Growth | Rs 999/month | 3% | Calendar sync, WhatsApp automation, analytics, priority placement |
| Pro | Rs 2,499/month | 2% | Multi-property, staff roles, API access, custom booking domain |
| Console licence | Annual, per state | none | Tourism department verification and analytics |

Unit economics: a Pelling homestay doing Rs 1.2 lakh GMV a month pays Rs 999 + Rs 2,400 = Rs 3,399 to Darshan, against about Rs 21,600 at an 18% OTA commission. About 6x cheaper, and the vendor keeps the guest relationship.

---

## SLIDE 5 — Impact and Benefits

### Target users
Primary: hoteliers and homestay owners, travel agents and tour operators, taxi operators and drivers, guides, and the state tourism department that licenses them.
Secondary: the visitor, whose bookings are the mechanism that boosts the industry.

### Potential impact
- 2,763 licensed Sikkim businesses made findable; 1,858 of them (the entire travel-agent register) published in usable form for the first time.
- A renewal-compliance figure per district and per register, where none is currently published.
- A dispersal instrument: heritage vs registered supply by district, recomputed on every ingest. Shows where visitors could go and supply does not exist.
- A permit-to-operator path for the five destinations the state routes through registered agencies.
- Revenue retention: the console shows how much booking value stays with in-state vendors versus what an out-of-state OTA would have taken.
- Overtourism early warning: arrivals per destination per day against carrying capacity.
- Sikkim context: 17,12,360 arrivals in 2025 (16,35,650 domestic, 61,710 foreign), up from 16,25,241 in 2024.

### Benefits
Social: unorganised operators (homestays, drivers, guides) get the same tooling as a hotel chain; heritage narrated in 12 languages; sourced stories preserve oral tradition with claim types stated.
Economic: operators pay a fraction of OTA commission and keep the customer; the department sees revenue retention instead of leakage; small districts (Mangan, Soreng) become visible to demand.
Environmental: capacity monitoring per destination; responsible-tourism guidance from the department's 64 do/don't items; carbon score on itineraries planned as a later phase.
Governance: verification queue replaces paper; register refresh is two commands; every decision leaves an audit log.

---

## SLIDE 6 — Research and References

- Smart India Hackathon 2026 portal, Problem Statement 26202, AICTE MIC-Student Innovation, Theme Travel & Tourism.
- Government of Sikkim, Tourism and Civil Aviation Department, registered hotels register (905 entries) and registered travel agents register (1,858 entries), retrieved 18 Aug 2026.
- Sikkim Registration of Tourist Trade Act, section 2 definition of "tourism entity"; Sikkim Registration of Tourist Trade Rules, 2025 (Tourism Sustainability Development levy, Rs 50 per person).
- Government of Sikkim tourist arrival statistics, 2024 and 2025.
- Sikkim Tourism permit requirements for Nathula, Tsomgo, Singalila, Green Lake and Maenam.
- Wikimedia Commons and Wikipedia for photographs and monastery articles (all media credited and licensed per file).
- Razorpay Route documentation for linked accounts and split settlements.
- Supabase, Drizzle ORM, Next.js 15, MapLibre GL documentation.
- Project source repository: github.com/ashutoshsharma1309/tourismproj (branch v2-saas); measurement docs in docs/pitch-26202.md, docs/gap-matrix.md, docs/phase-22-final-freeze.md, ARCHITECTURE.md.

---

## Optional: 4-minute demo script (speaker notes)
1. Open the department's travel-agent page. 75 pages, no search. "1,858 licensed businesses the state already vetted. Try finding one."
2. Open /industry. Same data, one search box. Filter Mangan, filter current registrations.
3. Capacity table. Mangan: 24.5% of heritage, 2.2% of hotels. Read the flood caveat aloud.
4. Licence panel. 91% and 94%. "No government publication states this, which is why we are careful about what it means."
5. Partner app: onboard a homestay, list a room, open the calendar.
6. Public: search, hold, pay with Razorpay test mode, booking code appears. Show the partner dashboard payout split.
7. Console: verification queue and revenue retention.
8. Close on QA: 2,341 checks, including one that fails the build if any string calls a business unlicensed.
