@AGENTS.md
# CLAUDE.md

Operating instructions for AI coding agents on this repository. Read this before writing any code. If something here conflicts with a request in chat, say so out loud instead of silently picking one.

---

## 1. What this product is

**Darshan** is a two-sided tourism platform for India, built for a Smart India Hackathon problem statement about improving the state of the tourism industry — hostels, travel operators and the rest of the unorganised supply side.

It has two surfaces that share one database:

| Surface | Who uses it | What it does |
|---|---|---|
| **Darshan** (public) | Travellers | Discover destinations and heritage sites, read sourced stories, plan an itinerary, book stays / transport / guides / experiences in one cart |
| **Darshan Partner** (SaaS) | Homestay, hostel, taxi, guide and experience operators | Onboard, get verified, list inventory, manage a calendar, take direct bookings, get paid out, see analytics |
| **Darshan Console** (govt) | State tourism department | Verify operators, see live arrivals/occupancy/revenue-retention analytics, publish advisories |

The money is in the Partner SaaS (subscription + take rate). The public site is demand generation for it. Do not build these as separate products — they are one Next.js app with route groups.

### The one-sentence positioning

> MakeMyTrip and Thrillophilia sell India's *organised* tourism inventory. Roughly 80% of India's stays and nearly all of its local transport and guiding is unorganised, offline and running on WhatsApp. Darshan gives that supply side an operating system, and the demand side a reason to trust it.

### What we are explicitly NOT building

- Not another OTA/aggregator clone. We will lose that fight and it is a boring pitch.
- Not a flight or train booking engine. Out of scope forever.
- Not a static "beautiful tourism microsite". That is what v1 was, and it is why the codebase broke when destinations were added.

---

## 2. Non-negotiable architecture rules

These exist because v1 broke. Every one of them is a direct fix for a specific failure.

**R1 — No hardcoded destination content, ever.**
There is exactly one destination page: `app/(explore)/d/[destination]/page.tsx`. Adding a 16th, 40th or 400th destination must be a database insert and zero code changes. If you find yourself writing `if (slug === 'gangtok')`, stop and move it into the data model.

**R2 — Content and commerce are separate domains that meet in one place.**
Content (`Destination`, `Site`, `Story`, `Media`) is editorial and mostly read-only. Commerce (`Vendor`, `Listing`, `Availability`, `Booking`) is transactional. They join only via `destinationId` and via `TripStop`. Never put a price field on a `Site`. Never put editorial prose on a `Listing`.

**R3 — `Availability` is the booking engine.**
One row per `(listingUnitId, date)`. Every read of "is this bookable" and every write of "hold this" goes through that table inside a transaction. No availability logic in React components, no date maths in the UI layer.

**R4 — Money is `bigint` paise. Always.**
No floats, no rupees, no `number` for currency anywhere in the codebase. Field names end in `Paise`. Format for display only at the render boundary via `formatINR()`.

**R5 — Server Components by default.**
`'use client'` only for genuine interactivity: maps, calendars, forms, the audio player. Data fetching happens in Server Components or server actions. If a client component needs data, pass it as props.

**R6 — All user-facing strings go through the i18n layer.**
Twelve locales are a headline feature of this project. A hardcoded English string in JSX is a bug. Content translations live in the `Translation` table; UI chrome lives in `messages/{locale}.json`.

**R7 — Every write path is idempotent and audited.**
Payment webhooks, booking confirmations and verification decisions all get replayed in the real world. Key them on the gateway ID, upsert, and write an `AuditLog` row.

**R8 — Every editorial claim carries a source.**
The existing archive's credibility comes from `sourceRefs[]` and per-image `credit` / `licence`. Do not add content without them, and do not remove the "gaps are published, not papered over" behaviour. This is the single most distinctive thing about the project.

---

## 3. Stack

Pinned. Do not substitute without asking.

```
Framework      Next.js 15 (App Router), React 19, TypeScript strict
Styling        Tailwind CSS v4 + shadcn/ui (Radix primitives)
Database       PostgreSQL via Supabase
ORM            Drizzle ORM + drizzle-kit
Auth           Supabase Auth — phone OTP primary, Google secondary
File storage   Supabase Storage (vendor docs, listing photos)
Payments       Razorpay Orders + Razorpay Route for vendor split payouts
Maps           MapLibre GL JS + MapTiler tiles (no Google Maps billing)
AI             Vercel AI SDK, structured output via Zod schemas
Email/WhatsApp Resend (email) + a stubbed WhatsApp adapter
Hosting        Vercel, region bom1 (Mumbai)
Validation     Zod at every boundary — forms, server actions, API routes, AI output
```

**Package manager: `pnpm`.** Node 20+.

### Why these, briefly
Supabase because auth, Postgres, storage and row-level security come in one box and there is an MCP connector already wired up. Razorpay Route because split payouts to verified vendors is the entire commercial model and it is the only Indian gateway that does it cleanly. MapLibre because Google Maps needs a billing card and hackathon judges will open the map.

---

## 4. Repository layout

```
/
├── CLAUDE.md                    ← this file
├── docs/
│   ├── ARCHITECTURE.md          ← data model, flows, decisions
│   ├── BUILD_PLAN_24H.md        ← hour-by-hour scope
│   └── PITCH.md                 ← demo script, judge Q&A, business model
├── drizzle/                     ← migrations (generated, committed)
├── messages/                    ← en.json, hi.json, ne.json, bn.json …
├── public/
│   ├── images/                  ← existing archive photography (keep!)
│   └── audio/                   ← existing audio guides (keep!)
├── scripts/
│   ├── seed.ts                  ← idempotent seeder
│   └── migrate-v1-content.ts    ← lifts v1's hardcoded content into the DB
└── src/
    ├── app/
    │   ├── (marketing)/         ← /, /for-partners, /pricing, /about
    │   ├── (explore)/
    │   │   ├── d/[destination]/            ← THE destination page
    │   │   ├── d/[destination]/s/[site]/   ← THE site page
    │   │   ├── stories/[slug]/
    │   │   └── map/
    │   ├── (book)/
    │   │   ├── search/
    │   │   ├── l/[listing]/
    │   │   ├── checkout/[code]/
    │   │   └── booking/[code]/
    │   ├── (plan)/
    │   │   ├── plan/                       ← planner intake
    │   │   └── plan/[tripId]/              ← generated itinerary
    │   ├── (partner)/
    │   │   ├── partner/onboarding/
    │   │   └── partner/(app)/
    │   │       ├── listings/  calendar/  bookings/  payouts/  settings/
    │   ├── (console)/
    │   │   └── console/        ← govt: verification queue + analytics
    │   └── api/
    │       ├── webhooks/razorpay/route.ts
    │       └── cron/release-holds/route.ts
    ├── components/
    │   ├── ui/                  ← shadcn primitives, unmodified
    │   ├── explore/  book/  partner/  console/   ← domain components
    │   └── shared/
    ├── db/
    │   ├── schema/              ← content.ts, commerce.ts, trip.ts, ops.ts
    │   ├── queries/             ← ALL reads live here, typed, cached
    │   └── index.ts
    ├── lib/
    │   ├── booking/             ← hold, confirm, release, price
    │   ├── payments/            ← razorpay client, signature verify
    │   ├── ai/                  ← planner prompt + Zod schema
    │   ├── i18n/
    │   └── money.ts             ← paise helpers, formatINR
    └── types/
```

**Rule:** a component never imports from `src/db` directly. It calls a function from `src/db/queries`. This keeps the query surface auditable and cacheable.

---

## 5. Coding conventions

- **Naming.** `PascalCase` components, `camelCase` functions and variables, `kebab-case` files and folders, `snake_case` database columns (Drizzle maps them).
- **Server actions** live in a `actions.ts` next to the route that uses them, are marked `'use server'`, and start with a Zod parse of their input. They return `{ ok: true, data }` or `{ ok: false, error }` — never throw across the boundary.
- **Errors.** No swallowed catches. Log with context, return a typed error, show the user what to do next.
- **Dates.** Store `date` for calendar days (check-in, availability) and `timestamptz` for events. All display in `Asia/Kolkata`. Never `new Date()` inside a component render.
- **Slugs** are immutable once published. Add a `Redirect` row if one has to change.
- **No barrel `index.ts` re-exports** except in `src/db` and `components/ui`.
- **Comments** explain *why*, never *what*. If the code needs a *what* comment, rename things instead.

### Definition of done for any feature
1. Types compile with `strict` on, zero `any`.
2. Works on a 375px viewport.
3. Keyboard reachable, visible focus ring.
4. Has a loading state and an empty state, and the empty state tells the user what to do.
5. All strings are translation keys.
6. Seed data exists so it demoes without manual setup.

---

## 6. Design direction

The v1 archive already has a real point of view — dark, photographic, heritage-first. Keep it for the public surface. The Partner and Console surfaces need a different, lighter treatment because people work in them for hours. One type system, two skins.

### Palette

Grounded in the actual materials of a Himalayan gompa, not in generic "travel site" colour.

```css
--ink:      #1A1613;  /* near-black, warm; public surface background */
--parchment:#F2EDE4;  /* aged paper; partner surface background       */
--brass:    #B98A2E;  /* butter-lamp brass; primary accent, sparingly */
--maroon:   #6E2436;  /* monastic robe; destructive + serious states  */
--pine:     #2F4A3C;  /* Himalayan forest; success + verified badge   */
--slate:    #6B7078;  /* rock; secondary text, borders                */
```

Prayer-flag colours (blue/white/red/green/yellow) are permitted **only** as categorical data encoding on maps and charts — never as decoration.

### Type

- **Display:** `Newsreader` — a serif with real personality that carries Devanagari poorly, so pair it.
- **UI + body:** `Geist Sans`.
- **Indic scripts:** `Noto Sans Devanagari` / `Noto Sans Bengali`, loaded per locale.
- Scale: 12 / 14 / 16 / 20 / 26 / 34 / 46 / 62. Body text max 68ch.

### Rules that stop this looking AI-generated

- No tracked-out ALL-CAPS eyebrow labels above headings. v1 has these; remove them.
- No `A · B · C` middle-dot meta strings.
- No `→` glyph appended to button text.
- No identical rounded card with the same soft grey shadow repeated down the page. Hierarchy differences must be visible in the shape, not just the size.
- Motion: **one** orchestrated moment on the destination page hero. Everywhere else, motion only answers a user action.
- The hero of a destination page is a credited photograph and the destination's own name in the local script, not a stat counter with a gradient.

### The one bold thing
The **map is the product's spine**, not a widget in a section. Destination, planner and search all render against the same MapLibre instance with the same marker vocabulary. Everything else on the page stays quiet.

---

## 7. Commands

```bash
pnpm dev              # localhost:3000
pnpm build            # must pass before any deploy
pnpm typecheck        # tsc --noEmit — run before declaring anything done
pnpm lint
pnpm db:generate      # drizzle-kit generate after schema edits
pnpm db:push          # dev only
pnpm db:migrate       # prod
pnpm db:seed          # idempotent; safe to re-run
pnpm db:studio
```

---

## 8. Environment

```
DATABASE_URL=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=          # server only, never in a client component
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
NEXT_PUBLIC_MAPTILER_KEY=
OPENROUTER_API_KEY=
RESEND_API_KEY=
CRON_SECRET=
NEXT_PUBLIC_APP_URL=
```

Never log a secret. Never read `SUPABASE_SERVICE_ROLE_KEY` outside `src/db` or `src/lib/payments`.

---

## 9. Migrating v1 without losing the good part

v1's editorial archive is the moat — 15 catalogued monasteries, 70 stories, 191 credited photographs, 46 mapped coordinates, audio guides in 12 languages, 26 timeline events, 77 archive objects. Nobody else at this hackathon will have that. It broke because it was expressed as files instead of data.

**Do this, in order:**
1. Write `scripts/migrate-v1-content.ts` to read v1's content modules and emit seed rows for `Destination`, `Site`, `Story`, `Media`, `AudioGuide`, `Translation`.
2. Keep every image and audio file at its existing path under `public/`. Only the *pointer* moves into the DB.
3. Preserve `credit`, `licence` and `sourceUrl` on every media row. Losing attribution is both a legal problem and the loss of the thing that makes the archive credible.
4. Sikkim becomes `Destination` rows; each monastery becomes a `Site` row under one of them. The 15 monasteries are not 15 destinations.
5. Delete the per-page content files only after the seeded pages render identically.

**Do not** rewrite the archive's prose. It is sourced and good. Move it, don't regenerate it.

---

## 10. Priority ladder

When time runs out, cut from the bottom. Never cut from the top to add something lower.

**P0 — the demo does not exist without these**
1. Data-driven destination + site pages (fixes the v1 break)
2. Vendor onboarding → listing → availability calendar
3. Search → listing detail → hold → checkout
4. Razorpay order + webhook + confirmed booking with a code
5. Partner dashboard showing that booking and its payout split

**P1 — this is what makes it win rather than merely work**
6. AI itinerary planner whose output stops are *bookable*, not prose
7. Govt console: verification queue + revenue-retention analytics
8. Permits module (ILP/PAP) — genuinely unique to this region, no competitor has it
9. Multilingual UI across at least English / Hindi / Nepali / Bengali
10. Offline PWA: cached itinerary + permits + maps for low-connectivity hills

**P2 — only if everything above is solid**
11. Reviews tied to completed bookings
12. WhatsApp booking notifications
13. Vendor analytics beyond a bookings count
14. Responsible-tourism / carbon score on itineraries

---

## 11. Things that will bite, and the answers

**Double booking.** Two users, last room. Answer: `SELECT … FOR UPDATE` on the `Availability` rows inside a transaction, decrement `unitsOpen`, write the `Booking` as `PENDING_PAYMENT` with `holdExpiresAt = now() + 10 min`. A cron at `/api/cron/release-holds` restores inventory for expired holds. Never rely on an application-level check-then-write.

**The webhook arrives before the user returns from Razorpay.** It usually does. The webhook is the source of truth for `CONFIRMED`; the redirect page polls the booking by code. Never confirm a booking from the client.

**Vendor is unverified but taking money.** A `Listing` cannot leave `DRAFT` until its `Vendor.verificationStatus = 'VERIFIED'`. Enforce in the DB with a check constraint, not just in the UI.

**The AI planner hallucinates a homestay.** The planner is not allowed to invent stops. It selects from a candidate set that is queried from the DB and passed into the prompt, and its Zod output schema accepts only IDs from that set. Anything else is rejected and retried once, then falls back to a rules-based itinerary.

**Judges open it on a phone on conference wifi.** Everything must render on 375px and the first load must be under 2s. Optimise the hero image, lazy-load the map.

---

## 12. Working style for the agent

- Read `docs/ARCHITECTURE.md` before touching the schema and `docs/BUILD_PLAN_24H.md` before starting a block of work.
- Ship a vertical slice, not a horizontal layer. A working booking flow for one listing type beats four half-built entities.
- Run `pnpm typecheck` before saying anything is finished.
- Seed data as you go. A feature nobody can demo is not done.
- When a request would violate a rule in section 2, say which rule and why, then propose the alternative. Do not quietly comply.
- Be blunt about tradeoffs. There are 24 hours; false optimism costs more than bad news.